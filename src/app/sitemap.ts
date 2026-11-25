import type { MetadataRoute } from "next";
import { ARTICLES } from "@/content/articles";
import { siteConfig } from "@/lib/site";
import { getActiveProductSlugs, getCategories, getCombos, getOccasions } from "@/server/catalogue";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [products, categories, occasions, combos] = await Promise.all([getActiveProductSlugs(), getCategories(), getOccasions(), getCombos()]);
  const staticPages = ["", "/menu", "/combos", "/quiz", "/journal", "/about", "/faq", "/shipping", "/returns", "/contact", "/track", "/privacy", "/terms"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : p === "/menu" ? 0.9 : 0.5 })),
    ...products.map((p) => ({ url: `${base}/menu/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...occasions.map((o) => ({ url: `${base}/occasion/${o.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...combos.map((c) => ({ url: `${base}/combos/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...ARTICLES.map((a) => ({ url: `${base}/journal/${a.slug}`, lastModified: new Date(a.date), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
