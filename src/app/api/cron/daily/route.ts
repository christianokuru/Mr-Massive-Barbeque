import { timingSafeEqual } from "node:crypto";
import { runDailyJobs } from "@/server/cron";

export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Vercel Cron (daily). Sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  if (!authorized(req.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  const result = await runDailyJobs();
  return Response.json({ ok: true, ...result });
}
