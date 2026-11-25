import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import * as s from "@/db/schema";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { siteConfig } from "@/lib/site";
import { emails, type OrderEmailData } from "./email";
import { initializeTransaction, verifyTransaction, type VerifiedTransaction } from "./paystack";
import { consumeCoupon, quote, REFERRAL_REWARD_KOBO } from "./pricing";
import { pushToAdmin } from "./push";
import { variantDemand, type CartLine } from "./cart";

export const PAYMENT_WINDOW_MIN = 60;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(n: number) {
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Unguessable order number, e.g. MB-7KQ2-9XHD. */
export const newOrderNumber = () => `MB-${randomCode(4)}-${randomCode(4)}`;
export const newPaymentReference = (orderNumber: string) => `${orderNumber}-${randomCode(6)}`;

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url).replace(/\/$/, "");

export class CheckoutError extends Error {}

export type CheckoutInput = {
  lines: CartLine[];
  email: string;
  phone: string;
  name: string;
  method: "delivery" | "pickup";
  zoneId: number | null;
  addressLine: string | null;
  area: string | null;
  notes: string | null;
  code: string | null;
  userId: string | null;
};

async function addEvent(
  tx: Tx | typeof db,
  orderId: number,
  type: string,
  opts: { from?: string | null; to?: string | null; note?: string | null; actor?: string } = {},
) {
  await tx.insert(s.orderEvent).values({
    orderId,
    type,
    fromStatus: opts.from ?? null,
    toStatus: opts.to ?? null,
    note: opts.note ?? null,
    actor: opts.actor ?? "system",
  });
}
export { addEvent as logOrderEvent };

/**
 * Reserve stock for every variant in fixed id order (deadlock-safe).
 * Returns the names of variants that ran out, or [] on success.
 */
async function reserveStock(tx: Tx, demand: Map<number, number>) {
  const ids = [...demand.keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const qty = demand.get(id)!;
    const res = await tx.execute(
      sql`update product_variant set stock = stock - ${qty} where id = ${id} and active and stock >= ${qty} returning id`,
    );
    if (res.rows.length !== 1) {
      const [v] = await tx
        .select({ name: s.productVariant.name, product: s.product.name, stock: s.productVariant.stock })
        .from(s.productVariant)
        .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
        .where(eq(s.productVariant.id, id));
      return v ? `${v.product} (${v.name}): only ${v.stock} left today` : "An item is no longer available";
    }
  }
  return null;
}

/**
 * Create an order from server-side cart lines inside one transaction:
 * quote → coupon → stock reservation → order + items + payment + events.
 */
export async function createOrder(input: CheckoutInput) {
  if (!input.lines.length) throw new CheckoutError("Your bag is empty.");
  const unavailable = input.lines.find((l) => !l.available);
  if (unavailable) throw new CheckoutError(`${unavailable.name} (${unavailable.size}) is no longer available in that quantity.`);
  if (input.method === "delivery" && (!input.zoneId || !input.addressLine || !input.area)) {
    throw new CheckoutError("Choose a delivery zone and enter your address.");
  }

  return db.transaction(async (tx) => {
    const q = await quote(
      { lines: input.lines, method: input.method, zoneId: input.zoneId, code: input.code, email: input.email, userId: input.userId },
      tx,
    );
    if (input.code && q.discountError) throw new CheckoutError(q.discountError);
    if (input.method === "delivery" && !q.zone) throw new CheckoutError("Choose a valid delivery zone.");
    if (q.totalKobo < 100_00) throw new CheckoutError("Order total is too low.");

    const shortage = await reserveStock(tx, variantDemand(input.lines));
    if (shortage) throw new CheckoutError(shortage);

    if (q.coupon && !(await consumeCoupon(tx, q.coupon.id))) {
      throw new CheckoutError("This code has just been fully used.");
    }

    const number = newOrderNumber();
    const [order] = await tx
      .insert(s.order)
      .values({
        number,
        userId: input.userId,
        email: input.email,
        phone: input.phone,
        name: input.name,
        method: input.method,
        addressLine: input.method === "delivery" ? input.addressLine : null,
        area: input.method === "delivery" ? input.area : null,
        zoneId: q.zone?.id ?? null,
        zoneName: q.zone?.name ?? null,
        notes: input.notes,
        status: "pending_payment",
        subtotalKobo: q.subtotalKobo,
        discountKobo: q.discountKobo,
        deliveryKobo: q.deliveryKobo,
        totalKobo: q.totalKobo,
        couponId: q.coupon?.id ?? null,
        couponCode: q.coupon?.code ?? null,
        referralCode: q.referral?.code ?? null,
        paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MIN * 60_000),
      })
      .returning();

    await tx.insert(s.orderItem).values(
      input.lines.map((l) => ({
        orderId: order.id,
        productId: l.kind === "variant" ? l.productId : null,
        variantId: l.kind === "variant" ? l.variantId : null,
        comboId: l.kind === "combo" ? l.comboId : null,
        name: l.name,
        size: l.size,
        imageUrl: l.imageUrl,
        unitKobo: l.unitKobo,
        qty: l.qty,
      })),
    );
    const demand = variantDemand(input.lines);
    await tx.insert(s.orderReservation).values([...demand].map(([variantId, qty]) => ({ orderId: order.id, variantId, qty })));

    if (q.coupon) {
      const ins = await tx
        .insert(s.couponRedemption)
        .values({ couponId: q.coupon.id, email: input.email, orderId: order.id })
        .onConflictDoNothing()
        .returning({ id: s.couponRedemption.id });
      if (!ins.length) throw new CheckoutError("You've already used this code.");
    }

    const reference = newPaymentReference(number);
    await tx.insert(s.payment).values({ orderId: order.id, reference, amountKobo: q.totalKobo, currency: "NGN" });
    await addEvent(tx, order.id, "placed", { to: "pending_payment", actor: input.email });
    return { order, reference };
  });
}

/** Start (or retry) payment for a pending order. Creates a fresh reference each time. */
export async function startPayment(orderId: number) {
  const [order] = await db.select().from(s.order).where(eq(s.order.id, orderId));
  if (!order || order.status !== "pending_payment") throw new CheckoutError("This order can't be paid.");
  if (+order.paymentExpiresAt < Date.now()) throw new CheckoutError("The payment window for this order has closed.");
  let [pending] = await db
    .select()
    .from(s.payment)
    .where(and(eq(s.payment.orderId, orderId), eq(s.payment.status, "pending")))
    .orderBy(sql`${s.payment.createdAt} desc`)
    .limit(1);
  if (!pending || pending.amountKobo !== order.totalKobo) {
    [pending] = await db
      .insert(s.payment)
      .values({ orderId, reference: newPaymentReference(order.number), amountKobo: order.totalKobo })
      .returning();
  }
  const init = await initializeTransaction({
    email: order.email,
    amountKobo: order.totalKobo,
    reference: pending.reference,
    callbackUrl: `${appUrl()}/checkout/complete?reference=${encodeURIComponent(pending.reference)}`,
    metadata: { order_number: order.number },
  });
  return init.authorization_url;
}

/** Return reserved stock + release coupon for an unpaid order (inside tx with the order row locked). */
async function releaseOrder(tx: Tx, orderId: number) {
  const res = await tx.select().from(s.orderReservation).where(eq(s.orderReservation.orderId, orderId)).orderBy(asc(s.orderReservation.variantId));
  for (const r of res) {
    await tx.execute(sql`update product_variant set stock = stock + ${r.qty} where id = ${r.variantId}`);
  }
  await tx.delete(s.orderReservation).where(eq(s.orderReservation.orderId, orderId));
  const [o] = await tx.select({ couponId: s.order.couponId }).from(s.order).where(eq(s.order.id, orderId));
  if (o?.couponId) {
    const del = await tx.delete(s.couponRedemption).where(eq(s.couponRedemption.orderId, orderId)).returning();
    if (del.length) await tx.execute(sql`update coupon set used_count = greatest(used_count - 1, 0) where id = ${o.couponId}`);
  }
}

/** Cancel or expire a still-unpaid order and give its stock back. Idempotent. */
export async function closeUnpaidOrder(orderId: number, to: "cancelled" | "expired", note: string, actor = "system") {
  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ status: string }>(sql`select status from "order" where id = ${orderId} for update`);
    const status = locked.rows[0]?.status;
    if (status !== "pending_payment") return false;
    await releaseOrder(tx, orderId);
    await tx.update(s.order).set({ status: to, statusChangedAt: new Date() }).where(eq(s.order.id, orderId));
    await tx.update(s.payment).set({ status: "abandoned" }).where(and(eq(s.payment.orderId, orderId), eq(s.payment.status, "pending")));
    await addEvent(tx, orderId, to, { from: "pending_payment", to, note, actor });
    return true;
  });
}

/** Expire every unpaid order past its payment window (checkout + daily cron). */
export async function expireStaleOrders() {
  const stale = await db
    .select({ id: s.order.id })
    .from(s.order)
    .where(and(eq(s.order.status, "pending_payment"), lt(s.order.paymentExpiresAt, new Date())))
    .limit(200);
  let n = 0;
  for (const o of stale) if (await closeUnpaidOrder(o.id, "expired", "Payment window closed")) n++;
  return n;
}

export async function orderEmailData(orderId: number): Promise<OrderEmailData | null> {
  const [o] = await db.select().from(s.order).where(eq(s.order.id, orderId));
  if (!o) return null;
  const items = await db.select().from(s.orderItem).where(eq(s.orderItem.orderId, orderId));
  return {
    number: o.number,
    name: o.name,
    email: o.email,
    method: o.method,
    totalKobo: o.totalKobo,
    subtotalKobo: o.subtotalKobo,
    discountKobo: o.discountKobo,
    deliveryKobo: o.deliveryKobo,
    addressLine: o.addressLine,
    area: o.area,
    tracking: o.tracking,
    items: items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, unitKobo: i.unitKobo })),
  };
}

export type SettleResult =
  | { outcome: "paid" | "already_paid"; orderNumber: string }
  | { outcome: "pending" | "failed"; orderNumber: string }
  | { outcome: "flagged"; orderNumber: string; reason: string }
  | { outcome: "unknown" };

/**
 * Verify server-to-server by OUR reference and settle under row locks. Idempotent.
 * `verified` can be injected (tests); otherwise Paystack is called.
 */
export async function settlePayment(reference: string, verified?: VerifiedTransaction | null): Promise<SettleResult> {
  const [pay] = await db.select().from(s.payment).where(eq(s.payment.reference, reference));
  if (!pay) return { outcome: "unknown" };
  const tx0 = verified === undefined ? await verifyTransaction(reference) : verified;

  const after: (() => Promise<unknown>)[] = [];
  const result = await db.transaction(async (tx): Promise<SettleResult> => {
    // Lock order first, then payment (same order everywhere).
    const ordRows = await tx.execute<{ id: number }>(sql`select id from "order" where id = ${pay.orderId} for update`);
    if (!ordRows.rows.length) return { outcome: "unknown" };
    await tx.execute(sql`select id from payment where id = ${pay.id} for update`);
    const [order] = await tx.select().from(s.order).where(eq(s.order.id, pay.orderId));
    const [p] = await tx.select().from(s.payment).where(eq(s.payment.id, pay.id));

    if (p.status === "success") return { outcome: "already_paid", orderNumber: order.number };

    if (!tx0) return { outcome: "pending", orderNumber: order.number };
    if (tx0.status !== "success") {
      if (["failed", "abandoned", "reversed"].includes(tx0.status)) {
        await tx.update(s.payment).set({ status: "failed", raw: tx0, verifiedAt: new Date() }).where(eq(s.payment.id, p.id));
        await addEvent(tx, order.id, "payment_failed", { note: `Paystack status: ${tx0.status}` });
        return { outcome: "failed", orderNumber: order.number };
      }
      return { outcome: "pending", orderNumber: order.number };
    }

    // Money received from here on. Record it first.
    const flag = async (reason: string) => {
      await tx
        .update(s.payment)
        .set({ status: "success", paidAmountKobo: tx0.amount, channel: tx0.channel ?? null, flagged: reason, raw: tx0, verifiedAt: new Date() })
        .where(eq(s.payment.id, p.id));
      await addEvent(tx, order.id, "payment_problem", { note: reason });
      const admin = process.env.ADMIN_EMAIL;
      if (admin) after.push(() => emails.paymentProblem(admin, order.number, reason, `${appUrl()}/admin/orders/${order.id}`));
      return { outcome: "flagged" as const, orderNumber: order.number, reason };
    };

    if (tx0.reference !== reference) return flag("Reference mismatch from Paystack.");
    if (tx0.currency !== "NGN") return flag(`Paid in ${tx0.currency}, expected NGN. Refund needed.`);
    if (tx0.amount !== p.amountKobo || p.amountKobo !== order.totalKobo) {
      return flag(`Amount mismatch: paid ₦${(tx0.amount / 100).toLocaleString()}, expected ₦${(order.totalKobo / 100).toLocaleString()}.`);
    }
    if (order.status !== "pending_payment" && order.status !== "expired" && order.status !== "cancelled") {
      return flag("Duplicate payment: this order was already paid. Refund the extra payment.");
    }

    if (order.status === "expired" || order.status === "cancelled") {
      // Late payment: try to take the stock again.
      const items = await tx.select().from(s.orderItem).where(eq(s.orderItem.orderId, order.id));
      const demand = new Map<number, number>();
      for (const it of items) {
        if (it.variantId) demand.set(it.variantId, (demand.get(it.variantId) ?? 0) + it.qty);
        if (it.comboId) {
          const parts = await tx.select().from(s.comboItem).where(eq(s.comboItem.comboId, it.comboId));
          for (const pt of parts) demand.set(pt.variantId, (demand.get(pt.variantId) ?? 0) + pt.qty * it.qty);
        }
      }
      const shortage = demand.size ? await reserveStock(tx, demand) : "Order items no longer exist";
      if (shortage) return flag(`Paid after the order ${order.status}; stock is gone (${shortage}). Refund needed.`);
      await tx.insert(s.orderReservation).values([...demand].map(([variantId, qty]) => ({ orderId: order.id, variantId, qty })));
      await addEvent(tx, order.id, "late_payment_accepted", { note: `Paid after order ${order.status}; stock re-reserved.` });
    }

    const from = order.status as OrderStatus;
    await tx
      .update(s.payment)
      .set({ status: "success", paidAmountKobo: tx0.amount, channel: tx0.channel ?? null, raw: tx0, verifiedAt: new Date() })
      .where(eq(s.payment.id, p.id));
    await tx
      .update(s.order)
      .set({ status: "confirmed", paidAt: new Date(), statusChangedAt: new Date() })
      .where(eq(s.order.id, order.id));
    await addEvent(tx, order.id, "paid", {
      from,
      to: "confirmed",
      note: `₦${(tx0.amount / 100).toLocaleString()} via ${tx0.channel ?? "Paystack"} (${reference})`,
    });

    // Referral: reward the referrer once per friend (first paid order only).
    if (order.referralCode) {
      const [ref] = await tx.select().from(s.referralCode).where(eq(s.referralCode.code, order.referralCode));
      if (ref) {
        const [referrer] = await tx.select({ email: s.user.email }).from(s.user).where(eq(s.user.id, ref.userId));
        if (referrer && referrer.email.toLowerCase() !== order.email) {
          const code = `THANKS-${randomCode(6)}`;
          const inserted = await tx
            .insert(s.referralReward)
            .values({ referrerUserId: ref.userId, refereeEmail: order.email, orderId: order.id })
            .onConflictDoNothing()
            .returning();
          if (inserted.length) {
            const [c] = await tx
              .insert(s.coupon)
              .values({
                code,
                kind: "fixed",
                value: REFERRAL_REWARD_KOBO,
                source: "referral",
                ownerEmail: referrer.email.toLowerCase(),
                maxUses: 1,
                minSubtotalKobo: 5000_00,
              })
              .returning();
            await tx.update(s.referralReward).set({ rewardCouponId: c.id }).where(eq(s.referralReward.id, inserted[0].id));
            after.push(() => emails.referralReward(referrer.email, code));
          }
        }
      }
    }

    after.push(async () => {
      const data = await orderEmailData(order.id);
      if (!data) return;
      await emails.orderConfirmed(data);
      const admin = process.env.ADMIN_EMAIL;
      if (admin) await emails.adminNewOrder(admin, data, `${appUrl()}/admin/orders/${order.id}`);
      await pushToAdmin({
        title: `New order ${order.number}`,
        body: `₦${(order.totalKobo / 100).toLocaleString()} · ${order.name} · ${order.method}`,
        url: `/admin/orders/${order.id}`,
        tag: `order-${order.id}`,
      });
    });

    return { outcome: "paid", orderNumber: order.number };
  });

  // Side effects only after commit; never let them fail the settlement.
  for (const fn of after) await fn().catch((e) => console.warn("[settle] side effect failed", e));
  return result;
}

/** Admin status change through the state machine (shared by single + bulk actions). */
export async function changeOrderStatus(orderId: number, to: OrderStatus, opts: { tracking?: string | null; note?: string | null; actor: string }) {
  const { canTransition } = await import("@/lib/order-status");
  const res = await db.transaction(async (tx) => {
    const locked = await tx.execute<{ status: OrderStatus; method: string; tracking: string | null }>(
      sql`select status, method, tracking from "order" where id = ${orderId} for update`,
    );
    const row = locked.rows[0];
    if (!row) return { ok: false as const, error: "Order not found." };
    if (row.status === to) return { ok: true as const, changed: false };
    if (!canTransition(row.status, to)) {
      return { ok: false as const, error: `Can't move from ${STATUS_LABEL[row.status]} to ${STATUS_LABEL[to]}.` };
    }
    const tracking = opts.tracking?.trim() || row.tracking;
    if (to === "out_for_delivery" && row.method === "delivery" && !tracking) {
      return { ok: false as const, error: "Add the rider name/phone before sending out for delivery." };
    }
    if (row.status === "pending_payment") {
      await releaseOrder(tx, orderId);
      await tx.update(s.payment).set({ status: "abandoned" }).where(and(eq(s.payment.orderId, orderId), eq(s.payment.status, "pending")));
    } else if (to === "cancelled" || to === "refunded") {
      // Paid order cancelled/refunded before delivery: put the stock back.
      if (row.status !== "delivered") {
        const res = await tx.select().from(s.orderReservation).where(eq(s.orderReservation.orderId, orderId)).orderBy(asc(s.orderReservation.variantId));
        for (const r of res) await tx.execute(sql`update product_variant set stock = stock + ${r.qty} where id = ${r.variantId}`);
        await tx.delete(s.orderReservation).where(eq(s.orderReservation.orderId, orderId));
      }
    }
    await tx
      .update(s.order)
      .set({ status: to, tracking: tracking ?? null, statusChangedAt: new Date() })
      .where(eq(s.order.id, orderId));
    await addEvent(tx, orderId, "status", { from: row.status, to, note: opts.note ?? (tracking && to === "out_for_delivery" ? `Rider: ${tracking}` : null), actor: opts.actor });
    return { ok: true as const, changed: true, method: row.method };
  });
  if (res.ok && res.changed && ["preparing", "out_for_delivery", "delivered", "cancelled", "refunded"].includes(to)) {
    const data = await orderEmailData(orderId);
    const { statusLabel } = await import("@/lib/order-status");
    if (data) await emails.statusUpdate(data, to, statusLabel(to, data.method)).catch(() => undefined);
  }
  return res;
}

/** Variants that just came back into stock → notify waiting subscribers (called after stock edits). */
export async function notifyBackInStock(variantIds: number[]) {
  if (!variantIds.length) return 0;
  const rows = await db
    .select({
      id: s.stockAlert.id,
      email: s.stockAlert.email,
      slug: s.product.slug,
      name: s.product.name,
      stock: s.productVariant.stock,
    })
    .from(s.stockAlert)
    .innerJoin(s.productVariant, eq(s.productVariant.id, s.stockAlert.variantId))
    .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
    .where(and(inArray(s.stockAlert.variantId, variantIds), sql`${s.stockAlert.notifiedAt} is null`, sql`${s.productVariant.stock} > 0`));
  for (const r of rows) {
    await emails.backInStock(r.email, r.name, `${appUrl()}/menu/${r.slug}`);
    await db.update(s.stockAlert).set({ notifiedAt: new Date() }).where(eq(s.stockAlert.id, r.id));
  }
  return rows.length;
}
