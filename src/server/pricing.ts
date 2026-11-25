import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import * as s from "@/db/schema";
import { PAID_STATUSES } from "@/lib/order-status";
import type { CartLine } from "./cart";

/** Referee discount and referrer reward (kobo). */
export const REFERRAL_FRIEND_OFF_KOBO = 2000_00;
export const REFERRAL_REWARD_KOBO = 2000_00;
export const REFERRAL_MIN_SUBTOTAL_KOBO = 5000_00;

type Conn = typeof db | Tx;

export type Quote = {
  subtotalKobo: number;
  discountKobo: number;
  deliveryKobo: number;
  totalKobo: number;
  freeDeliveryFromKobo: number | null;
  coupon: { id: number; code: string } | null;
  referral: { code: string; referrerUserId: string } | null;
  discountLabel: string | null;
  discountError: string | null;
  zone: { id: number; name: string; etaText: string } | null;
};

export type QuoteInput = {
  lines: CartLine[];
  method: "delivery" | "pickup";
  zoneId?: number | null;
  code?: string | null;
  email?: string | null;
  userId?: string | null;
};

async function hasPaidOrder(conn: Conn, email: string) {
  const [row] = await conn
    .select({ id: s.order.id })
    .from(s.order)
    .where(and(eq(s.order.email, email), inArray(s.order.status, [...PAID_STATUSES])))
    .limit(1);
  return !!row;
}

/**
 * Server-side totals. The code field accepts a coupon code OR a friend's referral code.
 * Only one discount applies per order.
 */
export async function quote(input: QuoteInput, conn: Conn = db): Promise<Quote> {
  const subtotal = input.lines.reduce((sum, l) => sum + l.unitKobo * l.qty, 0);
  const email = input.email?.trim().toLowerCase() || null;

  let discount = 0;
  let coupon: Quote["coupon"] = null;
  let referral: Quote["referral"] = null;
  let discountLabel: string | null = null;
  let discountError: string | null = null;

  const code = input.code?.trim().toUpperCase() || null;
  if (code) {
    const [c] = await conn.select().from(s.coupon).where(eq(s.coupon.code, code));
    if (c) {
      const now = Date.now();
      if (!c.active) discountError = "This code is no longer active.";
      else if (c.startsAt && +c.startsAt > now) discountError = "This code isn't active yet.";
      else if (c.endsAt && +c.endsAt < now) discountError = "This code has expired.";
      else if (c.maxUses !== null && c.usedCount >= c.maxUses) discountError = "This code has been fully used.";
      else if (subtotal < c.minSubtotalKobo)
        discountError = `Spend at least ₦${Math.round(c.minSubtotalKobo / 100).toLocaleString("en-NG")} to use this code.`;
      else if (c.ownerEmail && (!email || c.ownerEmail !== email))
        discountError = "This code belongs to another account. Enter the email it was issued to.";
      else if (email) {
        const [used] = await conn
          .select({ id: s.couponRedemption.id })
          .from(s.couponRedemption)
          .where(and(eq(s.couponRedemption.couponId, c.id), eq(s.couponRedemption.email, email)));
        if (used) discountError = "You've already used this code.";
        else if (c.source === "welcome" && (await hasPaidOrder(conn, email)))
          discountError = "Welcome codes are for your first order only.";
      }
      if (!discountError) {
        discount = c.kind === "percent" ? Math.floor((subtotal * c.value) / 100) : c.value;
        coupon = { id: c.id, code: c.code };
        discountLabel = c.kind === "percent" ? `${c.code} (${c.value}% off)` : `${c.code}`;
      }
    } else {
      const [r] = await conn
        .select({ code: s.referralCode.code, userId: s.referralCode.userId, email: s.user.email })
        .from(s.referralCode)
        .innerJoin(s.user, eq(s.user.id, s.referralCode.userId))
        .where(eq(s.referralCode.code, code));
      if (!r) discountError = "That code isn't valid.";
      else if ((input.userId && input.userId === r.userId) || (email && email === r.email.toLowerCase()))
        discountError = "You can't use your own referral code.";
      else if (subtotal < REFERRAL_MIN_SUBTOTAL_KOBO) discountError = "Spend at least ₦5,000 to use a referral code.";
      else if (email && (await hasPaidOrder(conn, email)))
        discountError = "Referral codes are for your first order only.";
      else {
        discount = REFERRAL_FRIEND_OFF_KOBO;
        referral = { code: r.code, referrerUserId: r.userId };
        discountLabel = `Friend referral (${r.code})`;
      }
    }
  }
  discount = Math.min(discount, subtotal);

  // Delivery
  let delivery = 0;
  let zone: Quote["zone"] = null;
  let freeFrom: number | null = null;
  const zones = await conn.select().from(s.shippingZone).where(eq(s.shippingZone.active, true));
  const thresholds = zones.map((z) => z.freeOverKobo).filter((x): x is number => !!x);
  freeFrom = thresholds.length ? Math.min(...thresholds) : null;
  if (input.method === "delivery" && input.zoneId) {
    const z = zones.find((x) => x.id === input.zoneId);
    if (z) {
      zone = { id: z.id, name: z.name, etaText: z.etaText };
      freeFrom = z.freeOverKobo;
      delivery = z.freeOverKobo && subtotal - discount >= z.freeOverKobo ? 0 : z.feeKobo;
    }
  }

  return {
    subtotalKobo: subtotal,
    discountKobo: discount,
    deliveryKobo: delivery,
    totalKobo: Math.max(0, subtotal - discount + delivery),
    freeDeliveryFromKobo: freeFrom,
    coupon,
    referral,
    discountLabel,
    discountError,
    zone,
  };
}

/** Atomically consume one coupon use (respects max_uses). */
export async function consumeCoupon(tx: Tx, couponId: number) {
  const res = await tx.execute(
    sql`update coupon set used_count = used_count + 1 where id = ${couponId} and active and (max_uses is null or used_count < max_uses) returning id`,
  );
  return res.rows.length === 1;
}
