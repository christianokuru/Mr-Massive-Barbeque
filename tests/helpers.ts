import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { getCartLines } from "@/server/cart";
import type { CheckoutInput } from "@/server/orders";

export const TEST_PREFIX = "vitest";
export const testEmail = (tag: string) => `${TEST_PREFIX}-${tag}-${randomBytes(4).toString("hex")}@example.com`;

/** A throwaway active product with one variant. */
export async function makeProduct(opts: { stock: number; priceNaira?: number; reorderDays?: number }) {
  const slug = `${TEST_PREFIX}-${randomBytes(4).toString("hex")}`;
  const [p] = await db
    .insert(s.product)
    .values({ slug, name: `Test ${slug}`, status: "active", reorderDays: opts.reorderDays ?? 7 })
    .returning();
  const [v] = await db
    .insert(s.productVariant)
    .values({ productId: p.id, name: "Regular", sku: slug.toUpperCase(), priceKobo: (opts.priceNaira ?? 5000) * 100, stock: opts.stock })
    .returning();
  return { product: p, variant: v };
}

export async function stockOf(variantId: number) {
  const [v] = await db.select({ stock: s.productVariant.stock }).from(s.productVariant).where(eq(s.productVariant.id, variantId));
  return v.stock;
}

const createdCarts: string[] = [];

/** Builds real CartLines through the same code path checkout uses. */
export async function cartLinesFor(items: { variantId: number; qty: number }[]) {
  const cartId = randomBytes(24).toString("base64url");
  createdCarts.push(cartId);
  await db.insert(s.cart).values({ id: cartId });
  await db.insert(s.cartItem).values(items.map((i) => ({ cartId, variantId: i.variantId, qty: i.qty })));
  return { cartId, lines: await getCartLines(cartId) };
}

export function checkoutInput(lines: CheckoutInput["lines"], email: string, extra: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    lines,
    email,
    phone: "+2348031234567",
    name: "Vitest Buyer",
    method: "pickup",
    zoneId: null,
    addressLine: null,
    area: null,
    notes: null,
    code: null,
    userId: null,
    ...extra,
  };
}

export async function makeUser(email: string, name = "Vitest User") {
  const [u] = await db.insert(s.user).values({ id: randomUUID(), name, email, emailVerified: true }).returning();
  return u;
}

/** Removes everything the tests created. */
export async function cleanup() {
  const emails = (await db.select({ email: s.order.email }).from(s.order).where(like(s.order.email, `${TEST_PREFIX}-%`))).map((r) => r.email);
  if (emails.length) {
    await db.delete(s.couponRedemption).where(inArray(s.couponRedemption.email, emails));
    await db.delete(s.referralReward).where(inArray(s.referralReward.refereeEmail, emails));
    await db.delete(s.order).where(inArray(s.order.email, emails));
  }
  await db.delete(s.coupon).where(like(s.coupon.code, "VT%"));
  await db.delete(s.coupon).where(like(s.coupon.ownerEmail, `${TEST_PREFIX}-%`));
  await db.delete(s.review).where(like(s.review.authorName, "Vitest%"));
  await db.delete(s.product).where(like(s.product.slug, `${TEST_PREFIX}-%`));
  await db.delete(s.user).where(like(s.user.email, `${TEST_PREFIX}-%`));
  // Only the carts these tests created; never real customers' bags.
  if (createdCarts.length) await db.delete(s.cart).where(inArray(s.cart.id, createdCarts.splice(0)));
}
