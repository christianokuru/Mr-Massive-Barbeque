import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { liveCheckSeconds } from "@/lib/order-status";
import { orderLiveState } from "@/server/order-view";
import { isAllowedPushEndpoint, pushConfigured } from "@/server/push";
import { enforceRateLimit } from "@/server/rate-limit";
import { getSession } from "@/server/session";

const bodySchema = z.object({
  email: z.string().max(254).optional(),
  subscription: z
    .object({
      endpoint: z.string().url().max(1000),
      keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
    })
    .optional(),
  endpoint: z.string().url().max(1000).optional(),
});

/** Same access rule as the live status: the signed-in owner, or the order's email. */
async function access(number: string, email: string | undefined) {
  const session = email ? null : await getSession();
  return orderLiveState(number.trim().toUpperCase().slice(0, 20), {
    email: email ?? null,
    userId: session?.user.emailVerified ? session.user.id : null,
    userEmail: session?.user.emailVerified ? session.user.email : null,
  });
}

const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

/** "Notify me on this phone" for one order (guests included). */
export async function POST(req: Request, ctx: RouteContext<"/api/orders/[number]/push">) {
  if (!pushConfigured()) return Response.json({ error: "Phone alerts aren't set up yet." }, { status: 503 });
  try {
    await enforceRateLimit("order-push", 20, 600);
  } catch {
    return Response.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.subscription) return Response.json({ error: "Invalid request." }, { status: 400 });
  const sub = parsed.data.subscription;
  if (!isAllowedPushEndpoint(sub.endpoint)) return Response.json({ error: "This browser's push service isn't supported." }, { status: 400 });
  const order = await access((await ctx.params).number, parsed.data.email);
  if (!order) return notFound();
  if (liveCheckSeconds(order.status) === null) return Response.json({ error: "This order is already finished." }, { status: 409 });
  await db
    .insert(s.orderPush)
    .values({ orderId: order.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: [s.orderPush.orderId, s.orderPush.endpoint], set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return Response.json({ ok: true });
}

/** Stop alerts for this order on this device. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/orders/[number]/push">) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.endpoint) return Response.json({ error: "Invalid request." }, { status: 400 });
  const order = await access((await ctx.params).number, parsed.data.email);
  if (!order) return notFound();
  await db.delete(s.orderPush).where(and(eq(s.orderPush.orderId, order.id), eq(s.orderPush.endpoint, parsed.data.endpoint)));
  return Response.json({ ok: true });
}

/** Is this device already following this order? (?endpoint=…&email=…) */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[number]/push">) {
  const p = new URL(req.url).searchParams;
  const endpoint = p.get("endpoint")?.slice(0, 1000);
  const order = await access((await ctx.params).number, p.get("email") ?? undefined);
  if (!order || !endpoint) return notFound();
  const [row] = await db.select({ id: s.orderPush.id }).from(s.orderPush).where(and(eq(s.orderPush.orderId, order.id), eq(s.orderPush.endpoint, endpoint)));
  return Response.json({ on: !!row }, { headers: { "Cache-Control": "no-store" } });
}
