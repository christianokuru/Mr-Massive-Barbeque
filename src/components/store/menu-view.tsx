import Link from "next/link";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { EmptyState } from "./bits";
import { MenuFilters } from "./menu-filters";
import { ProductGrid } from "./product-card";
import { getCategories, getMenu, getOccasions, type MenuFilter } from "@/server/catalogue";

type SP = Promise<Record<string, string | string[] | undefined>>;

const SORTS = new Set(["featured", "price-asc", "price-desc", "rating", "new"]);

async function Results({ searchParams, category, occasion }: { searchParams: SP; category?: string; occasion?: string }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const sort = typeof sp.sort === "string" && SORTS.has(sp.sort) ? (sp.sort as MenuFilter["sort"]) : "featured";
  const products = await getMenu({ category, occasion, q, sort });
  if (!products.length) {
    return (
      <EmptyState
        icon={<SearchX className="size-8" />}
        title={q ? `Nothing matches “${q}”` : "Nothing here yet"}
        body="Try another search, or browse the full menu."
        action={
          <Link href="/menu" className="inline-flex h-11 items-center rounded-full bg-bonnet px-6 font-bold">
            Browse the menu
          </Link>
        }
      />
    );
  }
  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground" data-testid="result-count">
        {products.length} {products.length === 1 ? "item" : "items"}
      </p>
      <ProductGrid products={products} priorityCount={3} />
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-square animate-pulse rounded-image bg-sand" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-sand" />
          <div className="h-4 w-full animate-pulse rounded bg-sand" />
        </div>
      ))}
    </div>
  );
}

export async function MenuView({
  title,
  eyebrow,
  intro,
  searchParams,
  category,
  occasion,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  searchParams: SP;
  category?: string;
  occasion?: string;
}) {
  const [categories, occasions] = await Promise.all([getCategories(), getOccasions()]);
  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="text-[48px] leading-[0.88] md:text-display">{title}</h1>
      <p className="mt-4 max-w-2xl text-body-lg text-smoke">{intro}</p>
      <div className="mt-8 mb-10">
        <Suspense fallback={<div className="h-28" />}>
          <MenuFilters
            categories={categories.map(({ slug, name }) => ({ slug, name }))}
            occasions={occasions.map(({ slug, name }) => ({ slug, name }))}
            activeCategory={category}
            activeOccasion={occasion}
          />
        </Suspense>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} category={category} occasion={occasion} />
      </Suspense>
    </div>
  );
}
