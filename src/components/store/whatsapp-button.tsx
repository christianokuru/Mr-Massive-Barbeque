"use client";

import { MessageCircle } from "lucide-react";

/** Free wa.me link. On product pages it pre-fills the product name. */
export function WhatsAppButton({ number }: { number: string }) {
  function open() {
    const product = document.querySelector<HTMLElement>("[data-wa-product]")?.dataset.waProduct;
    const text = product
      ? `Hi Massive Barbeque! I'd like to order ${product}.`
      : "Hi Massive Barbeque! I'd like to place an order.";
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Chat with us on WhatsApp"
      data-testid="whatsapp-button"
      className="fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-lift)] transition hover:scale-105 print:hidden"
      style={{ bottom: "calc(16px + var(--bottom-bar, 0px) + env(safe-area-inset-bottom, 0px))" }}
    >
      <MessageCircle className="size-7" />
    </button>
  );
}
