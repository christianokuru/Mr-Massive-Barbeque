"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { addToBag } from "@/app/actions/cart";
import { track } from "@/lib/analytics";

type Item = { variantId?: number; comboId?: number; qty: number };
type Meta = { id: string; name: string; variant?: string; priceKobo: number };

/** Shared add-to-bag: one request at a time (triple taps can't double-add), toast + analytics. */
export function useAddToBag() {
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const router = useRouter();

  function add(items: Item[], meta?: Meta[]) {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      try {
        const res = await addToBag(items);
        if (res.ok) {
          toast.success(res.message ?? "Added to your bag", {
            action: { label: "View bag", onClick: () => router.push("/cart") },
          });
          if (meta?.length) {
            track("add_to_cart", {
              value: meta.reduce((s, m, i) => s + (m.priceKobo / 100) * (items[i]?.qty ?? 1), 0),
              items: meta.map((m, i) => ({
                item_id: m.id,
                item_name: m.name,
                item_variant: m.variant,
                price: m.priceKobo / 100,
                quantity: items[i]?.qty ?? 1,
              })),
            });
          }
        } else toast.error(res.error);
      } finally {
        busy.current = false;
      }
    });
  }

  return { add, pending };
}
