"use server";

import { and, eq, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { verifyPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { nameSchema, phoneSchema } from "@/lib/validation";
import { buyAgainItems, getMyOrderByNumber } from "@/server/account";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { getSession, isAdminEmail } from "@/server/session";
import { addToBag } from "./cart";

export type AccountResult = { ok: true; message?: string } | { ok: false; error: string };

async function me() {
  const session = await getSession();
  if (!session?.user.emailVerified) return null;
  return session;
}

function rl(err: unknown): AccountResult {
  if (err instanceof RateLimitError) return { ok: false, error: err.message };
  console.warn("[account]", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Re-add a past order's items (each capped to today's stock). */
export async function buyAgain(orderNumber: string): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  const id = await getMyOrderByNumber(session.user.id, session.user.email, String(orderNumber).slice(0, 20));
  if (!id) return { ok: false, error: "Order not found." };
  const items = await buyAgainItems(id);
  if (!items.length) return { ok: false, error: "These items are no longer on the menu." };
  let added = 0;
  for (const it of items) {
    const res = await addToBag([it]);
    if (res.ok) added++;
  }
  refresh();
  return added ? { ok: true, message: added === items.length ? "Added to your bag" : "Some items are sold out today; the rest are in your bag" } : { ok: false, error: "Those items are sold out today." };
}

export async function quickReorder(variantId: number): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  const res = await addToBag([{ variantId: z.coerce.number().int().positive().parse(variantId), qty: 1 }]);
  return res.ok ? { ok: true, message: "Added to your bag" } : { ok: false, error: res.error };
}

const profileSchema = z.object({ name: nameSchema, phone: z.union([z.literal(""), phoneSchema]) });

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  try {
    await enforceRateLimit("profile", 20, 600);
    const d = profileSchema.parse(input);
    await auth.api.updateUser({ headers: await headers(), body: { name: d.name } });
    await db
      .insert(s.profile)
      .values({ userId: session.user.id, phone: d.phone || null })
      .onConflictDoUpdate({ target: s.profile.userId, set: { phone: d.phone || null } });
    refresh();
    return { ok: true, message: "Profile saved" };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Check your details." };
    return rl(err);
  }
}

export async function setMarketingOptIn(optIn: boolean): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  const value = z.boolean().parse(optIn);
  await db
    .insert(s.profile)
    .values({ userId: session.user.id, marketingOptIn: value })
    .onConflictDoUpdate({ target: s.profile.userId, set: { marketingOptIn: value } });
  const email = session.user.email.toLowerCase();
  if (value) await db.insert(s.subscriber).values({ email, source: "account" }).onConflictDoNothing();
  else await db.delete(s.subscriber).where(eq(s.subscriber.email, email));
  refresh();
  return { ok: true, message: value ? "You're subscribed to offers" : "You won't get marketing emails" };
}

const addressSchema = z.object({
  label: z.string().trim().min(1).max(30),
  line1: z.string().trim().min(5, "Enter your street address.").max(200),
  area: z.string().trim().min(2, "Enter your area.").max(80),
  zoneId: z.coerce.number().int().positive(),
  phone: phoneSchema,
});

export async function addAddress(input: z.input<typeof addressSchema>): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the address." };
  const [zone] = await db.select({ id: s.shippingZone.id }).from(s.shippingZone).where(eq(s.shippingZone.id, parsed.data.zoneId));
  if (!zone) return { ok: false, error: "Choose a delivery zone." };
  const count = await db.$count(s.address, eq(s.address.userId, session.user.id));
  if (count >= 10) return { ok: false, error: "You can save up to 10 addresses." };
  await db.insert(s.address).values({ ...parsed.data, userId: session.user.id, isDefault: count === 0 });
  refresh();
  return { ok: true, message: "Address saved" };
}

export async function deleteAddress(id: number): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  await db.delete(s.address).where(and(eq(s.address.id, z.coerce.number().int().parse(id)), eq(s.address.userId, session.user.id)));
  refresh();
  return { ok: true, message: "Address removed" };
}

export async function setDefaultAddress(id: number): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  const addrId = z.coerce.number().int().parse(id);
  await db.transaction(async (tx) => {
    await tx.update(s.address).set({ isDefault: false }).where(eq(s.address.userId, session.user.id));
    await tx.update(s.address).set({ isDefault: true }).where(and(eq(s.address.id, addrId), eq(s.address.userId, session.user.id)));
  });
  refresh();
  return { ok: true, message: "Default address updated" };
}

/**
 * NDPA/GDPR account deletion. Password required; the admin can't be deleted.
 * Orders are kept for accounting (user_id is set null by the FK); marketing,
 * alerts, quiz answers, reviews and saved data are removed.
 */
export async function deleteMyAccount(password: string): Promise<AccountResult> {
  const session = await me();
  if (!session) return { ok: false, error: "Please sign in again." };
  try {
    await enforceRateLimit("delete-account", 5, 3600);
  } catch (err) {
    return rl(err);
  }
  if (isAdminEmail(session.user.email)) return { ok: false, error: "The store admin account can't be deleted here." };
  const [cred] = await db
    .select({ hash: s.account.password })
    .from(s.account)
    .where(and(eq(s.account.userId, session.user.id), eq(s.account.providerId, "credential")));
  if (!cred?.hash || !(await verifyPassword({ hash: cred.hash, password: String(password ?? "") }))) {
    return { ok: false, error: "That password isn't right." };
  }
  const email = session.user.email.toLowerCase();
  await db.transaction(async (tx) => {
    await tx.delete(s.subscriber).where(eq(s.subscriber.email, email));
    await tx.delete(s.stockAlert).where(eq(s.stockAlert.email, email));
    await tx.delete(s.quizResult).where(or(eq(s.quizResult.userId, session.user.id), eq(s.quizResult.email, email)));
    await tx.delete(s.review).where(eq(s.review.userId, session.user.id));
    await tx.update(s.cart).set({ email: null }).where(eq(s.cart.email, email));
    // Cascades: sessions, accounts, profile, addresses, favourites, referral code, push subscriptions.
    // Orders keep their rows for accounting with user_id set null.
    await tx.delete(s.user).where(eq(s.user.id, session.user.id));
  });
  return { ok: true, message: "Your account has been deleted." };
}
