"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { qtySchema } from "@/lib/validation";
import { ensureCart, getCartLines, readCartId, cartCount } from "@/server/cart";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { getSession } from "@/server/session";

export type ActionResult = { ok: true; message?: string; count?: number } | { ok: false; error: string };

const addSchema = z.union([
  z.object({ variantId: z.coerce.number().int().positive(), qty: qtySchema }),
  z.object({ comboId: z.coerce.number().int().positive(), qty: qtySchema }),
]);

function fail(err: unknown): ActionResult {
  if (err instanceof RateLimitError) return { ok: false, error: err.message };
  console.warn("[cart]", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Add one or more items. Quantities are capped by stock and the 20-per-line limit. */
export async function addToBag(items: { variantId?: number; comboId?: number; qty: number }[]): Promise<ActionResult> {
  try {
    await enforceRateLimit("cart", 60, 60);
    const parsed = z.array(addSchema).min(1).max(10).safeParse(items);
    if (!parsed.success) return { ok: false, error: "Choose a size first." };

    const session = await getSession();
    const cartId = await ensureCart(session?.user.id, session?.user.email);

    for (const it of parsed.data) {
      if ("variantId" in it) {
        const [v] = await db
          .select({ stock: s.productVariant.stock, active: s.productVariant.active, status: s.product.status })
          .from(s.productVariant)
          .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
          .where(eq(s.productVariant.id, it.variantId));
        if (!v || !v.active || v.status !== "active") return { ok: false, error: "That item isn't available." };
        if (v.stock < 1) return { ok: false, error: "Sold out for today." };
        const [existing] = await db
          .select()
          .from(s.cartItem)
          .where(and(eq(s.cartItem.cartId, cartId), eq(s.cartItem.variantId, it.variantId)));
        const qty = Math.min((existing?.qty ?? 0) + it.qty, v.stock, 20);
        if (existing) await db.update(s.cartItem).set({ qty }).where(eq(s.cartItem.id, existing.id));
        else
          await db
            .insert(s.cartItem)
            .values({ cartId, variantId: it.variantId, qty })
            .onConflictDoUpdate({ target: [s.cartItem.cartId, s.cartItem.variantId], set: { qty } });
      } else {
        const [c] = await db.select().from(s.combo).where(eq(s.combo.id, it.comboId));
        if (!c?.active) return { ok: false, error: "That combo isn't available." };
        const [existing] = await db
          .select()
          .from(s.cartItem)
          .where(and(eq(s.cartItem.cartId, cartId), eq(s.cartItem.comboId, it.comboId)));
        const qty = Math.min((existing?.qty ?? 0) + it.qty, 20);
        if (existing) await db.update(s.cartItem).set({ qty }).where(eq(s.cartItem.id, existing.id));
        else
          await db
            .insert(s.cartItem)
            .values({ cartId, comboId: it.comboId, qty })
            .onConflictDoUpdate({ target: [s.cartItem.cartId, s.cartItem.comboId], set: { qty } });
      }
    }
    await db.update(s.cart).set({ lastActiveAt: new Date(), remindersSent: 0 }).where(eq(s.cart.id, cartId));
    const lines = await getCartLines(cartId);
    refresh();
    return { ok: true, message: "Added to your bag", count: cartCount(lines) };
  } catch (err) {
    return fail(err);
  }
}

export async function setBagQty(itemId: number, qty: number): Promise<ActionResult> {
  try {
    await enforceRateLimit("cart", 60, 60);
    const id = z.coerce.number().int().positive().parse(itemId);
    const q = z.coerce.number().int().min(0).max(20).parse(qty);
    const cartId = await readCartId();
    if (!cartId) return { ok: false, error: "Your bag is empty." };
    if (q === 0) {
      await db.delete(s.cartItem).where(and(eq(s.cartItem.id, id), eq(s.cartItem.cartId, cartId)));
    } else {
      const lines = await getCartLines(cartId);
      const line = lines.find((l) => l.itemId === id);
      if (!line) return { ok: false, error: "Item not found." };
      const capped = Math.min(q, Math.max(line.stock, 1));
      await db.update(s.cartItem).set({ qty: capped }).where(and(eq(s.cartItem.id, id), eq(s.cartItem.cartId, cartId)));
      if (capped < q) {
        refresh();
        return { ok: true, message: `Only ${line.stock} left today.` };
      }
    }
    await db.update(s.cart).set({ lastActiveAt: new Date() }).where(eq(s.cart.id, cartId));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
