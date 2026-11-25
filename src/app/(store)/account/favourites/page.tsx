import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/store/bits";
import { ProductGrid } from "@/components/store/product-card";
import { myFavourites } from "@/server/account";
import { getAllProductCards } from "@/server/catalogue";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function FavouritesPage() {
  const session = await requireUser("/account/favourites");
  const [ids, cards] = await Promise.all([myFavourites(session.user.id), getAllProductCards()]);
  const saved = cards.filter((c) => ids.includes(c.id));
  return (
    <div>
      <h1 className="mb-8 text-[44px] leading-[0.9] md:text-heading-lg">Saved</h1>
      {saved.length ? (
        <ProductGrid products={saved} />
      ) : (
        <EmptyState icon={<Heart className="size-8" />} title="Nothing saved yet" body="Tap the heart on any item to keep it here." action={<Link href="/menu" className="inline-flex h-11 items-center rounded-full bg-bonnet px-5 font-bold">Browse the menu</Link>} />
      )}
    </div>
  );
}
