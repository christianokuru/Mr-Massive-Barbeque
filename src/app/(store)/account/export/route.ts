import { eq, inArray, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/server/rate-limit";

/** "Download my data": everything we hold for the signed-in customer, session-scoped. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.emailVerified) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(`export:${session.user.id}`, 10, 3600))) return new Response("Too many requests", { status: 429 });

  const { id, email } = session.user;
  const e = email.toLowerCase();
  const [profile, addresses, favourites, orders, reviews, quiz, subscriber, alerts, referral] = await Promise.all([
    db.select().from(s.profile).where(eq(s.profile.userId, id)),
    db.select().from(s.address).where(eq(s.address.userId, id)),
    db.select().from(s.favourite).where(eq(s.favourite.userId, id)),
    db.select().from(s.order).where(or(eq(s.order.userId, id), eq(s.order.email, e))),
    db.select().from(s.review).where(eq(s.review.userId, id)),
    db.select().from(s.quizResult).where(or(eq(s.quizResult.userId, id), eq(s.quizResult.email, e))),
    db.select().from(s.subscriber).where(eq(s.subscriber.email, e)),
    db.select().from(s.stockAlert).where(eq(s.stockAlert.email, e)),
    db.select().from(s.referralCode).where(eq(s.referralCode.userId, id)),
  ]);
  const items = orders.length
    ? await db.select().from(s.orderItem).where(inArray(s.orderItem.orderId, orders.map((o) => o.id)))
    : [];

  const body = {
    exportedAt: new Date().toISOString(),
    account: { id, name: session.user.name, email, emailVerified: session.user.emailVerified, createdAt: session.user.createdAt },
    profile: profile[0] ?? null,
    addresses,
    favourites,
    orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })),
    reviews,
    quizResults: quiz,
    newsletter: subscriber[0] ?? null,
    stockAlerts: alerts,
    referralCode: referral[0]?.code ?? null,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="massive-barbeque-my-data.json"`,
      "Cache-Control": "no-store",
    },
  });
}
