"use server";

import { and, eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { enforceRateLimit, RateLimitError } from "@/server/rate-limit";
import { verifiedBuyerOrderId } from "@/server/reviews";
import { getSession } from "@/server/session";

export type EngageResult = { ok: true; message?: string; favourite?: boolean } | { ok: false; error: string; signIn?: boolean };

export async function toggleFavourite(productIdRaw: number): Promise<EngageResult> {
  const session = await getSession();
  if (!session?.user.emailVerified) return { ok: false, error: "Sign in to save favourites.", signIn: true };
  try {
    await enforceRateLimit("fav", 60, 60);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const productId = z.coerce.number().int().positive().parse(productIdRaw);
  const where = and(eq(s.favourite.userId, session.user.id), eq(s.favourite.productId, productId));
  const [existing] = await db.select().from(s.favourite).where(where);
  if (existing) {
    await db.delete(s.favourite).where(where);
    refresh();
    return { ok: true, favourite: false, message: "Removed from favourites" };
  }
  const [p] = await db.select({ id: s.product.id }).from(s.product).where(eq(s.product.id, productId));
  if (!p) return { ok: false, error: "Product not found." };
  await db.insert(s.favourite).values({ userId: session.user.id, productId }).onConflictDoNothing();
  refresh();
  return { ok: true, favourite: true, message: "Saved to favourites" };
}

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  spiceLevel: z.enum(["mild", "hot", "extra_hot"]),
  title: z.string().trim().max(80).default(""),
  body: z.string().trim().min(10, "Tell us a bit more (10+ characters).").max(1500),
});

/** Verified-buyer reviews only; held for moderation. */
export async function submitReview(input: z.input<typeof reviewSchema>): Promise<EngageResult> {
  const session = await getSession();
  if (!session?.user.emailVerified) return { ok: false, error: "Sign in to write a review.", signIn: true };
  try {
    await enforceRateLimit("review", 5, 3600);
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message };
  }
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your review." };
  const d = parsed.data;
  const orderId = await verifiedBuyerOrderId(session.user.id, session.user.email, d.productId);
  if (!orderId) return { ok: false, error: "Only customers who received this item can review it." };
  const inserted = await db
    .insert(s.review)
    .values({
      productId: d.productId,
      userId: session.user.id,
      orderId,
      authorName: session.user.name.split(" ")[0] + (session.user.name.split(" ")[1] ? ` ${session.user.name.split(" ")[1][0]}.` : ""),
      rating: d.rating,
      spiceLevel: d.spiceLevel,
      title: d.title,
      body: d.body,
    })
    .onConflictDoNothing()
    .returning({ id: s.review.id });
  if (!inserted.length) return { ok: false, error: "You've already reviewed this item." };
  updateTag("reviews");
  return { ok: true, message: "Thanks! Your review will appear once it's approved." };
}
