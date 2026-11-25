import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { escapeLike } from "@/lib/csv";
import { lagosDayKey } from "@/lib/format";
import { isOrderStatus, REVENUE_STATUSES, type OrderStatus } from "@/lib/order-status";
import { phoneSearchDigits } from "@/lib/validation";

const LOW_STOCK = 5;

/* ───────────── Dashboard ───────────── */

export async function dashboardStats(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rev = inArray(s.order.status, [...REVENUE_STATUSES]);
  const [totals] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${s.order.totalKobo}) filter (where ${rev}), 0)`.mapWith(Number),
      paidOrders: sql<number>`count(*) filter (where ${rev})`.mapWith(Number),
      allOrders: count(),
    })
    .from(s.order)
    .where(gte(s.order.createdAt, since));
  const [toShip] = await db.select({ n: count() }).from(s.order).where(inArray(s.order.status, ["confirmed", "preparing"]));
  const [customers] = await db.select({ n: count() }).from(s.user);
  const [newCustomers] = await db.select({ n: count() }).from(s.user).where(gte(s.user.createdAt, since));

  // Daily revenue, zero-filled, bucketed by Lagos calendar day.
  const daily = await db
    .select({
      day: sql<string>`to_char(${s.order.paidAt} at time zone 'Africa/Lagos', 'YYYY-MM-DD')`,
      revenue: sql<number>`sum(${s.order.totalKobo})`.mapWith(Number),
      orders: count(),
    })
    .from(s.order)
    .where(and(rev, gte(s.order.paidAt, since)))
    .groupBy(sql`1`);
  const series: { day: string; revenue: number; orders: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = lagosDayKey(new Date(Date.now() - i * 86_400_000));
    const d = daily.find((x) => x.day === key);
    series.push({ day: key, revenue: d?.revenue ?? 0, orders: d?.orders ?? 0 });
  }

  const best = await db
    .select({
      name: s.orderItem.name,
      qty: sql<number>`sum(${s.orderItem.qty})`.mapWith(Number),
      revenue: sql<number>`sum(${s.orderItem.qty} * ${s.orderItem.unitKobo})`.mapWith(Number),
    })
    .from(s.orderItem)
    .innerJoin(s.order, eq(s.order.id, s.orderItem.orderId))
    .where(and(rev, gte(s.order.createdAt, since)))
    .groupBy(s.orderItem.name)
    .orderBy(desc(sql`3`))
    .limit(5);

  const low = await db
    .select({ id: s.productVariant.id, productId: s.product.id, product: s.product.name, variant: s.productVariant.name, stock: s.productVariant.stock })
    .from(s.productVariant)
    .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
    .where(and(eq(s.product.status, "active"), eq(s.productVariant.active, true), lte(s.productVariant.stock, LOW_STOCK)))
    .orderBy(s.productVariant.stock)
    .limit(8);

  return {
    revenue: totals.revenue,
    paidOrders: totals.paidOrders,
    allOrders: totals.allOrders,
    aov: totals.paidOrders ? Math.round(totals.revenue / totals.paidOrders / 100) * 100 : 0,
    toShip: toShip.n,
    customers: customers.n,
    newCustomers: newCustomers.n,
    series,
    best,
    low,
  };
}

export async function sidebarBadges() {
  const [[ship], [reviews]] = await Promise.all([
    db.select({ n: count() }).from(s.order).where(inArray(s.order.status, ["confirmed", "preparing"])),
    db.select({ n: count() }).from(s.review).where(eq(s.review.status, "pending")),
  ]);
  return { toShip: ship.n, reviews: reviews.n };
}

/* ───────────── Orders ───────────── */

export type OrderFilter = { q?: string; status?: string; from?: string; to?: string; page?: number };
export const ORDERS_PAGE_SIZE = 25;

export function orderWhere(f: OrderFilter, withStatus = true): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (withStatus && f.status && isOrderStatus(f.status)) parts.push(eq(s.order.status, f.status));
  if (withStatus && f.status === "to_ship") parts.push(inArray(s.order.status, ["confirmed", "preparing"]));
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) parts.push(sql`${s.order.createdAt} >= (${f.from}::date at time zone 'Africa/Lagos')`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) parts.push(sql`${s.order.createdAt} < ((${f.to}::date + 1) at time zone 'Africa/Lagos')`);
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const digits = phoneSearchDigits(q);
    parts.push(
      or(
        ilike(s.order.number, like),
        ilike(s.order.name, like),
        ilike(s.order.email, like),
        // Phone: 0803… matches +234803… (compare local digits only)
        digits.length >= 4 ? sql`regexp_replace(${s.order.phone}, '\\D', '', 'g') like ${`%${digits}%`}` : undefined,
      ),
    );
  }
  const defined = parts.filter(Boolean) as SQL[];
  return defined.length ? and(...defined) : undefined;
}

export async function listOrders(f: OrderFilter) {
  const page = Math.max(1, f.page ?? 1);
  const where = orderWhere(f);
  const [rows, [total], counts] = await Promise.all([
    db
      .select()
      .from(s.order)
      .where(where)
      .orderBy(desc(s.order.createdAt))
      .limit(ORDERS_PAGE_SIZE)
      .offset((page - 1) * ORDERS_PAGE_SIZE),
    db.select({ n: count() }).from(s.order).where(where),
    db.select({ status: s.order.status, n: count() }).from(s.order).where(orderWhere(f, false)).groupBy(s.order.status),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<Record<OrderStatus, number>>;
  return { rows, total: total.n, page, pages: Math.max(1, Math.ceil(total.n / ORDERS_PAGE_SIZE)), byStatus };
}

export async function exportOrders(f: OrderFilter) {
  return db.select().from(s.order).where(orderWhere(f)).orderBy(desc(s.order.createdAt)).limit(5000);
}

/* ───────────── Customers ───────────── */

export async function listCustomers(q?: string) {
  const like = q?.trim() ? `%${escapeLike(q.trim().slice(0, 80))}%` : null;
  return db
    .select({
      id: s.user.id,
      name: s.user.name,
      email: s.user.email,
      verified: s.user.emailVerified,
      createdAt: s.user.createdAt,
      orders: sql<number>`(select count(*) from "order" o where (o.user_id = "user"."id" or o.email = lower("user"."email")) and o.status in ('confirmed','preparing','out_for_delivery','delivered'))`.mapWith(Number),
      spent: sql<number>`(select coalesce(sum(total_kobo),0) from "order" o where (o.user_id = "user"."id" or o.email = lower("user"."email")) and o.status in ('confirmed','preparing','out_for_delivery','delivered'))`.mapWith(Number),
    })
    .from(s.user)
    .where(like ? or(ilike(s.user.name, like), ilike(s.user.email, like)) : undefined)
    .orderBy(desc(s.user.createdAt))
    .limit(200);
}

/* ───────────── Abandoned bags ───────────── */

export async function abandonedBags() {
  const rows = await db.execute<{
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    last_active_at: Date;
    reminders_sent: number;
    items: number;
    value_kobo: number;
    summary: string;
  }>(sql`
    select c.id, coalesce(c.email, u.email) as email, u.name, p.phone, c.last_active_at, c.reminders_sent,
      sum(ci.qty)::int as items,
      sum(ci.qty * coalesce(v.price_kobo, cb.price_kobo))::int as value_kobo,
      string_agg(ci.qty || ' × ' || coalesce(pr.name || ' (' || v.name || ')', cb.name), ', ') as summary
    from cart c
    join cart_item ci on ci.cart_id = c.id
    left join product_variant v on v.id = ci.variant_id
    left join product pr on pr.id = v.product_id
    left join combo cb on cb.id = ci.combo_id
    left join "user" u on u.id = c.user_id
    left join profile p on p.user_id = c.user_id
    where c.converted_at is null and c.last_active_at < now() - interval '1 hour'
    group by c.id, u.email, u.name, p.phone
    order by c.last_active_at desc
    limit 200
  `);
  return rows.rows;
}

/* ───────────── Coupons ───────────── */

export async function couponsWithRevenue() {
  return db
    .select({
      c: s.coupon,
      orders: sql<number>`(select count(*) from "order" o where o.coupon_id = "coupon"."id" and o.status in ('confirmed','preparing','out_for_delivery','delivered'))`.mapWith(Number),
      revenue: sql<number>`(select coalesce(sum(total_kobo),0) from "order" o where o.coupon_id = "coupon"."id" and o.status in ('confirmed','preparing','out_for_delivery','delivered'))`.mapWith(Number),
    })
    .from(s.coupon)
    .where(sql`${s.coupon.source} <> 'referral'`)
    .orderBy(desc(s.coupon.createdAt))
    .limit(300);
}
