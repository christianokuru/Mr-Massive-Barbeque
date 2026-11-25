import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CheckoutError, closeUnpaidOrder, createOrder, expireStaleOrders, settlePayment } from "@/server/orders";
import { quote, REFERRAL_FRIEND_OFF_KOBO } from "@/server/pricing";
import type { VerifiedTransaction } from "@/server/paystack";
import { cartLinesFor, checkoutInput, cleanup, makeProduct, makeUser, stockOf, testEmail } from "./helpers";

const ok = (reference: string, amount: number, currency = "NGN"): VerifiedTransaction => ({ status: "success", reference, amount, currency, channel: "card" });

async function paymentOf(orderId: number) {
  const [p] = await db.select().from(s.payment).where(eq(s.payment.orderId, orderId));
  return p;
}
async function orderOf(id: number) {
  const [o] = await db.select().from(s.order).where(eq(s.order.id, id));
  return o;
}

beforeAll(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterAll(async () => {
  await cleanup();
  await db.$client.end();
});

describe("stock reservation", () => {
  it("never oversells under concurrent checkouts", async () => {
    const { variant } = await makeProduct({ stock: 3 });
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, async () => {
        const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
        return createOrder(checkoutInput(lines, testEmail("race")));
      }),
    );
    const won = attempts.filter((a) => a.status === "fulfilled").length;
    expect(won).toBe(3);
    expect(attempts.filter((a) => a.status === "rejected").every((a) => (a as PromiseRejectedResult).reason instanceof CheckoutError)).toBe(true);
    expect(await stockOf(variant.id)).toBe(0);
  });

  it("returns stock when an unpaid order expires", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 2 }]);
    const { order } = await createOrder(checkoutInput(lines, testEmail("expire")));
    expect(await stockOf(variant.id)).toBe(3);
    await db.update(s.order).set({ paymentExpiresAt: new Date(Date.now() - 1000) }).where(eq(s.order.id, order.id));
    await expireStaleOrders();
    expect((await orderOf(order.id)).status).toBe("expired");
    expect(await stockOf(variant.id)).toBe(5);
  });
});

describe("payment settlement", () => {
  it("is idempotent and logs the payment on the order timeline", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("idem")));
    const first = await settlePayment(reference, ok(reference, order.totalKobo));
    const second = await settlePayment(reference, ok(reference, order.totalKobo));
    expect(first.outcome).toBe("paid");
    expect(second.outcome).toBe("already_paid");
    expect((await orderOf(order.id)).status).toBe("confirmed");
    const events = await db.select().from(s.orderEvent).where(and(eq(s.orderEvent.orderId, order.id), eq(s.orderEvent.type, "paid")));
    expect(events).toHaveLength(1);
    expect(events[0].note).toContain(reference);
  });

  it("flags an amount mismatch and keeps the order unpaid", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("amount")));
    const res = await settlePayment(reference, ok(reference, order.totalKobo - 100));
    expect(res.outcome).toBe("flagged");
    expect((await orderOf(order.id)).status).toBe("pending_payment");
    expect((await paymentOf(order.id)).flagged).toMatch(/Amount mismatch/);
  });

  it("flags a currency mismatch", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("ccy")));
    const res = await settlePayment(reference, ok(reference, order.totalKobo, "USD"));
    expect(res.outcome).toBe("flagged");
    expect((await orderOf(order.id)).status).toBe("pending_payment");
  });

  it("records a failed payment without confirming the order", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("fail")));
    const res = await settlePayment(reference, { status: "failed", reference, amount: order.totalKobo, currency: "NGN" });
    expect(res.outcome).toBe("failed");
    expect((await paymentOf(order.id)).status).toBe("failed");
    expect((await orderOf(order.id)).status).toBe("pending_payment");
  });

  it("accepts a late payment when stock is still available", async () => {
    const { variant } = await makeProduct({ stock: 4 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 2 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("late-ok")));
    await closeUnpaidOrder(order.id, "expired", "test");
    expect(await stockOf(variant.id)).toBe(4);
    const res = await settlePayment(reference, ok(reference, order.totalKobo));
    expect(res.outcome).toBe("paid");
    expect((await orderOf(order.id)).status).toBe("confirmed");
    expect(await stockOf(variant.id)).toBe(2);
  });

  it("flags a late payment for refund when stock is gone", async () => {
    const { variant } = await makeProduct({ stock: 1 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("late-gone")));
    await closeUnpaidOrder(order.id, "expired", "test");
    await db.update(s.productVariant).set({ stock: 0 }).where(eq(s.productVariant.id, variant.id));
    const res = await settlePayment(reference, ok(reference, order.totalKobo));
    expect(res.outcome).toBe("flagged");
    expect((await orderOf(order.id)).status).toBe("expired");
    expect((await paymentOf(order.id)).flagged).toMatch(/Refund needed/);
  });

  it("flags a duplicate payment on an already-paid order", async () => {
    const { variant } = await makeProduct({ stock: 5 });
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, testEmail("dup")));
    await settlePayment(reference, ok(reference, order.totalKobo));
    const [second] = await db.insert(s.payment).values({ orderId: order.id, reference: `${reference}-B`, amountKobo: order.totalKobo }).returning();
    const res = await settlePayment(second.reference, ok(second.reference, order.totalKobo));
    expect(res.outcome).toBe("flagged");
    expect(res.outcome === "flagged" && res.reason).toMatch(/Duplicate/);
  });
});

describe("coupons and referrals", () => {
  it("allows a coupon once per email and respects max uses", async () => {
    const { variant } = await makeProduct({ stock: 20, priceNaira: 10000 });
    await db.insert(s.coupon).values({ code: "VTONCE", kind: "percent", value: 10, maxUses: 2 });
    const email = testEmail("coupon");
    const a = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order } = await createOrder(checkoutInput(a.lines, email, { code: "VTONCE" }));
    expect(order.discountKobo).toBe(1000_00);
    const b = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    await expect(createOrder(checkoutInput(b.lines, email, { code: "VTONCE" }))).rejects.toThrow(/already used/);
    const c = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    await createOrder(checkoutInput(c.lines, testEmail("coupon2"), { code: "VTONCE" }));
    const d = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    await expect(createOrder(checkoutInput(d.lines, testEmail("coupon3"), { code: "VTONCE" }))).rejects.toThrow(/fully used/);
  });

  it("releases a coupon when the unpaid order expires", async () => {
    const { variant } = await makeProduct({ stock: 5, priceNaira: 10000 });
    await db.insert(s.coupon).values({ code: "VTRELEASE", kind: "fixed", value: 500_00, maxUses: 1 });
    const email = testEmail("release");
    const a = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order } = await createOrder(checkoutInput(a.lines, email, { code: "VTRELEASE" }));
    await closeUnpaidOrder(order.id, "expired", "test");
    const b = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const again = await createOrder(checkoutInput(b.lines, email, { code: "VTRELEASE" }));
    expect(again.order.discountKobo).toBe(500_00);
  });

  it("blocks self-referral, rewards the referrer once, and only on a first order", async () => {
    const { variant } = await makeProduct({ stock: 20, priceNaira: 10000 });
    const referrer = await makeUser(testEmail("referrer"));
    await db.insert(s.referralCode).values({ userId: referrer.id, code: "VTREF-1234" });

    const self = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const q = await quote({ lines: self.lines, method: "pickup", code: "VTREF-1234", email: referrer.email, userId: referrer.id });
    expect(q.discountError).toMatch(/own referral/);

    const friend = testEmail("friend");
    const f1 = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(f1.lines, friend, { code: "VTREF-1234" }));
    expect(order.discountKobo).toBe(REFERRAL_FRIEND_OFF_KOBO);
    await settlePayment(reference, ok(reference, order.totalKobo));
    const rewards = await db.select().from(s.referralReward).where(eq(s.referralReward.referrerUserId, referrer.id));
    expect(rewards).toHaveLength(1);
    const [reward] = await db.select().from(s.coupon).where(eq(s.coupon.id, rewards[0].rewardCouponId!));
    expect(reward.ownerEmail).toBe(referrer.email);

    const f2 = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const q2 = await quote({ lines: f2.lines, method: "pickup", code: "VTREF-1234", email: friend });
    expect(q2.discountError).toMatch(/first order/);
  });

  it("lets only the referrer spend their reward code, once", async () => {
    const { variant } = await makeProduct({ stock: 20, priceNaira: 10000 });
    const referrer = await makeUser(testEmail("referrer2"));
    await db.insert(s.referralCode).values({ userId: referrer.id, code: "VTREF-5678" });
    const f = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(f.lines, testEmail("friend2"), { code: "VTREF-5678" }));
    await settlePayment(reference, ok(reference, order.totalKobo));
    const [rr] = await db.select().from(s.referralReward).where(eq(s.referralReward.referrerUserId, referrer.id));
    const [reward] = await db.select().from(s.coupon).where(eq(s.coupon.id, rr.rewardCouponId!));
    expect(reward.code).toMatch(/^THANKS-/);

    // Someone else can't use it.
    const other = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const q = await quote({ lines: other.lines, method: "pickup", code: reward.code, email: testEmail("stranger") });
    expect(q.discountError).toMatch(/another account/);

    // The referrer can, for ₦2,000 off, and only once.
    const mine = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const used = await createOrder(checkoutInput(mine.lines, referrer.email, { code: reward.code, userId: referrer.id }));
    expect(used.order.discountKobo).toBe(2000_00);
    const again = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    await expect(createOrder(checkoutInput(again.lines, referrer.email, { code: reward.code, userId: referrer.id }))).rejects.toThrow(/already used|fully used/);
  });

  it("welcome code works on a first order only; bad, inactive and expired codes are refused", async () => {
    const { variant } = await makeProduct({ stock: 20, priceNaira: 10000 });
    await db.insert(s.coupon).values([
      { code: "VTWELCOME", kind: "percent", value: 10, source: "welcome" },
      { code: "VTOFF", kind: "fixed", value: 500_00, active: false },
      { code: "VTOLD", kind: "fixed", value: 500_00, endsAt: new Date(Date.now() - 86400_000) },
    ]);
    const lines = (await cartLinesFor([{ variantId: variant.id, qty: 1 }])).lines;
    const newbie = testEmail("newbie");
    expect((await quote({ lines, method: "pickup", code: "vtwelcome", email: newbie })).discountKobo).toBe(1000_00);
    expect((await quote({ lines, method: "pickup", code: "VTOFF", email: newbie })).discountError).toMatch(/no longer active/);
    expect((await quote({ lines, method: "pickup", code: "VTOLD", email: newbie })).discountError).toMatch(/expired/);
    expect((await quote({ lines, method: "pickup", code: "NOPE-0000", email: newbie })).discountError).toMatch(/isn't valid/);

    // After a paid order, the welcome code is refused.
    const { order, reference } = await createOrder(checkoutInput(lines, newbie));
    await settlePayment(reference, ok(reference, order.totalKobo));
    expect((await quote({ lines, method: "pickup", code: "VTWELCOME", email: newbie })).discountError).toMatch(/first order/);
  });

  it("computes delivery and free-delivery server-side", async () => {
    const { variant } = await makeProduct({ stock: 50, priceNaira: 10000 });
    const [zone] = await db.select().from(s.shippingZone).where(sql`${s.shippingZone.freeOverKobo} is not null`).limit(1);
    const small = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const q1 = await quote({ lines: small.lines, method: "delivery", zoneId: zone.id });
    expect(q1.deliveryKobo).toBe(zone.feeKobo);
    const big = await cartLinesFor([{ variantId: variant.id, qty: Math.ceil(zone.freeOverKobo! / 1000000) + 1 }]);
    const q2 = await quote({ lines: big.lines, method: "delivery", zoneId: zone.id });
    expect(q2.deliveryKobo).toBe(0);
    expect(q2.totalKobo).toBe(q2.subtotalKobo);
  });
});
