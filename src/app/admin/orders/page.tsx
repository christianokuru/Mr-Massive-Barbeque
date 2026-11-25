import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrdersTable, OrdersToolbar } from "@/components/admin/orders-ui";
import { EmptyState } from "@/components/store/bits";
import { formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import { listOrders } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Orders" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = { q: str(sp.q), status: str(sp.status), from: str(sp.from), to: str(sp.to), page: Number(str(sp.page) ?? 1) || 1 };
  const { rows, total, page, pages, byStatus } = await listOrders(filter);
  const all = Object.values(byStatus).reduce((a, b) => a + (b ?? 0), 0);
  const toShip = (byStatus.confirmed ?? 0) + (byStatus.preparing ?? 0);

  const tab = (status: string | undefined, label: string, n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: filter.q, from: filter.from, to: filter.to })) if (v) p.set(k, v);
    if (status) p.set("status", status);
    const active = (filter.status ?? "") === (status ?? "");
    return (
      <Link key={label} href={`/admin/orders${p.size ? `?${p}` : ""}`} aria-current={active ? "page" : undefined} className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold", active ? "bg-oxblood text-cream" : "bg-white hover:bg-sand")} data-testid={`tab-${status ?? "all"}`}>
        {label} <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-cream/20" : "bg-sand")}>{n}</span>
      </Link>
    );
  };
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) if (v && k !== "page") p.set(k, String(v));
    p.set("page", String(n));
    return `/admin/orders?${p}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Orders</h1>
      <Suspense>
        <OrdersToolbar />
      </Suspense>
      <nav aria-label="Status" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {tab(undefined, "All", all)}
        {tab("to_ship", "To ship", toShip)}
        {(ORDER_STATUSES as readonly OrderStatus[]).map((s) => tab(s, STATUS_LABEL[s], byStatus[s] ?? 0))}
      </nav>
      {rows.length ? (
        <OrdersTable
          rows={rows.map((o) => ({
            id: o.id,
            number: o.number,
            name: o.name,
            phone: o.phone,
            createdAt: formatDateTime(o.createdAt),
            total: formatNaira(o.totalKobo),
            status: o.status as OrderStatus,
            method: o.method,
            zone: o.zoneName,
          }))}
        />
      ) : (
        <EmptyState title="No orders match" body="Try a different search, status or date range." />
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{total} order{total === 1 ? "" : "s"}</span>
        <div className="flex gap-2">
          {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-full bg-white px-4 py-2 font-bold">Previous</Link> : null}
          <span className="px-2 py-2">Page {page} of {pages}</span>
          {page < pages ? <Link href={pageHref(page + 1)} className="rounded-full bg-white px-4 py-2 font-bold">Next</Link> : null}
        </div>
      </div>
    </div>
  );
}
