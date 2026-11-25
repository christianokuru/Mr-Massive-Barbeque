"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { formatNaira } from "@/lib/money";
import { emailSchema, nameSchema, phoneSchema } from "@/lib/validation";
import { getCartLines, readCartId } from "@/server/cart";
import { CheckoutError, closeUnpaidOrder, createOrder, expireStaleOrders, startPayment } from "@/server/orders";
import { PaystackConfigError } from "@/server/paystack";
import { quote } from "@/server/pricing";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { getSession } from "@/server/session";

const quoteSchema = z.object({
  method: z.enum(["delivery", "pickup"]),
  zoneId: z.coerce.number().int().positive().nullable().optional(),
  code: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(254).optional().nullable(),
});

export type QuoteView = {
  subtotal: string;
  discount: string | null;
  discountLabel: string | null;
  discountError: string | null;
  delivery: string;
  total: string;
  totalKobo: number;
  freeDeliveryNote: string | null;
};

/** Live totals for the checkout summary (server-computed). */
export async function quoteCheckout(input: z.input<typeof quoteSchema>): Promise<QuoteView | { error: string }> {
  try {
    await enforceRateLimit("quote", 60, 60);
    const data = quoteSchema.parse(input);
    const session = await getSession();
    const lines = await getCartLines(await readCartId());
    const email = data.email ? emailSchema.safeParse(data.email) : null;
    const q = await quote({
      lines,
      method: data.method,
      zoneId: data.zoneId ?? null,
      code: data.code || null,
      email: email?.success ? email.data : (session?.user.email ?? null),
      userId: session?.user.id ?? null,
    });
    const freeLeft = q.freeDeliveryFromKobo ? q.freeDeliveryFromKobo - (q.subtotalKobo - q.discountKobo) : null;
    return {
      subtotal: formatNaira(q.subtotalKobo),
      discount: q.discountKobo ? `-${formatNaira(q.discountKobo)}` : null,
      discountLabel: q.discountLabel,
      discountError: q.discountError,
      delivery: data.method === "pickup" ? "Free" : q.zone ? (q.deliveryKobo ? formatNaira(q.deliveryKobo) : "Free") : "Choose zone",
      total: formatNaira(q.totalKobo),
      totalKobo: q.totalKobo,
      freeDeliveryNote:
        data.method === "delivery" && freeLeft && freeLeft > 0 ? `Add ${formatNaira(freeLeft)} more for free delivery` : null,
    };
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    return { error: "Couldn't update totals." };
  }
}

/** Saves contact as soon as it's entered (enables abandoned-bag reminders). */
export async function saveCheckoutContact(emailRaw: string) {
  const email = emailSchema.safeParse(emailRaw);
  const cartId = await readCartId();
  if (!email.success || !cartId) return;
  await enforceRateLimit("contact", 30, 60).catch(() => undefined);
  await db.update(s.cart).set({ email: email.data, lastActiveAt: new Date() }).where(eq(s.cart.id, cartId));
}

const placeSchema = z
  .object({
    email: emailSchema,
    phone: phoneSchema,
    name: nameSchema,
    method: z.enum(["delivery", "pickup"]),
    zoneId: z.coerce.number().int().positive().nullable().optional(),
    addressLine: z.string().trim().max(200).optional().nullable(),
    area: z.string().trim().max(80).optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
    code: z.string().trim().max(40).optional().nullable(),
    saveAddress: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === "delivery") {
      if (!v.zoneId) ctx.addIssue({ code: "custom", path: ["zoneId"], message: "Choose your delivery zone." });
      if (!v.addressLine || v.addressLine.length < 5)
        ctx.addIssue({ code: "custom", path: ["addressLine"], message: "Enter your street address." });
      if (!v.area || v.area.length < 2) ctx.addIssue({ code: "custom", path: ["area"], message: "Enter your area." });
    }
  });

export type PlaceOrderResult =
  | { ok: true; redirectUrl: string; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function placeOrder(input: z.input<typeof placeSchema>): Promise<PlaceOrderResult> {
  try {
    await enforceRateLimit("checkout", 8, 300);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const session = await getSession();
  const cartId = await readCartId();

  // Opportunistically free stock held by abandoned checkouts.
  await expireStaleOrders().catch(() => undefined);

  const lines = await getCartLines(cartId);
  let created: Awaited<ReturnType<typeof createOrder>>;
  try {
    created = await createOrder({
      lines,
      email: d.email,
      phone: d.phone,
      name: d.name,
      method: d.method,
      zoneId: d.method === "delivery" ? (d.zoneId ?? null) : null,
      addressLine: d.addressLine ?? null,
      area: d.area ?? null,
      notes: d.notes || null,
      code: d.code || null,
      userId: session?.user.emailVerified ? session.user.id : null,
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    console.error("[checkout] create failed", err);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }

  // Save address + phone for signed-in customers.
  if (session?.user.emailVerified && d.method === "delivery" && d.saveAddress && d.zoneId) {
    const existing = await db
      .select({ id: s.address.id })
      .from(s.address)
      .where(and(eq(s.address.userId, session.user.id), eq(s.address.line1, d.addressLine!)));
    if (!existing.length) {
      await db.insert(s.address).values({
        userId: session.user.id,
        label: "Home",
        line1: d.addressLine!,
        area: d.area!,
        zoneId: d.zoneId,
        phone: d.phone,
      });
    }
  }

  try {
    const redirectUrl = await startPayment(created.order.id);
    // The bag is kept until payment succeeds (cleared on /checkout/complete).
    // Remember which order this checkout belongs to for the complete page.
    (await cookies()).set("mb_last_order", created.order.number, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
      secure: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
    });
    return { ok: true, redirectUrl, orderNumber: created.order.number };
  } catch (err) {
    // Payment couldn't start: cancel the order and return the stock. Bag stays intact.
    await closeUnpaidOrder(created.order.id, "cancelled", "Payment could not be started").catch(() => undefined);
    console.warn("[checkout] payment start failed", err);
    return {
      ok: false,
      error:
        err instanceof PaystackConfigError
          ? "Online payment isn't available right now. Please order on WhatsApp or try again later."
          : "We couldn't reach the payment provider. Your bag is saved, please try again.",
    };
  }
}

/** Retry payment for an unpaid order (from the account or the complete page). */
export async function retryPayment(orderNumber: string, emailRaw: string): Promise<PlaceOrderResult> {
  try {
    await enforceRateLimit("retry-pay", 10, 300);
    const email = emailSchema.parse(emailRaw);
    const [o] = await db
      .select()
      .from(s.order)
      .where(and(eq(s.order.number, String(orderNumber).toUpperCase()), eq(s.order.email, email)));
    if (!o) return { ok: false, error: "Order not found." };
    const redirectUrl = await startPayment(o.id);
    return { ok: true, redirectUrl, orderNumber: o.number };
  } catch (err) {
    if (err instanceof CheckoutError || err instanceof RateLimitError) return { ok: false, error: err.message };
    return { ok: false, error: "We couldn't start the payment. Please try again." };
  }
}
