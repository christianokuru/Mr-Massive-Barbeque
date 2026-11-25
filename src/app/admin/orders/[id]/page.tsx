import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft, Mail, MessageCircle, Phone, Printer } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { StatusForm } from "@/components/admin/orders-ui";
import { StatusBadge } from "@/components/store/bits";
import { OrderDetails } from "@/components/store/order-details";
import { formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { statusLabel, type OrderStatus } from "@/lib/order-status";
import { normalizeWhatsapp } from "@/lib/validation";
import { loadOrderView } from "@/server/order-view";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Order" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const o = /^\d+$/.test(id) ? await loadOrderView(Number(id)) : null;
  if (!o) notFound();
  const payments = await db.select().from(s.payment).where(eq(s.payment.orderId, o.id)).orderBy(desc(s.payment.createdAt));
  const wa = normalizeWhatsapp(o.phone);
  const waText = encodeURIComponent(`Hi ${o.name.split(" ")[0]}, this is Massive Barbeque about your order ${o.number}.`);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/orders" className="inline-flex w-fit items-center gap-1 text-sm font-bold"><ChevronLeft className="size-4" /> Orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[36px] leading-none md:text-heading-lg">{o.number}</h1>
        <StatusBadge status={o.status} method={o.method} />
        <Link href={`/admin/orders/${o.id}/slip`} className="ml-auto inline-flex h-11 items-center gap-2 rounded-full border-2 border-oxblood px-4 font-bold text-oxblood" data-testid="packing-slip-link">
          <Printer className="size-4" /> Packing slip
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card bg-white p-5">
            <OrderDetails o={o} />
            {o.notes ? <p className="mt-4 rounded-xl bg-paprika p-3 text-sm"><span className="font-bold">Kitchen note:</span> {o.notes}</p> : null}
          </section>
          <section className="rounded-card bg-white p-5">
            <h2 className="mb-4 font-sans text-body-lg font-bold">History</h2>
            <ol className="flex flex-col gap-3 border-l-2 border-line pl-4" data-testid="order-timeline">
              {o.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-bold">
                    {e.toStatus ? `${e.fromStatus ? `${statusLabel(e.fromStatus as OrderStatus, o.method)} → ` : ""}${statusLabel(e.toStatus as OrderStatus, o.method)}` : e.type.replace(/_/g, " ")}
                  </p>
                  {e.note ? <p className="text-smoke">{e.note}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-card bg-white p-5" data-testid="customer-card">
            <h2 className="mb-3 font-sans text-body-lg font-bold">Customer</h2>
            <p className="font-bold">{o.name}</p>
            <p className="text-sm text-muted-foreground">{o.email}</p>
            <p className="text-sm text-muted-foreground">{o.phone}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={`tel:${o.phone}`} className="flex flex-col items-center gap-1 rounded-xl bg-sand py-3 text-xs font-bold"><Phone className="size-5" /> Call</a>
              {wa ? <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-xl bg-[#25D366] py-3 text-xs font-bold text-white"><MessageCircle className="size-5" /> WhatsApp</a> : <span />}
              <a href={`mailto:${o.email}?subject=${encodeURIComponent(`Your order ${o.number}`)}`} className="flex flex-col items-center gap-1 rounded-xl bg-sand py-3 text-xs font-bold"><Mail className="size-5" /> Email</a>
            </div>
          </section>
          <section className="rounded-card bg-white p-5">
            <h2 className="mb-3 font-sans text-body-lg font-bold">Update status</h2>
            <StatusForm orderId={o.id} status={o.status} method={o.method} tracking={o.tracking} />
          </section>
          <section className="rounded-card bg-white p-5">
            <h2 className="mb-3 font-sans text-body-lg font-bold">Payments</h2>
            <ul className="flex flex-col gap-3 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-line p-3">
                  <p className="flex justify-between font-bold"><span className="capitalize">{p.status}</span><span>{formatNaira(p.paidAmountKobo ?? p.amountKobo)}</span></p>
                  <p className="break-all text-muted-foreground">{p.reference}</p>
                  <p className="text-muted-foreground">{p.channel ?? "Paystack"} · {formatDateTime(p.verifiedAt ?? p.createdAt)}</p>
                  {p.flagged ? <p className="mt-2 rounded-lg bg-[#f6d6d0] p-2 font-bold text-[#7a1a0c]">⚠ {p.flagged}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
