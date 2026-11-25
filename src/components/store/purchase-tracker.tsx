"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires `purchase` once per order (deduped in localStorage). */
export function PurchaseTracker({ number, value, items }: { number: string; value: number; items: { item_id: string; item_name: string; price: number; quantity: number }[] }) {
  useEffect(() => {
    const key = `mb_purchase_${number}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track("purchase", { transaction_id: number, value, items });
  }, [number, value, items]);
  return null;
}
