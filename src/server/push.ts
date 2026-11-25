import "server-only";
import { eq, inArray } from "drizzle-orm";
import { sendNotification, setVapidDetails } from "web-push";
import { db } from "@/db";
import * as s from "@/db/schema";

/** Only real browser push services are allowed (prevents SSRF via stored endpoints). */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export function pushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

let configured = false;
function setup() {
  if (configured) return true;
  if (!pushConfigured()) return false;
  setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Send to every device of the verified ADMIN_EMAIL user only. Drops expired subscriptions. */
export async function pushToAdmin(payload: PushPayload) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !setup()) return { sent: 0, removed: 0, errors: [] as string[] };
  const [admin] = await db.select({ id: s.user.id, verified: s.user.emailVerified }).from(s.user).where(eq(s.user.email, adminEmail));
  if (!admin?.verified) return { sent: 0, removed: 0, errors: ["Admin account not verified"] };
  const subs = await db.select().from(s.pushSubscription).where(eq(s.pushSubscription.userId, admin.id));

  let sent = 0;
  const dead: number[] = [];
  const errors: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        dead.push(sub.id);
        return;
      }
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60, urgency: "high" },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(sub.id);
        else errors.push(`${code ?? ""} ${(err as Error).message}`.trim());
      }
    }),
  );
  if (dead.length) await db.delete(s.pushSubscription).where(inArray(s.pushSubscription.id, dead));
  return { sent, removed: dead.length, errors };
}
