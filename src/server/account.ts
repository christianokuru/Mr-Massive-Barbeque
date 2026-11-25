import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PAID_STATUSES } from "@/lib/order-status";

/**
 * Every query is scoped to the signed-in user in SQL: their own orders, plus
 * guest orders placed with their (verified) email. Never anyone else's.
 */
export function myOrdersWhere(userId: string, email: string) {
  return or(eq(s.order.userId, userId), eq(s.order.email, email.toLowerCase()));
}

export async function listMyOrders(userId: string, email: string, limit = 50) {
  return db
    .select()
    .from(s.order)
    .where(myOrdersWhere(userId, email))
    .orderBy(desc(s.order.createdAt))
    .limit(limit);
}

export async function getMyOrderByNumber(userId: string, email: string, number: string) {
  const [o] = await db
    .select({ id: s.order.id })
    .from(s.order)
    .where(and(eq(s.order.number, number.toUpperCase()), myOrdersWhere(userId, email)));
  return o?.id ?? null;
}

/** Active order for the dashboard tracker (paid, not yet delivered). */
export async function activeOrder(userId: string, email: string) {
  const [o] = await db
    .select({ id: s.order.id })
    .from(s.order)
    .where(and(myOrdersWhere(userId, email), inArray(s.order.status, ["confirmed", "preparing", "out_for_delivery"])))
    .orderBy(desc(s.order.createdAt))
    .limit(1);
  return o?.id ?? null;
}

/**
 * "Running low?": products from paid orders whose paid date + product.reorderDays has passed,
 * not re-ordered since. One row per product, most overdue first.
 */
export async function runningLow(userId: string, email: string) {
  const rows = await db.execute<{
    product_id: number;
    slug: string;
    name: string;
    image: string | null;
    variant_id: number | null;
    variant_name: string | null;
    price_kobo: number | null;
    stock: number | null;
    last_paid: Date;
    reorder_days: number;
  }>(sql`
    with mine as (
      select o.id, o.paid_at from "order" o
      where (o.user_id = ${userId} or o.email = ${email.toLowerCase()})
        and o.status in ('confirmed','preparing','out_for_delivery','delivered') and o.paid_at is not null
    ),
    bought as (
      select oi.product_id, max(m.paid_at) as last_paid, (array_agg(oi.variant_id order by m.paid_at desc))[1] as variant_id
      from order_item oi join mine m on m.id = oi.order_id
      where oi.product_id is not null
      group by oi.product_id
    )
    select p.id as product_id, p.slug, p.name, p.reorder_days,
      (select url from product_image pi where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image,
      v.id as variant_id, v.name as variant_name, v.price_kobo, v.stock, b.last_paid
    from bought b
    join product p on p.id = b.product_id and p.status = 'active'
    left join product_variant v on v.id = b.variant_id and v.active
    where b.last_paid + make_interval(days => p.reorder_days) <= now()
    order by b.last_paid + make_interval(days => p.reorder_days) asc
    limit 6
  `);
  return rows.rows;
}

/** Delivered items the customer hasn't reviewed yet. */
export async function reviewPrompts(userId: string, email: string) {
  const rows = await db.execute<{ product_id: number; slug: string; name: string; image: string | null }>(sql`
    select distinct on (p.id) p.id as product_id, p.slug, p.name,
      (select url from product_image pi where pi.product_id = p.id order by pi.sort, pi.id limit 1) as image
    from "order" o
    join order_item oi on oi.order_id = o.id
    join product p on p.id = oi.product_id and p.status = 'active'
    where (o.user_id = ${userId} or o.email = ${email.toLowerCase()})
      and o.status = 'delivered'
      and not exists (select 1 from review r where r.product_id = p.id and r.user_id = ${userId})
    order by p.id
    limit 4
  `);
  return rows.rows;
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** One referral code per user, e.g. ADA-7KQ2. */
export async function getOrCreateReferralCode(userId: string, name: string) {
  const [existing] = await db.select().from(s.referralCode).where(eq(s.referralCode.userId, userId));
  if (existing) return existing.code;
  const base = (name.replace(/[^A-Za-z]/g, "").slice(0, 5) || "MB").toUpperCase();
  for (let i = 0; i < 5; i++) {
    let suffix = "";
    for (let j = 0; j < 4; j++) suffix += ALPHA[randomInt(ALPHA.length)];
    const code = `${base}-${suffix}`;
    const ins = await db.insert(s.referralCode).values({ userId, code }).onConflictDoNothing().returning();
    if (ins.length) return ins[0].code;
    const [again] = await db.select().from(s.referralCode).where(eq(s.referralCode.userId, userId));
    if (again) return again.code;
  }
  throw new Error("Could not create referral code");
}

export type WalletCode = { code: string; label: string; detail: string; status: "Ready" | "Used" | "Expired" };

/** Rewards wallet: welcome code + personal/referral reward codes. */
export async function rewardsWallet(userId: string, email: string): Promise<WalletCode[]> {
  const e = email.toLowerCase();
  const coupons = await db
    .select()
    .from(s.coupon)
    .where(or(eq(s.coupon.ownerEmail, e), eq(s.coupon.source, "welcome")))
    .orderBy(desc(s.coupon.createdAt));
  if (!coupons.length) return [];
  const used = await db
    .select({ couponId: s.couponRedemption.couponId })
    .from(s.couponRedemption)
    .where(and(eq(s.couponRedemption.email, e), inArray(s.couponRedemption.couponId, coupons.map((c) => c.id))));
  const usedSet = new Set(used.map((u) => u.couponId));
  const [paid] = await db
    .select({ id: s.order.id })
    .from(s.order)
    .where(and(myOrdersWhere(userId, email), inArray(s.order.status, [...PAID_STATUSES])))
    .limit(1);
  const now = Date.now();
  return coupons
    .filter((c) => c.active || usedSet.has(c.id))
    .map((c) => {
      const expired = (!!c.endsAt && +c.endsAt < now) || (c.maxUses !== null && c.usedCount >= c.maxUses && !usedSet.has(c.id));
      const isWelcome = c.source === "welcome";
      const status: WalletCode["status"] = usedSet.has(c.id) ? "Used" : expired || (isWelcome && !!paid) ? (isWelcome && paid ? "Used" : "Expired") : "Ready";
      return {
        code: c.code,
        label: isWelcome ? "Welcome offer" : c.source === "referral" ? "Referral reward" : "Personal code",
        detail: c.kind === "percent" ? `${c.value}% off` : `₦${(c.value / 100).toLocaleString("en-NG")} off`,
        status,
      };
    });
}

export async function referralStats(userId: string) {
  return db
    .select({
      refereeEmail: s.referralReward.refereeEmail,
      createdAt: s.referralReward.createdAt,
      code: s.coupon.code,
      value: s.coupon.value,
    })
    .from(s.referralReward)
    .leftJoin(s.coupon, eq(s.coupon.id, s.referralReward.rewardCouponId))
    .where(eq(s.referralReward.referrerUserId, userId))
    .orderBy(desc(s.referralReward.createdAt));
}

export async function myFavourites(userId: string) {
  const favs = await db.select({ productId: s.favourite.productId }).from(s.favourite).where(eq(s.favourite.userId, userId));
  return favs.map((f) => f.productId);
}

export async function latestQuiz(userId: string, email: string) {
  const [q] = await db
    .select()
    .from(s.quizResult)
    .where(or(eq(s.quizResult.userId, userId), eq(s.quizResult.email, email.toLowerCase())))
    .orderBy(desc(s.quizResult.createdAt))
    .limit(1);
  return q ?? null;
}

/** Items to re-add for "Buy again" (variants + combos still sold). */
export async function buyAgainItems(orderId: number) {
  const items = await db.select().from(s.orderItem).where(eq(s.orderItem.orderId, orderId));
  return items
    .filter((i) => i.variantId || i.comboId)
    .map((i) => (i.variantId ? { variantId: i.variantId, qty: i.qty } : { comboId: i.comboId!, qty: i.qty }));
}

