import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

type Kind = "menu" | "category" | "occasion" | "combos";
const TTL = 60_000;
let cache: { at: number; sets: Record<Kind, Set<string>> } | null = null;

async function load() {
  const [products, categories, occasions, combos] = await Promise.all([
    db.select({ slug: s.product.slug }).from(s.product).where(eq(s.product.status, "active")),
    db.select({ slug: s.category.slug }).from(s.category),
    db.select({ slug: s.occasion.slug }).from(s.occasion),
    db.select({ slug: s.combo.slug }).from(s.combo).where(eq(s.combo.active, true)),
  ]);
  cache = {
    at: Date.now(),
    sets: {
      menu: new Set(products.map((x) => x.slug)),
      category: new Set(categories.map((x) => x.slug)),
      occasion: new Set(occasions.map((x) => x.slug)),
      combos: new Set(combos.map((x) => x.slug)),
    },
  };
  return cache;
}

/**
 * Used by the proxy to send real 404s for unknown catalogue URLs before streaming.
 * Cached per instance for a minute; a miss re-checks the DB once so newly added items never 404.
 */
export async function slugExists(kind: Kind, slug: string) {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return false;
  try {
    const c = cache && Date.now() - cache.at < TTL ? cache : await load();
    if (c.sets[kind].has(slug)) return true;
    if (Date.now() - c.at < 2_000) return false; // just refreshed
    return (await load()).sets[kind].has(slug);
  } catch {
    return true; // never block real pages on a lookup failure; the page itself still 404s
  }
}
