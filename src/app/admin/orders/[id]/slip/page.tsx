import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { formatDateTime } from "@/lib/format";
import { loadOrderView } from "@/server/order-view";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Packing slip" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

/** Printable packing slip: no prices. Print CSS hides the admin chrome. */
export default async function PackingSlip({ params }: PageProps<"/admin/orders/[id]/slip">) {
  await requireAdmin();
  const { id } = await params;
  const o = /^\d+$/.test(id) ? await loadOrderView(Number(id)) : null;
  if (!o) notFound();
  return (
    <div className="mx-auto max-w-2xl rounded-card bg-white p-8 print:max-w-none print:rounded-none print:p-0" data-testid="packing-slip">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Image src="/brand/logo.png" alt="Massive Barbeque" width={467} height={530} className="h-20 w-auto" />
        <div className="text-right">
          <p className="font-display text-heading-sm">Packing slip</p>
          <p className="font-bold">{o.number}</p>
          <p className="text-sm">{formatDateTime(o.createdAt)}</p>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-bold uppercase">Customer</p>
          <p>{o.name}</p>
          <p>{o.phone}</p>
        </div>
        <div>
          <p className="font-bold uppercase">{o.method === "pickup" ? "Pickup" : "Deliver to"}</p>
          {o.method === "delivery" ? <p>{o.addressLine}, {o.area}<br />{o.zoneName}</p> : <p>Customer collects</p>}
          {o.tracking ? <p>Rider: {o.tracking}</p> : null}
        </div>
      </div>
      <table className="w-full border-collapse text-left">
        <thead><tr className="border-b-2 border-char"><th className="py-2">Item</th><th className="py-2">Size</th><th className="py-2 text-right">Qty</th><th className="w-12 py-2 text-right">✓</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-line"><td className="py-3 font-bold">{i.name}</td><td>{i.size}</td><td className="text-right text-lg font-bold">{i.qty}</td><td className="text-right">☐</td></tr>
          ))}
        </tbody>
      </table>
      {o.notes ? <p className="mt-6 rounded-xl border-2 border-char p-3"><span className="font-bold">Note:</span> {o.notes}</p> : null}
      <p className="mt-8 text-center text-sm">Grilled to perfection, served with love. Massive Barbeque, Lagos.</p>
      <div className="mt-6 flex justify-center print:hidden"><PrintButton /></div>
    </div>
  );
}
