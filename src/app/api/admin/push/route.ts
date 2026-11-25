import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { isAllowedPushEndpoint, pushConfigured, pushToAdmin } from "@/server/push";
import { adminOrNull } from "@/server/session";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Save this device for new-order alerts (admin only, known push services only). */
export async function POST(req: Request) {
  const session = await adminOrNull();
  if (!session) return new Response("Not found", { status: 404 });
  if (!pushConfigured()) return Response.json({ error: "Push isn't configured on the server (VAPID keys missing)." }, { status: 503 });
  const parsed = subSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid subscription." }, { status: 400 });
  if (!isAllowedPushEndpoint(parsed.data.endpoint)) return Response.json({ error: "That push service isn't supported." }, { status: 400 });
  await db
    .insert(s.pushSubscription)
    .values({
      userId: session.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    })
    .onConflictDoUpdate({
      target: s.pushSubscription.endpoint,
      set: { userId: session.user.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
    });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await adminOrNull();
  if (!session) return new Response("Not found", { status: 404 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) {
    await db.delete(s.pushSubscription).where(and(eq(s.pushSubscription.endpoint, body.endpoint), eq(s.pushSubscription.userId, session.user.id)));
  }
  return Response.json({ ok: true });
}

/** Send a test notification to the admin's devices. */
export async function PUT() {
  const session = await adminOrNull();
  if (!session) return new Response("Not found", { status: 404 });
  const res = await pushToAdmin({ title: "Test alert 🔥", body: "Order alerts are working on this device.", url: "/admin", tag: "test" });
  if (!res.sent) return Response.json({ error: res.errors[0] ?? "No devices subscribed yet.", ...res }, { status: 400 });
  return Response.json(res);
}
