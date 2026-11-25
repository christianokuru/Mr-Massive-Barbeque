"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setBagQty } from "@/app/actions/cart";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";

export type CartLineView = {
  itemId: number;
  href: string;
  name: string;
  size: string;
  imageUrl: string | null;
  unitKobo: number;
  qty: number;
  stock: number;
  available: boolean;
};

function Line({ l }: { l: CartLineView }) {
  const [pending, start] = useTransition();
  const set = (qty: number) =>
    start(async () => {
      const res = await setBagQty(l.itemId, qty);
      if (!res.ok) toast.error(res.error);
      else if (res.message) toast.message(res.message);
    });
  return (
    <li className={cn("flex gap-4 py-5", pending && "opacity-60")} data-testid="cart-line">
      <Link href={l.href} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-sand">
        {l.imageUrl ? <Image src={l.imageUrl} alt="" fill sizes="96px" className="object-cover" /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={l.href} className="font-bold hover:underline">{l.name}</Link>
            <p className="text-sm text-muted-foreground">{l.size} · {formatNaira(l.unitKobo)}</p>
            {!l.available ? <p className="text-sm font-bold text-chili">{l.stock > 0 ? `Only ${l.stock} left today` : "Sold out today"}</p> : null}
          </div>
          <p className="shrink-0 font-bold">{formatNaira(l.unitKobo * l.qty)}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="inline-flex h-11 items-center rounded-full border border-line bg-white" role="group" aria-label={`Quantity of ${l.name}`}>
            <button type="button" aria-label="Decrease quantity" disabled={pending || l.qty <= 1} onClick={() => set(l.qty - 1)} className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40">
              <Minus className="size-4" />
            </button>
            <span className="w-7 text-center font-bold" data-testid="line-qty">{pending ? <Loader2 className="mx-auto size-4 animate-spin" /> : l.qty}</span>
            <button type="button" aria-label="Increase quantity" disabled={pending || l.qty >= Math.min(20, l.stock)} onClick={() => set(l.qty + 1)} className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40">
              <Plus className="size-4" />
            </button>
          </div>
          <button type="button" onClick={() => set(0)} disabled={pending} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-sand" aria-label={`Remove ${l.name}`}>
            <Trash2 className="size-4" /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function CartLines({ lines }: { lines: CartLineView[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {lines.map((l) => <Line key={l.itemId} l={l} />)}
    </ul>
  );
}

export function FreeDeliveryBar({ subtotalKobo, thresholdKobo }: { subtotalKobo: number; thresholdKobo: number | null }) {
  if (!thresholdKobo) return null;
  const pct = Math.min(100, Math.round((subtotalKobo / thresholdKobo) * 100));
  const left = thresholdKobo - subtotalKobo;
  return (
    <div className="rounded-2xl bg-paprika p-4" data-testid="free-delivery-bar">
      <p className="text-sm font-bold">
        {left > 0 ? <>You&apos;re {formatNaira(left)} away from <span className="text-oxblood">free delivery</span></> : "You've unlocked free delivery in Lekki, VI & Ikoyi 🔥"}
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
        <div className="h-full rounded-full bg-oxblood transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
