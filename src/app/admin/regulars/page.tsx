import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import { normalizeWhatsapp } from "@/lib/validation";
import { regularCustomers } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Regulars" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

const RANGES = [
  { v: 30, label: "30 days" },
  { v: 90, label: "90 days" },
  { v: 365, label: "1 year" },
  { v: 0, label: "All time" },
] as const;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-card bg-white p-5">
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-[length:clamp(24px,7vw,34px)] leading-none">{value}</p>
      {sub ? <p className="mt-2 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** "About every 9 days" from the average gap between orders. */
function rhythm(gap: number | null) {
  if (gap === null) return null;
  return gap < 1 ? "Several times a day" : gap === 1 ? "Almost daily" : `About every ${gap} days`;
}

export default async function Regulars({ searchParams }: PageProps<"/admin/regulars">) {
  await requireAdmin();
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r.v) === sp.range)?.v ?? 90;
  const { regulars, summary, topItems } = await regularCustomers(days, 2);
  const repeatRate = summary.customers ? Math.round((summary.repeat / summary.customers) * 100) : 0;
  const repeatShare = summary.revenue ? Math.round((summary.repeat_revenue / summary.revenue) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Regulars</h1>
          <p className="mt-2 text-muted-foreground">Customers who keep coming back, and what they order every time.</p>
        </div>
        <nav aria-label="Range" className="grid w-full grid-cols-4 rounded-full bg-white p-1 sm:inline-flex sm:w-auto" data-testid="regulars-range">
          {RANGES.map((r) => (
            <Link key={r.v} href={`/admin/regulars?range=${r.v}`} aria-current={r.v === days ? "page" : undefined} className={cn("rounded-full px-2 py-2 text-center text-sm font-bold whitespace-nowrap sm:px-4", r.v === days ? "bg-oxblood text-cream" : "hover:bg-sand")}>
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Paying customers" value={String(summary.customers)} sub="Ordered at least once" />
        <Stat label="Came back" value={String(summary.repeat)} sub="Ordered 2 or more times" />
        <Stat label="Repeat rate" value={`${repeatRate}%`} sub="Of paying customers" />
        <Stat label="Sales from regulars" value={`${repeatShare}%`} sub={formatNaira(summary.repeat_revenue)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="min-w-0 rounded-card bg-white p-5" data-testid="regulars-list">
          <h2 className="mb-1 font-sans text-body-lg font-bold">Your regulars</h2>
          <p className="mb-4 text-sm text-muted-foreground">Most orders first. Tap a name to see everything they&apos;ve bought.</p>
          {regulars.length ? (
            <ul className="divide-y divide-line">
              {regulars.map((c, i) => {
                const wa = c.phone ? normalizeWhatsapp(c.phone) : null;
                const away = c.days_ago;
                const every = rhythm(c.gap_days);
                return (
                  <li key={c.email} className="flex flex-col gap-3 py-4" data-testid="regular">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="font-bold">
                          <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                          {c.user_id ? <Link href={`/admin/customers/${c.user_id}`} className="hover:underline">{c.name}</Link> : c.name}
                          {!c.user_id ? <span className="ml-2 text-xs font-normal text-muted-foreground">(guest)</span> : null}
                        </p>
                        <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">{c.email} · {c.phone}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-bold">{c.orders} orders · {formatNaira(c.spent)}</p>
                        <p className="text-sm text-muted-foreground">{every}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2" aria-label="Usually orders">
                      {c.favs.map((f) => (
                        <span key={f.name} className="rounded-full bg-paprika px-3 py-1 text-sm">
                          <span className="font-bold">{f.name}</span> · {f.times === c.orders ? "every order" : `${f.times} of ${c.orders} orders`}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className={cn(away > 30 ? "font-bold text-chili" : "text-muted-foreground")}>
                        Last order {formatDate(c.last_at)} {away > 0 ? `(${away} day${away === 1 ? "" : "s"} ago)` : "(today)"}
                      </span>
                      {wa ? (
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#128C4B] hover:underline">
                          <MessageCircle className="size-4" /> WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No regulars yet" body="When someone pays for a second order in this period, they'll show up here." />
          )}
        </section>

        <section className="h-fit min-w-0 rounded-card bg-white p-5" data-testid="regulars-top-items">
          <h2 className="mb-1 font-sans text-body-lg font-bold">What regulars buy most</h2>
          <p className="mb-4 text-sm text-muted-foreground">Keep these in stock: they bring people back.</p>
          {topItems.length ? (
            <ol className="flex flex-col gap-3">
              {topItems.map((t, i) => (
                <li key={t.name} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0"><span className="mr-2 text-muted-foreground">{i + 1}.</span><span className="font-bold">{t.name}</span></span>
                  <span className="shrink-0 text-right text-sm text-muted-foreground">{t.customers} regular{t.customers === 1 ? "" : "s"} · {t.qty} sold</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          )}
          <p className="mt-5 border-t border-line pt-4 text-sm text-muted-foreground">
            Tip: a red &ldquo;last order&rdquo; date means a regular hasn&apos;t ordered in over a month. A friendly WhatsApp with a coupon often brings them back.
          </p>
        </section>
      </div>
    </div>
  );
}
