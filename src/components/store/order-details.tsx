import Image from "next/image";
import { Check } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { statusLabel, TRACKER_STEPS, trackerIndex, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { OrderView } from "@/server/order-view";
import { StatusBadge } from "./bits";

export function OrderTracker({ status, method, reached }: { status: OrderStatus; method: string; reached: Partial<Record<OrderStatus, Date>> }) {
  const idx = trackerIndex(status);
  if (idx < 0) return null;
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Order progress" data-testid="order-tracker">
      {TRACKER_STEPS.map((step, i) => {
        const done = i <= idx;
        return (
          <li key={step} className="flex flex-col items-start gap-2">
            <div className="flex w-full items-center">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border-2", done ? "border-oxblood bg-oxblood text-cream" : "border-line bg-white text-ash")}>
                {done ? <Check className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </span>
              {i < TRACKER_STEPS.length - 1 ? <span className={cn("h-0.5 flex-1", i < idx ? "bg-oxblood" : "bg-line")} /> : null}
            </div>
            <span className={cn("text-xs leading-tight font-bold sm:text-sm", !done && "text-muted-foreground")}>{statusLabel(step, method)}</span>
            {reached[step] ? <span className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{formatDateTime(reached[step])}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetails({ o, showTimeline = false }: { o: NonNullable<OrderView>; showTimeline?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Order {o.number} · {formatDate(o.createdAt)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{o.method === "pickup" ? "Pickup" : `Delivery to ${o.addressLine}, ${o.area} (${o.zoneName ?? ""})`}</p>
        </div>
        <StatusBadge status={o.status} method={o.method} />
      </div>
      <OrderTracker status={o.status} method={o.method} reached={o.reached} />
      {o.tracking && o.status === "out_for_delivery" ? <p className="rounded-2xl bg-paprika p-3 text-sm"><span className="font-bold">Rider:</span> {o.tracking}</p> : null}
      <ul className="divide-y divide-line rounded-card bg-white px-4">
        {o.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3">
            {i.imageUrl ? <Image src={i.imageUrl} alt="" width={48} height={48} className="size-12 rounded-xl object-cover" /> : <span className="size-12 rounded-xl bg-sand" />}
            <span className="min-w-0 flex-1">{i.qty} × <span className="font-bold">{i.name}</span> <span className="text-muted-foreground">({i.size})</span></span>
            <span className="font-bold">{formatNaira(i.unitKobo * i.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(o.subtotalKobo)}</dd></div>
        {o.discountKobo ? <div className="flex justify-between text-oxblood"><dt>Discount {o.couponCode ? `(${o.couponCode})` : o.referralCode ? "(referral)" : ""}</dt><dd>-{formatNaira(o.discountKobo)}</dd></div> : null}
        <div className="flex justify-between"><dt>{o.method === "pickup" ? "Pickup" : "Delivery"}</dt><dd>{o.deliveryKobo ? formatNaira(o.deliveryKobo) : "Free"}</dd></div>
        <div className="flex justify-between border-t border-line pt-2 text-body-lg font-bold"><dt>Total</dt><dd>{formatNaira(o.totalKobo)}</dd></div>
      </dl>
      {showTimeline ? (
        <ol className="flex flex-col gap-2 border-l-2 border-line pl-4 text-sm">
          {o.events.map((e) => (
            <li key={e.id}><span className="font-bold">{e.toStatus ? statusLabel(e.toStatus as OrderStatus, o.method) : e.type.replace(/_/g, " ")}</span> · {formatDateTime(e.createdAt)}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
