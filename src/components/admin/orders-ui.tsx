"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateStatus, updateOrderStatus } from "@/app/actions/admin";
import { useConfirm } from "@/components/confirm";
import { StatusBadge } from "@/components/store/bits";
import { ALLOWED_TRANSITIONS, STATUS_LABEL, statusLabel, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export function OrdersToolbar() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries({ q, from, to })) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.push(`${path}?${next}`);
  }
  const csv = new URLSearchParams(params);
  csv.delete("page");

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3" data-testid="orders-toolbar">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white px-4 sm:min-w-72">
        <Search className="size-4 text-ash" />
        <span className="sr-only">Search orders</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., name, email or phone" className="min-w-0 flex-1 bg-transparent outline-none" data-testid="orders-search" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-2" /></label>
      <label className="flex flex-col gap-1 text-xs font-bold">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-2" /></label>
      <button type="submit" className="h-11 rounded-full bg-char px-5 font-bold text-cream">Apply</button>
      <a href={`/api/admin/orders.csv?${csv}`} className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-oxblood px-4 font-bold text-oxblood" data-testid="orders-csv">
        <Download className="size-4" /> CSV
      </a>
    </form>
  );
}

type Row = { id: number; number: string; name: string; phone: string; createdAt: string; total: string; status: OrderStatus; method: string; zone: string | null };

export function OrdersTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const all = rows.length > 0 && selected.length === rows.length;

  async function bulk(to: "preparing" | "delivered") {
    if (!(await confirm({ title: `Mark ${selected.length} order${selected.length === 1 ? "" : "s"} as ${STATUS_LABEL[to].toLowerCase()}?`, body: "Orders that can't move to this status are skipped." }))) return;
    start(async () => {
      const res = await bulkUpdateStatus(selected, to);
      if (res.ok) {
        toast.success(res.message);
        setSelected([]);
      } else toast.error(res.error);
    });
  }

  return (
    <div className="min-w-0">
      {selected.length ? (
        <div className="sticky top-14 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-char p-3 text-cream lg:top-2" data-testid="bulk-bar">
          <span className="font-bold">{selected.length} selected</span>
          <button type="button" disabled={pending} onClick={() => bulk("preparing")} className="h-10 rounded-full bg-bonnet px-4 text-sm font-bold text-char">Mark on the grill</button>
          <button type="button" disabled={pending} onClick={() => bulk("delivered")} className="h-10 rounded-full bg-cream px-4 text-sm font-bold text-char">Mark delivered</button>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          <button type="button" onClick={() => setSelected([])} className="ml-auto text-sm underline">Clear</button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-card bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-muted-foreground">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? [] : rows.map((r) => r.id))} className="size-4 accent-[var(--mb-oxblood)]" />
              </th>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Placed</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-cream" data-testid="order-row">
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.number}`}
                    checked={selected.includes(r.id)}
                    onChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                    className="size-4 accent-[var(--mb-oxblood)]"
                  />
                </td>
                <td className="p-3 font-bold"><Link href={`/admin/orders/${r.id}`} className="hover:underline">{r.number}</Link></td>
                <td className="p-3"><span className="block">{r.name}</span><span className="text-muted-foreground">{r.phone}</span></td>
                <td className="p-3 whitespace-nowrap">{r.createdAt}</td>
                <td className="p-3 capitalize">{r.method}{r.zone ? <span className="block text-muted-foreground normal-case">{r.zone}</span> : null}</td>
                <td className="p-3"><StatusBadge status={r.status} method={r.method} /></td>
                <td className="p-3 text-right font-bold whitespace-nowrap">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusForm({ orderId, status, method, tracking }: { orderId: number; status: OrderStatus; method: string; tracking: string | null }) {
  const options = ALLOWED_TRANSITIONS[status];
  const [to, setTo] = useState<OrderStatus | "">(options[0] ?? "");
  const [rider, setRider] = useState(tracking ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const confirm = useConfirm();

  if (!options.length) return <p className="text-sm text-muted-foreground">This order is {STATUS_LABEL[status].toLowerCase()}. No further changes.</p>;
  const needsRider = to === "out_for_delivery" && method === "delivery";

  return (
    <form
      className="flex flex-col gap-3"
      data-testid="status-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!to) return;
        setError(null);
        if (to === "cancelled" || to === "refunded") {
          const ok = await confirm({
            title: to === "cancelled" ? "Cancel this order?" : "Mark as refunded?",
            body: to === "cancelled" ? "Stock goes back on the menu and the customer is emailed. Refund any payment in Paystack." : "Make sure you've refunded the payment in Paystack first. The customer is emailed.",
            confirmLabel: to === "cancelled" ? "Cancel order" : "Mark refunded",
            destructive: true,
          });
          if (!ok) return;
        }
        start(async () => {
          const res = await updateOrderStatus(orderId, to, rider || null, note || null);
          if (res.ok) {
            toast.success(res.message);
            setNote("");
          } else setError(res.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Move to</span>
        <select value={to} onChange={(e) => setTo(e.target.value as OrderStatus)} className="h-11 rounded-lg border border-input bg-white px-3" data-testid="status-select">
          {options.map((o) => <option key={o} value={o}>{statusLabel(o, method)}</option>)}
        </select>
      </label>
      {needsRider || to === "out_for_delivery" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Rider name & phone {needsRider ? "(required)" : "(optional)"}</span>
          <input value={rider} onChange={(e) => setRider(e.target.value)} maxLength={120} placeholder="e.g. Musa · 0803 000 0000" className="h-11 rounded-lg border border-input bg-white px-3" data-testid="rider-input" />
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Note (internal)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="h-11 rounded-lg border border-input bg-white px-3" />
      </label>
      {error ? <p className="text-sm font-bold text-chili" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending || !to} className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-full font-bold", to === "cancelled" || to === "refunded" ? "bg-[#b42318] text-white" : "bg-bonnet text-char")} data-testid="status-submit">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Update status
      </button>
    </form>
  );
}
