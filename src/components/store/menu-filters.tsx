"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { slug: string; name: string };

const SORTS = [
  { v: "featured", l: "Featured" },
  { v: "price-asc", l: "Price: low to high" },
  { v: "price-desc", l: "Price: high to low" },
  { v: "rating", l: "Top rated" },
  { v: "new", l: "Newest" },
];

export function MenuFilters({
  categories,
  occasions,
  activeCategory,
  activeOccasion,
  basePath = "/menu",
}: {
  categories: Opt[];
  occasions: Opt[];
  activeCategory?: string;
  activeOccasion?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get("focus") === "search") input.current?.focus();
  }, [params]);

  // Debounced search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      const current = params.get("q") ?? "";
      if (q.trim() === current) return;
      const next = new URLSearchParams(params);
      next.delete("focus");
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [q, params, path, router]);

  function setSort(v: string) {
    const next = new URLSearchParams(params);
    if (v === "featured") next.delete("sort");
    else next.set("sort", v);
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const qs = (extra?: string) => {
    const keep = new URLSearchParams();
    if (params.get("q")) keep.set("q", params.get("q")!);
    if (params.get("sort")) keep.set("sort", params.get("sort")!);
    const s = keep.toString();
    return extra ? `${extra}${s ? `?${s}` : ""}` : `${basePath}${s ? `?${s}` : ""}`;
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold tracking-[0.04em] whitespace-nowrap transition",
      active ? "border-oxblood bg-oxblood text-cream" : "border-line bg-white hover:border-oxblood",
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex h-12 items-center gap-2 rounded-full border border-line bg-white px-4 md:w-96 focus-within:ring-3 focus-within:ring-ring/40">
          <Search className="size-5 text-ash" />
          <span className="sr-only">Search the menu</span>
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catfish, chicken, plantain…"
            className="min-w-0 flex-1 bg-transparent outline-none"
            data-testid="menu-search"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="inline-flex size-8 items-center justify-center rounded-full hover:bg-sand">
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-bold">Sort</span>
          <select
            value={params.get("sort") ?? "featured"}
            onChange={(e) => setSort(e.target.value)}
            className="h-11 rounded-full border border-line bg-white px-4"
            data-testid="menu-sort"
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Link href={qs()} className={chip(!activeCategory && !activeOccasion)}>
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={qs(`/category/${c.slug}`)} className={chip(activeCategory === c.slug)}>
            {c.name}
          </Link>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden />
        {occasions.map((o) => (
          <Link key={o.slug} href={qs(`/occasion/${o.slug}`)} className={chip(activeOccasion === o.slug)}>
            {o.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
