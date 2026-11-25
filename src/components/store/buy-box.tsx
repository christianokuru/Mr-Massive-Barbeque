"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { requestStockAlert } from "@/app/actions/growth";
import { BottomBarOffset } from "@/components/providers";
import { useAddToBag } from "@/hooks/use-add-to-bag";
import { track } from "@/lib/analytics";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = { id: number; name: string; priceKobo: number; compareAtKobo: number | null; stock: number };
type Side = { id: number; slug: string; name: string; fromKobo: number; image: { url: string; alt: string } | null; variantId: number | null; totalStock: number };

export function QtyStepper({ value, onChange, max, label = "Quantity" }: { value: number; onChange: (n: number) => void; max: number; label?: string }) {
  return (
    <div className="inline-flex h-12 items-center rounded-full border border-line bg-white" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Decrease quantity" className="inline-flex size-12 items-center justify-center rounded-full disabled:opacity-40">
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center font-bold" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity" className="inline-flex size-12 items-center justify-center rounded-full disabled:opacity-40">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function NotifyMe({ variantId }: { variantId: number }) {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 rounded-2xl bg-sand p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestStockAlert(variantId, email);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        });
      }}
    >
      <p className="flex items-center gap-2 font-bold"><Bell className="size-4" /> Sold out today. Get an email when it&apos;s back on the grill.</p>
      <div className="flex gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" autoComplete="email" className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-white px-3" aria-label="Email for back-in-stock alert" />
        <button type="submit" disabled={pending} className="h-11 rounded-full bg-char px-5 font-bold text-cream">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Notify me"}
        </button>
      </div>
    </form>
  );
}

export function BuyBox({ productId, name, variants, sides }: { productId: number; name: string; variants: Variant[]; sides: Side[] }) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const { add, pending } = useAddToBag();
  const sideAdd = useAddToBag();
  const mainBtn = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const v = variants.find((x) => x.id === variantId) ?? firstAvailable;

  useEffect(() => {
    if (v) track("view_item", { value: v.priceKobo / 100, items: [{ item_id: String(productId), item_name: name, price: v.priceKobo / 100, quantity: 1 }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    const el = mainBtn.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!v) return <p className="text-muted-foreground">Not available right now.</p>;
  const soldOut = v.stock <= 0;
  const max = Math.max(1, Math.min(v.stock, 20));

  const addMain = () =>
    add([{ variantId: v.id, qty }], [{ id: String(v.id), name, variant: v.name, priceKobo: v.priceKobo }]);

  return (
    <div className="flex flex-col gap-6">
      {variants.length > 1 ? (
        <fieldset>
          <legend className="mb-3 font-bold">Choose a size</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {variants.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={x.id === v.id}
                onClick={() => {
                  setVariantId(x.id);
                  setQty(1);
                }}
                className={cn(
                  "flex min-h-12 flex-col items-start justify-center rounded-2xl border-2 px-4 py-2 text-left transition",
                  x.id === v.id ? "border-oxblood bg-paprika" : "border-line bg-white hover:border-oxblood",
                  x.stock <= 0 && "opacity-60",
                )}
                data-testid="variant-option"
              >
                <span className="font-bold">{x.name}</span>
                <span className="text-sm">{x.stock <= 0 ? "Sold out today" : formatNaira(x.priceKobo)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {!soldOut && v.stock <= 5 ? (
        <p className="font-bold text-chili" data-testid="low-stock">Only {v.stock} left in today&apos;s batch</p>
      ) : null}

      {soldOut ? (
        <NotifyMe variantId={v.id} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} max={max} />
          <button
            ref={mainBtn}
            type="button"
            onClick={addMain}
            disabled={pending}
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-bonnet px-6 font-bold text-char disabled:opacity-70"
            data-testid="add-to-bag"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : null}
            Add to bag · {formatNaira(v.priceKobo * qty)}
          </button>
        </div>
      )}

      {sides.length ? (
        <section aria-labelledby="sides-title" className="rounded-card bg-white p-4 md:p-5">
          <h2 id="sides-title" className="mb-3 font-sans text-body-lg font-bold">Complete your meal</h2>
          <ul className="flex flex-col divide-y divide-line">
            {sides.map((sd) => (
              <li key={sd.id} className="flex items-center gap-3 py-3">
                {sd.image ? (
                  <Image src={sd.image.url} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" />
                ) : null}
                <Link href={`/menu/${sd.slug}`} className="min-w-0 flex-1">
                  <span className="block font-bold">{sd.name}</span>
                  <span className="text-sm text-muted-foreground">{formatNaira(sd.fromKobo)}</span>
                </Link>
                {sd.variantId && sd.totalStock > 0 ? (
                  <button
                    type="button"
                    disabled={sideAdd.pending}
                    onClick={() => sideAdd.add([{ variantId: sd.variantId!, qty: 1 }], [{ id: String(sd.variantId), name: sd.name, priceKobo: sd.fromKobo }])}
                    aria-label={`Add ${sd.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-full bg-sand hover:bg-bonnet"
                  >
                    <Plus className="size-5" />
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Sold out</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Sticky mobile add-to-bag bar */}
      {!soldOut && showSticky ? (
        <>
          <BottomBarOffset px={76} />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] backdrop-blur md:hidden" data-testid="sticky-add">
            <button type="button" onClick={addMain} disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-bonnet font-bold text-char">
              {pending ? <Loader2 className="size-5 animate-spin" /> : null}
              Add {name}{variants.length > 1 ? ` (${v.name})` : ""} · {formatNaira(v.priceKobo * qty)}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
