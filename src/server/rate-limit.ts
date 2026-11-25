import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";

export class RateLimitError extends Error {
  constructor() {
    super("Too many attempts. Please wait a moment and try again.");
  }
}

/**
 * Fixed-window counter in Postgres (atomic upsert, works across serverless instances).
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const res = await db.execute<{ count: number }>(sql`
    insert into throttle (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when throttle.window_start < now() - make_interval(secs => ${windowSec})
                   then 1 else throttle.count + 1 end,
      window_start = case when throttle.window_start < now() - make_interval(secs => ${windowSec})
                   then now() else throttle.window_start end
    returning count
  `);
  return Number(res.rows[0]?.count ?? 0) <= limit;
}

export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Throws RateLimitError when over the limit. Key is scoped by client IP. */
export async function enforceRateLimit(scope: string, limit: number, windowSec: number, extra = "") {
  const ip = await clientIp();
  const ok = await rateLimit(`${scope}:${ip}${extra ? `:${extra}` : ""}`, limit, windowSec);
  if (!ok) throw new RateLimitError();
}
