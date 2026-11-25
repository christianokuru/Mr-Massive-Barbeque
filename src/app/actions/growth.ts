"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { emailSchema } from "@/lib/validation";
import { emails } from "@/server/email";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";

export type SimpleResult = { ok: true; message: string } | { ok: false; error: string };

const WELCOME_CODE = "WELCOME10";

export async function subscribeNewsletter(emailRaw: string, source = "newsletter"): Promise<SimpleResult> {
  try {
    await enforceRateLimit("newsletter", 5, 600);
    const email = emailSchema.safeParse(emailRaw);
    if (!email.success) return { ok: false, error: "Enter a valid email address." };
    const src = z.enum(["newsletter", "quiz", "footer", "popup"]).catch("newsletter").parse(source);
    const inserted = await db.insert(s.subscriber).values({ email: email.data, source: src }).onConflictDoNothing().returning();
    if (inserted.length) await emails.welcome(email.data, WELCOME_CODE);
    return {
      ok: true,
      message: inserted.length ? `You're in. Check your inbox for ${WELCOME_CODE}.` : `You're already subscribed. Your code is ${WELCOME_CODE}.`,
    };
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message };
    return { ok: false, error: "Couldn't subscribe right now. Please try again." };
  }
}

/** "Back on the grill" email when a sold-out size returns. */
export async function requestStockAlert(variantIdRaw: number, emailRaw: string): Promise<SimpleResult> {
  try {
    await enforceRateLimit("stock-alert", 10, 600);
    const email = emailSchema.safeParse(emailRaw);
    const variantId = z.coerce.number().int().positive().safeParse(variantIdRaw);
    if (!email.success || !variantId.success) return { ok: false, error: "Enter a valid email address." };
    const [v] = await db.select({ id: s.productVariant.id }).from(s.productVariant).where(eq(s.productVariant.id, variantId.data));
    if (!v) return { ok: false, error: "Item not found." };
    await db
      .insert(s.stockAlert)
      .values({ email: email.data, variantId: v.id })
      .onConflictDoUpdate({ target: [s.stockAlert.email, s.stockAlert.variantId], set: { notifiedAt: null } });
    return { ok: true, message: "We'll email you the moment it's back on the grill." };
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message };
    return { ok: false, error: "Couldn't save that. Please try again." };
  }
}

/** Track an order as a guest: order number + email (rate limited, no enumeration). */
export async function lookupOrder(numberRaw: string, emailRaw: string): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  try {
    await enforceRateLimit("order-lookup", 10, 600);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const email = emailSchema.safeParse(emailRaw);
  const number = String(numberRaw ?? "").trim().toUpperCase();
  if (!email.success || !/^MB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(number)) {
    return { ok: false, error: "We couldn't find an order with those details." };
  }
  const [o] = await db
    .select({ number: s.order.number })
    .from(s.order)
    .where(and(eq(s.order.number, number), eq(s.order.email, email.data)));
  if (!o) return { ok: false, error: "We couldn't find an order with those details." };
  return { ok: true, number: o.number };
}
