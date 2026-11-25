"use client";

import { Loader2, Plus } from "lucide-react";
import { useAddToBag } from "@/hooks/use-add-to-bag";
import { cn } from "@/lib/utils";

export function QuickAdd({
  variantId,
  comboId,
  name,
  priceKobo,
  className,
  label,
}: {
  variantId?: number;
  comboId?: number;
  name: string;
  priceKobo: number;
  className?: string;
  label?: string;
}) {
  const { add, pending } = useAddToBag();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        add([variantId ? { variantId, qty: 1 } : { comboId, qty: 1 }], [
          { id: String(variantId ?? `combo-${comboId}`), name, priceKobo },
        ]);
      }}
      disabled={pending}
      aria-label={label ?? `Add ${name} to bag`}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full bg-bonnet text-char shadow-[var(--shadow-lift)] transition hover:scale-105 disabled:opacity-70",
        className,
      )}
    >
      {pending ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
    </button>
  );
}
