import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/store/bits";
import { CartLines, FreeDeliveryBar, type CartLineView } from "@/components/store/cart-view";
import { ProductCard } from "@/components/store/product-card";
import { formatNaira } from "@/lib/money";
import { getCurrentCartLines } from "@/server/cart";
import { getAllProductCards, getFreeDeliveryFrom } from "@/server/catalogue";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

async function Bag() {
  const [lines, freeFrom, cards] = await Promise.all([getCurrentCartLines(), getFreeDeliveryFrom(), getAllProductCards()]);
  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-8" />}
        title="Your bag is empty"
        body="The grill is hot and waiting. Start with a best seller."
        action={<Link href="/menu" className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Browse the menu</Link>}
      />
    );
  }
  const view: CartLineView[] = lines.map((l) => ({
    itemId: l.itemId,
    href: l.kind === "variant" ? `/menu/${l.productSlug}` : `/combos/${l.comboSlug}`,
    name: l.name,
    size: l.size,
    imageUrl: l.imageUrl,
    unitKobo: l.unitKobo,
    qty: l.qty,
    stock: l.stock,
    available: l.available,
  }));
  const subtotal = lines.reduce((s, l) => s + l.unitKobo * l.qty, 0);
  const blocked = lines.some((l) => !l.available);
  const inBag = new Set(lines.flatMap((l) => (l.kind === "variant" ? [l.productId] : [])));
  const upsell = cards.filter((c) => c.isSide && !inBag.has(c.id) && c.totalStock > 0).slice(0, 2);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <CartLines lines={view} />
        {upsell.length ? (
          <section className="mt-10">
            <h2 className="mb-6 text-heading-sm">Add a side?</h2>
            <div className="grid grid-cols-2 gap-4">
              {upsell.map((p) => <ProductCard key={p.id} p={p} sizes="50vw" />)}
            </div>
          </section>
        ) : null}
      </div>
      <aside className="flex h-fit min-w-0 flex-col gap-4 rounded-card bg-white p-5 lg:sticky lg:top-28">
        <FreeDeliveryBar subtotalKobo={subtotal} thresholdKobo={freeFrom} />
        <dl className="flex justify-between text-body-lg">
          <dt>Subtotal</dt>
          <dd className="font-bold" data-testid="cart-subtotal">{formatNaira(subtotal)}</dd>
        </dl>
        <p className="text-sm text-muted-foreground">Delivery and discounts are calculated at checkout.</p>
        {blocked ? (
          <p className="rounded-xl bg-[#f6d6d0] p-3 text-sm font-bold text-[#7a1a0c]">Some items are sold out or low. Update your bag to continue.</p>
        ) : null}
        <Link
          href={blocked ? "#" : "/checkout"}
          aria-disabled={blocked}
          className={`inline-flex h-13 items-center justify-center gap-2 rounded-full bg-bonnet font-bold text-char ${blocked ? "pointer-events-none opacity-50" : ""}`}
          data-testid="checkout-link"
        >
          Checkout <ArrowRight className="size-4" />
        </Link>
        <Link href="/menu" className="text-center text-sm font-bold underline">Keep shopping</Link>
      </aside>
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="mb-8 text-[length:clamp(32px,9vw,48px)] leading-[0.88] md:text-display">Your bag</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-sand" />}>
        <Bag />
      </Suspense>
    </div>
  );
}
