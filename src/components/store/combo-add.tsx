"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAddToBag } from "@/hooks/use-add-to-bag";
import { formatNaira } from "@/lib/money";
import { QtyStepper } from "./buy-box";

export function ComboAdd({ comboId, name, priceKobo, available }: { comboId: number; name: string; priceKobo: number; available: boolean }) {
  const [qty, setQty] = useState(1);
  const { add, pending } = useAddToBag();
  if (!available) return <p className="rounded-2xl bg-sand p-4 font-bold">Sold out today. Back tomorrow.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QtyStepper value={qty} onChange={setQty} max={10} />
      <button
        type="button"
        disabled={pending}
        onClick={() => add([{ comboId, qty }], [{ id: `combo-${comboId}`, name, priceKobo }])}
        className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-bonnet px-6 font-bold text-char"
        data-testid="add-combo"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : null}
        Add combo · {formatNaira(priceKobo * qty)}
      </button>
    </div>
  );
}
