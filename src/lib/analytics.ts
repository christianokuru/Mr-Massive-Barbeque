"use client";

/** GA4 / Meta ecommerce events. No-ops until consent has loaded the scripts. */
type Item = { item_id: string; item_name: string; item_variant?: string; price: number; quantity: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function track(
  event: "view_item" | "add_to_cart" | "begin_checkout" | "purchase",
  data: { value: number; items: Item[]; transaction_id?: string },
) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, { currency: "NGN", ...data });
  const fb = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase" }[event];
  window.fbq?.("track", fb, { currency: "NGN", value: data.value });
}
