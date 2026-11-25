import "server-only";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { escapeLike } from "@/lib/csv";

/**
 * Cached catalogue reads. Every function is tagged `catalogue` (plus a
 * finer tag) so admin mutations can invalidate with updateTag/revalidateTag.
 */

export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  categorySlug: string | null;
  categoryName: string | null;
  spiceLevel: number;
  featured: boolean;
  isSide: boolean;
  image: { url: string; alt: string } | null;
  fromKobo: number;
  compareAtKobo: number | null;
  /** Cheapest active variant (used for one-tap add on single-size items). */
  defaultVariantId: number | null;
  totalStock: number;
  rating: { avg: number; count: number };
  createdAt: Date;
};

export type ProductDetail = ProductCard & {
  description: string;
  reorderDays: number;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { id: number; url: string; alt: string }[];
  variants: { id: number; name: string; sku: string; priceKobo: number; compareAtKobo: number | null; stock: number }[];
  occasions: { slug: string; name: string }[];
  sides: ProductCard[];
  reviews: { id: number; authorName: string; rating: number; spiceLevel: string; title: string; body: string; createdAt: Date }[];
  updatedAt: Date;
};

async function loadCards(ids?: number[]): Promise<ProductCard[]> {
  const where = ids
    ? and(eq(s.product.status, "active"), inArray(s.product.id, ids.length ? ids : [-1]))
    : eq(s.product.status, "active");

  const rows = await db
    .select({
      id: s.product.id,
      slug: s.product.slug,
      name: s.product.name,
      shortDescription: s.product.shortDescription,
      categorySlug: s.category.slug,
      categoryName: s.category.name,
      spiceLevel: s.product.spiceLevel,
      featured: s.product.featured,
      isSide: s.product.isSide,
      createdAt: s.product.createdAt,
      fromKobo: sql<number>`coalesce(min(${s.productVariant.priceKobo}) filter (where ${s.productVariant.active}), 0)`.mapWith(Number),
      compareAtKobo: sql<number | null>`min(${s.productVariant.compareAtKobo}) filter (where ${s.productVariant.active})`,
      totalStock: sql<number>`coalesce(sum(${s.productVariant.stock}) filter (where ${s.productVariant.active}), 0)`.mapWith(Number),
      defaultVariantId: sql<number | null>`(array_agg(${s.productVariant.id} order by ${s.productVariant.priceKobo}, ${s.productVariant.id}) filter (where ${s.productVariant.active}))[1]`,
    })
    .from(s.product)
    .leftJoin(s.category, eq(s.category.id, s.product.categoryId))
    .leftJoin(s.productVariant, eq(s.productVariant.productId, s.product.id))
    .where(where)
    .groupBy(s.product.id, s.category.id);

  if (!rows.length) return [];
  const pids = rows.map((r) => r.id);
  const [images, ratings] = await Promise.all([
    db
      .select({ productId: s.productImage.productId, url: s.productImage.url, alt: s.productImage.alt, sort: s.productImage.sort })
      .from(s.productImage)
      .where(inArray(s.productImage.productId, pids))
      .orderBy(asc(s.productImage.sort), asc(s.productImage.id)),
    db
      .select({
        productId: s.review.productId,
        avg: sql<number>`avg(${s.review.rating})`.mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(s.review)
      .where(and(inArray(s.review.productId, pids), eq(s.review.status, "approved")))
      .groupBy(s.review.productId),
  ]);

  return rows.map((r) => {
    const img = images.find((i) => i.productId === r.id);
    const rt = ratings.find((x) => x.productId === r.id);
    return {
      ...r,
      compareAtKobo: r.compareAtKobo ? Number(r.compareAtKobo) : null,
      defaultVariantId: r.defaultVariantId ? Number(r.defaultVariantId) : null,
      image: img ? { url: img.url, alt: img.alt || r.name } : null,
      rating: { avg: rt ? Math.round(rt.avg * 10) / 10 : 0, count: rt?.count ?? 0 },
    };
  });
}

export async function getAllProductCards(): Promise<ProductCard[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("hours");
  const cards = await loadCards();
  return cards.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(a.isSide) - Number(b.isSide) || a.name.localeCompare(b.name));
}

export type MenuFilter = {
  category?: string;
  occasion?: string;
  q?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "rating" | "new";
};

export async function getMenu(filter: MenuFilter): Promise<ProductCard[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("hours");
  let cards = await loadCards();
  if (filter.category) cards = cards.filter((c) => c.categorySlug === filter.category);
  if (filter.occasion) {
    const ids = await db
      .select({ id: s.productOccasion.productId })
      .from(s.productOccasion)
      .innerJoin(s.occasion, eq(s.occasion.id, s.productOccasion.occasionId))
      .where(eq(s.occasion.slug, filter.occasion));
    const set = new Set(ids.map((i) => i.id));
    cards = cards.filter((c) => set.has(c.id));
  }
  if (filter.q) {
    const q = `%${escapeLike(filter.q.trim().slice(0, 60))}%`;
    const hits = await db
      .select({ id: s.product.id })
      .from(s.product)
      .leftJoin(s.category, eq(s.category.id, s.product.categoryId))
      .where(
        and(
          eq(s.product.status, "active"),
          or(ilike(s.product.name, q), ilike(s.product.shortDescription, q), ilike(s.category.name, q)),
        ),
      );
    const set = new Set(hits.map((h) => h.id));
    cards = cards.filter((c) => set.has(c.id));
  }
  switch (filter.sort) {
    case "price-asc":
      return cards.sort((a, b) => a.fromKobo - b.fromKobo);
    case "price-desc":
      return cards.sort((a, b) => b.fromKobo - a.fromKobo);
    case "rating":
      return cards.sort((a, b) => b.rating.avg - a.rating.avg || b.rating.count - a.rating.count);
    case "new":
      return cards.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    default:
      return cards.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(a.isSide) - Number(b.isSide) || a.name.localeCompare(b.name));
  }
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag("catalogue", `product:${slug}`);
  cacheLife("hours");
  const [p] = await db.select().from(s.product).where(and(eq(s.product.slug, slug), eq(s.product.status, "active")));
  if (!p) return null;
  const [card] = await loadCards([p.id]);
  const [images, variants, occasions, sideIds, reviews] = await Promise.all([
    db.select().from(s.productImage).where(eq(s.productImage.productId, p.id)).orderBy(asc(s.productImage.sort), asc(s.productImage.id)),
    db
      .select()
      .from(s.productVariant)
      .where(and(eq(s.productVariant.productId, p.id), eq(s.productVariant.active, true)))
      .orderBy(asc(s.productVariant.priceKobo), asc(s.productVariant.sort)),
    db
      .select({ slug: s.occasion.slug, name: s.occasion.name })
      .from(s.productOccasion)
      .innerJoin(s.occasion, eq(s.occasion.id, s.productOccasion.occasionId))
      .where(eq(s.productOccasion.productId, p.id)),
    db.select({ id: s.productSide.sideProductId }).from(s.productSide).where(eq(s.productSide.productId, p.id)),
    db
      .select({
        id: s.review.id,
        authorName: s.review.authorName,
        rating: s.review.rating,
        spiceLevel: s.review.spiceLevel,
        title: s.review.title,
        body: s.review.body,
        createdAt: s.review.createdAt,
      })
      .from(s.review)
      .where(and(eq(s.review.productId, p.id), eq(s.review.status, "approved")))
      .orderBy(sql`${s.review.createdAt} desc`)
      .limit(20),
  ]);
  const sides = sideIds.length ? await loadCards(sideIds.map((x) => x.id)) : [];
  return {
    ...card,
    description: p.description,
    reorderDays: p.reorderDays,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    updatedAt: p.updatedAt,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt || p.name })),
    variants: variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      priceKobo: v.priceKobo,
      compareAtKobo: v.compareAtKobo,
      stock: v.stock,
    })),
    occasions,
    sides,
    reviews,
  };
}

export async function getActiveProductSlugs() {
  "use cache";
  cacheTag("catalogue");
  const rows = await db.select({ slug: s.product.slug, updatedAt: s.product.updatedAt }).from(s.product).where(eq(s.product.status, "active"));
  return rows;
}

export async function getCategories() {
  "use cache";
  cacheTag("catalogue");
  cacheLife("days");
  return db.select().from(s.category).orderBy(asc(s.category.sort), asc(s.category.name));
}

export async function getOccasions() {
  "use cache";
  cacheTag("catalogue");
  cacheLife("days");
  return db.select().from(s.occasion).orderBy(asc(s.occasion.sort));
}

export type ComboCard = {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceKobo: number;
  valueKobo: number;
  available: boolean;
  items: { variantId: number; qty: number; productName: string; productSlug: string; size: string; priceKobo: number; stock: number }[];
};

export async function getCombos(): Promise<ComboCard[]> {
  "use cache";
  cacheTag("catalogue", "combos");
  cacheLife("hours");
  const combos = await db.select().from(s.combo).where(eq(s.combo.active, true)).orderBy(asc(s.combo.sort));
  if (!combos.length) return [];
  const items = await db
    .select({
      comboId: s.comboItem.comboId,
      variantId: s.comboItem.variantId,
      qty: s.comboItem.qty,
      productName: s.product.name,
      productSlug: s.product.slug,
      productStatus: s.product.status,
      size: s.productVariant.name,
      priceKobo: s.productVariant.priceKobo,
      stock: s.productVariant.stock,
      active: s.productVariant.active,
    })
    .from(s.comboItem)
    .innerJoin(s.productVariant, eq(s.productVariant.id, s.comboItem.variantId))
    .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
    .where(inArray(s.comboItem.comboId, combos.map((c) => c.id)));
  return combos.map((c) => {
    const its = items.filter((i) => i.comboId === c.id);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageUrl: c.imageUrl,
      priceKobo: c.priceKobo,
      valueKobo: its.reduce((sum, i) => sum + i.priceKobo * i.qty, 0),
      available: its.length > 0 && its.every((i) => i.active && i.productStatus === "active" && i.stock >= i.qty),
      items: its.map(({ variantId, qty, productName, productSlug, size, priceKobo, stock }) => ({
        variantId,
        qty,
        productName,
        productSlug,
        size,
        priceKobo,
        stock,
      })),
    };
  });
}

export async function getCombo(slug: string) {
  const all = await getCombos();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getZones() {
  "use cache";
  cacheTag("catalogue", "zones");
  cacheLife("days");
  return db.select().from(s.shippingZone).where(eq(s.shippingZone.active, true)).orderBy(asc(s.shippingZone.sort));
}

export type StoreSettings = {
  whatsappNumber: string | null;
  bannerDesktop: string | null;
  bannerMobile: string | null;
};

export async function getSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const [row] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.id, 1));
  return {
    whatsappNumber: row?.whatsappNumber ?? null,
    bannerDesktop: row?.bannerDesktop ?? null,
    bannerMobile: row?.bannerMobile ?? null,
  };
}

/** Lowest free-delivery threshold among zones (for the announcement + cart bar). */
export async function getFreeDeliveryFrom() {
  const zones = await getZones();
  const t = zones.map((z) => z.freeOverKobo).filter((x): x is number => !!x);
  return t.length ? Math.min(...t) : null;
}
