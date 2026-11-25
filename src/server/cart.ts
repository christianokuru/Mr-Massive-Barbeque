import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";

export const CART_COOKIE = "mb_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30;

export type CartLine =
  | {
      kind: "variant";
      itemId: number;
      variantId: number;
      productId: number;
      productSlug: string;
      name: string;
      size: string;
      imageUrl: string | null;
      unitKobo: number;
      qty: number;
      stock: number;
      available: boolean;
    }
  | {
      kind: "combo";
      itemId: number;
      comboId: number;
      comboSlug: string;
      name: string;
      size: string;
      imageUrl: string | null;
      unitKobo: number;
      valueKobo: number;
      qty: number;
      stock: number;
      available: boolean;
      parts: { variantId: number; qty: number }[];
    };

export async function readCartId() {
  // Request-time only: uncached DB reads follow (DB access uses crypto, not allowed while prerendering).
  await connection();
  const id = (await cookies()).get(CART_COOKIE)?.value;
  return id && /^[A-Za-z0-9_-]{20,64}$/.test(id) ? id : null;
}

/** Creates the cart row + cookie if needed. Only call from Server Actions / route handlers. */
export async function ensureCart(userId?: string | null, email?: string | null) {
  const store = await cookies();
  let id = await readCartId();
  if (id) {
    const [row] = await db.select({ id: s.cart.id, convertedAt: s.cart.convertedAt }).from(s.cart).where(eq(s.cart.id, id));
    if (!row || row.convertedAt) id = null;
  }
  if (!id) {
    id = randomBytes(24).toString("base64url");
    await db.insert(s.cart).values({ id, userId: userId ?? null, email: email ?? null });
  } else if (userId || email) {
    await db
      .update(s.cart)
      .set({
        ...(userId ? { userId } : {}),
        ...(email ? { email } : {}),
        lastActiveAt: new Date(),
      })
      .where(eq(s.cart.id, id));
  }
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: CART_MAX_AGE,
  });
  return id;
}

/** Live cart lines (prices and stock read fresh; client values are never trusted). */
export async function getCartLines(cartId: string | null): Promise<CartLine[]> {
  if (!cartId) return [];
  const items = await db.select().from(s.cartItem).where(eq(s.cartItem.cartId, cartId)).orderBy(s.cartItem.id);
  if (!items.length) return [];

  const variantIds = items.map((i) => i.variantId).filter((x): x is number => !!x);
  const comboIds = items.map((i) => i.comboId).filter((x): x is number => !!x);

  const variants = variantIds.length
    ? await db
        .select({
          id: s.productVariant.id,
          name: s.productVariant.name,
          priceKobo: s.productVariant.priceKobo,
          stock: s.productVariant.stock,
          active: s.productVariant.active,
          productId: s.product.id,
          productSlug: s.product.slug,
          productName: s.product.name,
          status: s.product.status,
          imageUrl: sql<string | null>`(select url from product_image pi where pi.product_id = "product"."id" order by pi.sort, pi.id limit 1)`,
        })
        .from(s.productVariant)
        .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
        .where(inArray(s.productVariant.id, variantIds))
    : [];

  const combos = comboIds.length ? await db.select().from(s.combo).where(inArray(s.combo.id, comboIds)) : [];
  const comboParts = comboIds.length
    ? await db
        .select({
          comboId: s.comboItem.comboId,
          variantId: s.comboItem.variantId,
          qty: s.comboItem.qty,
          priceKobo: s.productVariant.priceKobo,
          stock: s.productVariant.stock,
          active: s.productVariant.active,
          status: s.product.status,
        })
        .from(s.comboItem)
        .innerJoin(s.productVariant, eq(s.productVariant.id, s.comboItem.variantId))
        .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
        .where(inArray(s.comboItem.comboId, comboIds))
    : [];

  const lines: CartLine[] = [];
  for (const it of items) {
    if (it.variantId) {
      const v = variants.find((x) => x.id === it.variantId);
      if (!v) continue;
      lines.push({
        kind: "variant",
        itemId: it.id,
        variantId: v.id,
        productId: v.productId,
        productSlug: v.productSlug,
        name: v.productName,
        size: v.name,
        imageUrl: v.imageUrl,
        unitKobo: v.priceKobo,
        qty: it.qty,
        stock: v.stock,
        available: v.active && v.status === "active" && v.stock >= it.qty,
      });
    } else if (it.comboId) {
      const c = combos.find((x) => x.id === it.comboId);
      if (!c) continue;
      const parts = comboParts.filter((p) => p.comboId === c.id);
      const stock = parts.length ? Math.min(...parts.map((p) => Math.floor(p.stock / p.qty))) : 0;
      lines.push({
        kind: "combo",
        itemId: it.id,
        comboId: c.id,
        comboSlug: c.slug,
        name: c.name,
        size: "Combo",
        imageUrl: c.imageUrl,
        unitKobo: c.priceKobo,
        valueKobo: parts.reduce((sum, p) => sum + p.priceKobo * p.qty, 0),
        qty: it.qty,
        stock,
        available:
          c.active && parts.length > 0 && parts.every((p) => p.active && p.status === "active") && stock >= it.qty,
        parts: parts.map((p) => ({ variantId: p.variantId, qty: p.qty })),
      });
    }
  }
  return lines;
}

export async function getCurrentCartLines() {
  return getCartLines(await readCartId());
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.qty, 0);
}

/** Expand cart lines into per-variant quantities (combos → their variants). */
export function variantDemand(lines: CartLine[]) {
  const map = new Map<number, number>();
  for (const l of lines) {
    if (l.kind === "variant") map.set(l.variantId, (map.get(l.variantId) ?? 0) + l.qty);
    else for (const p of l.parts) map.set(p.variantId, (map.get(p.variantId) ?? 0) + p.qty * l.qty);
  }
  return map;
}

export async function clearCart(cartId: string) {
  await db.delete(s.cartItem).where(eq(s.cartItem.cartId, cartId));
  await db.update(s.cart).set({ convertedAt: new Date() }).where(and(eq(s.cart.id, cartId)));
}
