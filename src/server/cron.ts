import "server-only";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { siteConfig } from "@/lib/site";
import { emails } from "./email";
import { expireStaleOrders, notifyBackInStock } from "./orders";

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url).replace(/\/$/, "");

/** Abandoned-bag emails: #1 after 3h idle, #2 a day after #1. Never more than 2. */
export async function sendAbandonedBagEmails() {
  const bags = await db.execute<{ id: string; email: string; reminders_sent: number; summary: string }>(sql`
    select c.id, coalesce(c.email, u.email) as email, c.reminders_sent,
      string_agg(ci.qty || ' × ' || coalesce(p.name || ' (' || v.name || ')', cb.name), ', ') as summary
    from cart c
    join cart_item ci on ci.cart_id = c.id
    left join product_variant v on v.id = ci.variant_id
    left join product p on p.id = v.product_id
    left join combo cb on cb.id = ci.combo_id
    left join "user" u on u.id = c.user_id
    where c.converted_at is null
      and coalesce(c.email, u.email) is not null
      and c.reminders_sent < 2
      and c.last_active_at < now() - interval '3 hours'
      and c.last_active_at > now() - interval '14 days'
      and (c.reminders_sent = 0 or c.last_reminder_at < now() - interval '24 hours')
      -- don't nag people who already ordered since
      and not exists (select 1 from "order" o where o.email = lower(coalesce(c.email, u.email)) and o.created_at > c.last_active_at and o.status <> 'cancelled')
    group by c.id, u.email
    limit 100
  `);
  let sent = 0;
  for (const b of bags.rows) {
    // Claim the reminder atomically so overlapping runs can't double-send.
    const claimed = await db
      .update(s.cart)
      .set({ remindersSent: sql`${s.cart.remindersSent} + 1`, lastReminderAt: new Date() })
      .where(and(eq(s.cart.id, b.id), eq(s.cart.remindersSent, b.reminders_sent)))
      .returning({ n: s.cart.remindersSent });
    if (!claimed.length) continue;
    await emails.abandonedBag(b.email, `In your bag: ${b.summary}.`, claimed[0].n);
    sent++;
  }
  return sent;
}

/** "Craving again?" once per (email, product), after paid date + product.reorderDays, if not re-ordered since. */
export async function sendCravingReminders() {
  const due = await db.execute<{ email: string; product_id: number; slug: string; name: string; day: string }>(sql`
    with paid as (
      select o.email, oi.product_id, max(o.paid_at) as last_paid
      from "order" o join order_item oi on oi.order_id = o.id
      where o.status in ('confirmed','preparing','out_for_delivery','delivered') and o.paid_at is not null and oi.product_id is not null
      group by o.email, oi.product_id
    )
    select pd.email, p.id as product_id, p.slug, p.name, to_char(pd.last_paid, 'YYYYMMDD') as day
    from paid pd
    join product p on p.id = pd.product_id and p.status = 'active'
    where pd.last_paid + make_interval(days => p.reorder_days) <= now()
      and pd.last_paid > now() - interval '120 days'
      and not exists (select 1 from reminder_log r where r.kind = 'craving' and r.key = pd.email || ':' || p.id || ':' || to_char(pd.last_paid, 'YYYYMMDD'))
    limit 100
  `);
  let sent = 0;
  for (const r of due.rows) {
    const key = `${r.email}:${r.product_id}:${r.day}`;
    const ins = await db.insert(s.reminderLog).values({ kind: "craving", key }).onConflictDoNothing().returning();
    if (!ins.length) continue;
    await emails.craving(r.email, r.name, `${appUrl()}/menu/${r.slug}`);
    sent++;
  }
  return sent;
}

/** Back-in-stock sweep (covers stock changes made outside the admin UI). */
export async function sweepStockAlerts() {
  const rows = await db
    .selectDistinct({ variantId: s.stockAlert.variantId })
    .from(s.stockAlert)
    .innerJoin(s.productVariant, eq(s.productVariant.id, s.stockAlert.variantId))
    .where(and(isNull(s.stockAlert.notifiedAt), sql`${s.productVariant.stock} > 0`));
  return notifyBackInStock(rows.map((r) => r.variantId));
}

export async function pruneRateLimits() {
  const a = await db.delete(s.throttle).where(lt(s.throttle.windowStart, new Date(Date.now() - 2 * 86_400_000))).returning({ k: s.throttle.key });
  const b = await db.delete(s.rateLimit).where(lt(s.rateLimit.lastRequest, Date.now() - 2 * 86_400_000)).returning({ k: s.rateLimit.id });
  // Old empty guest carts
  const c = await db
    .delete(s.cart)
    .where(and(isNull(s.cart.userId), or(lt(s.cart.lastActiveAt, new Date(Date.now() - 45 * 86_400_000)), and(inArray(s.cart.remindersSent, [2]), lt(s.cart.lastActiveAt, new Date(Date.now() - 30 * 86_400_000))))))
    .returning({ id: s.cart.id });
  return a.length + b.length + c.length;
}

export async function runDailyJobs() {
  const expired = await expireStaleOrders();
  const abandoned = await sendAbandonedBagEmails();
  const cravings = await sendCravingReminders();
  const backInStock = await sweepStockAlerts();
  const pruned = await pruneRateLimits();
  return { expired, abandoned, cravings, backInStock, pruned };
}
