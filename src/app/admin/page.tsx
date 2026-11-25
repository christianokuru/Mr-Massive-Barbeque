import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Eye } from "lucide-react";
import { PushCard } from "@/components/admin/push-card";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import { dashboardStats } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

const RANGES = [7, 30, 90] as const;

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-[34px] leading-none" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
      {sub ? <p className="mt-2 text-sm text-muted-foreground">{sub}</p> : null}
    </>
  );
  return href ? <Link href={href} className="rounded-card bg-white p-5 hover:ring-2 hover:ring-oxblood/30">{body}</Link> : <div className="rounded-card bg-white p-5">{body}</div>;
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-NG", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const st = await dashboardStats(days);
  const max = Math.max(1, ...st.series.map((d) => d.revenue));
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
          <h1 className="text-[36px] leading-none md:text-heading-lg">{greeting()}, {session.user.name.split(" ")[0]}</h1>
        </div>
        <nav aria-label="Range" className="inline-flex rounded-full bg-white p-1" data-testid="range-switch">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin?range=${r}`} aria-current={r === days ? "page" : undefined} className={cn("rounded-full px-4 py-2 text-sm font-bold", r === days ? "bg-oxblood text-cream" : "hover:bg-sand")}>
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat label="Revenue" value={formatNaira(st.revenue)} sub={`Last ${days} days (NGN)`} />
        <Stat label="Orders" value={String(st.paidOrders)} sub={`${st.allOrders} placed incl. unpaid`} href="/admin/orders" />
        <Stat label="Average order" value={formatNaira(st.aov)} />
        <Stat label="To ship" value={String(st.toShip)} sub="Confirmed + on the grill" href="/admin/orders?status=to_ship" />
        <Stat label="Customers" value={String(st.customers)} sub={`+${st.newCustomers} new`} href="/admin/customers" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="min-w-0 rounded-card bg-white p-5" data-testid="sales-chart">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-body-lg font-bold">Daily sales (NGN)</h2>
            <span className="text-sm text-muted-foreground">Peak {formatNaira(max)}</span>
          </div>
          <div className="flex h-56 items-end gap-[2px] border-b border-line" role="img" aria-label={`Daily revenue for the last ${days} days`}>
            {st.series.map((d) => (
              <div key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end">
                <div className="w-full rounded-t-[3px] bg-oxblood transition group-hover:bg-bonnet" style={{ height: `${d.revenue ? Math.max(2, (d.revenue / max) * 100) : 0}%` }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-char px-2 py-1 text-xs whitespace-nowrap text-cream group-hover:block">
                  {d.day}: {formatNaira(d.revenue)} · {d.orders} order{d.orders === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{st.series[0]?.day}</span>
            <span>{st.series.at(-1)?.day}</span>
          </div>
        </section>
        <PushCard vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <section className="rounded-card bg-white p-5">
          <h2 className="mb-3 font-sans text-body-lg font-bold">Best sellers</h2>
          {st.best.length ? (
            <ol className="flex flex-col divide-y divide-line">
              {st.best.map((b, i) => (
                <li key={b.name} className="flex items-center gap-3 py-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-sand text-xs font-bold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{b.name}</span>
                  <span className="text-sm text-muted-foreground">{b.qty} sold</span>
                  <span className="w-24 text-right font-bold">{formatNaira(b.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No paid orders in this range yet.</p>
          )}
        </section>
        <section className="rounded-card bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-body-lg font-bold">Low stock today</h2>
            <Link href="/admin/products" className="text-sm font-bold underline">Edit stock</Link>
          </div>
          {st.low.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {st.low.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/products/${v.productId}`} className="min-w-0 truncate"><span className="font-bold">{v.product}</span> <span className="text-muted-foreground">· {v.variant}</span></Link>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", v.stock === 0 ? "bg-[#f6d6d0] text-[#7a1a0c]" : "bg-bonnet/30")}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Everything is well stocked.</p>
          )}
        </section>
        <section className="flex flex-col gap-3 rounded-card bg-white p-5">
          <h2 className="font-sans text-body-lg font-bold">Analytics</h2>
          <a href={gaId ? "https://analytics.google.com/analytics/web/" : "https://analytics.google.com/"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-sand">
            <BarChart3 className="size-5 text-oxblood" />
            <span className="flex-1"><span className="block font-bold">Google Analytics 4</span><span className="text-sm text-muted-foreground">{gaId ? `Property ${gaId}` : "Add NEXT_PUBLIC_GA_ID to start tracking"}</span></span>
            <ArrowRight className="size-4" />
          </a>
          <a href={clarityId ? `https://clarity.microsoft.com/projects/view/${encodeURIComponent(clarityId)}/dashboard` : "https://clarity.microsoft.com/"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-sand">
            <Eye className="size-5 text-oxblood" />
            <span className="flex-1"><span className="block font-bold">Microsoft Clarity</span><span className="text-sm text-muted-foreground">{clarityId ? "Heatmaps & session recordings" : "Add NEXT_PUBLIC_CLARITY_ID to start"}</span></span>
            <ArrowRight className="size-4" />
          </a>
        </section>
      </div>
    </div>
  );
}
