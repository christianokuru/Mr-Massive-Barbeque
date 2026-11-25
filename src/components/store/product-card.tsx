import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductCard as Card } from "@/server/catalogue";
import { Price, Stars } from "./bits";

/** Photo-first card: the photograph is the card (no box, no border). */
export function ProductCard({ p, priority = false, sizes }: { p: Card; priority?: boolean; sizes?: string }) {
  const soldOut = p.totalStock <= 0;
  const low = !soldOut && p.totalStock <= 5;
  return (
    <article className="group relative flex min-w-0 flex-col">
      <Link href={`/menu/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-image bg-sand">
        {p.image ? (
          <Image
            src={p.image.url}
            alt={p.image.alt}
            fill
            priority={priority}
            sizes={sizes ?? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-char px-3 py-1 text-xs font-bold tracking-wide text-cream uppercase">Sold out today</span>
          ) : low ? (
            <span className="rounded-full bg-bonnet px-3 py-1 text-xs font-bold tracking-wide text-char uppercase">Only {p.totalStock} left</span>
          ) : p.featured ? (
            <span className="rounded-full bg-bonnet px-3 py-1 text-xs font-bold tracking-wide text-char uppercase">Best seller</span>
          ) : null}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="min-w-0 font-sans text-subheading font-bold tracking-[0.01em]">
            <Link href={`/menu/${p.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {p.name}
            </Link>
          </h3>
          <Price kobo={p.fromKobo} compareKobo={p.compareAtKobo} from={!p.isSide} className="shrink-0 pt-0.5" />
        </div>
        <p className="line-clamp-2 text-muted-foreground">{p.shortDescription}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2">
          {p.rating.count > 0 ? <Stars value={p.rating.avg} count={p.rating.count} /> : <span />}
          <span className="inline-flex items-center gap-1 font-bold group-hover:underline">
            Order now <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Card[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
