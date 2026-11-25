import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ImageManager, ProductForm, type ProductFormValue } from "@/components/admin/products-ui";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Edit product" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function EditProduct({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [categories, occasions] = await Promise.all([
    db.select({ id: s.category.id, name: s.category.name }).from(s.category).orderBy(asc(s.category.sort)),
    db.select({ id: s.occasion.id, name: s.occasion.name }).from(s.occasion).orderBy(asc(s.occasion.sort)),
  ]);

  let initial: ProductFormValue;
  let images: { id: number; url: string; alt: string }[] = [];
  if (id === "new") {
    initial = { name: "", slug: "", shortDescription: "", description: "", categoryId: null, status: "draft", featured: false, isSide: false, spiceLevel: 1, reorderDays: 7, seoTitle: "", seoDescription: "", occasionIds: [], variants: [{ name: "Regular", sku: "", priceNaira: 0, compareAtNaira: null, stock: 0, active: true }] };
  } else {
    if (!/^\d+$/.test(id)) notFound();
    const [p] = await db.select().from(s.product).where(eq(s.product.id, Number(id)));
    if (!p) notFound();
    const [variants, occ, imgs] = await Promise.all([
      db.select().from(s.productVariant).where(eq(s.productVariant.productId, p.id)).orderBy(asc(s.productVariant.sort)),
      db.select().from(s.productOccasion).where(eq(s.productOccasion.productId, p.id)),
      db.select().from(s.productImage).where(eq(s.productImage.productId, p.id)).orderBy(asc(s.productImage.sort), asc(s.productImage.id)),
    ]);
    images = imgs.map((i) => ({ id: i.id, url: i.url, alt: i.alt }));
    initial = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      description: p.description,
      categoryId: p.categoryId,
      status: p.status as ProductFormValue["status"],
      featured: p.featured,
      isSide: p.isSide,
      spiceLevel: p.spiceLevel,
      reorderDays: p.reorderDays,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      occasionIds: occ.map((o) => o.occasionId),
      variants: variants.filter((v) => v.active || variants.length === 1).map((v) => ({ id: v.id, name: v.name, sku: v.sku, priceNaira: v.priceKobo / 100, compareAtNaira: v.compareAtKobo ? v.compareAtKobo / 100 : null, stock: v.stock, active: v.active })),
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/products" className="inline-flex w-fit items-center gap-1 text-sm font-bold"><ChevronLeft className="size-4" /> Products</Link>
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">{initial.id ? initial.name : "New product"}</h1>
      {initial.id ? <ImageManager productId={initial.id} images={images} /> : <p className="text-sm text-muted-foreground">Create the product first, then add photos.</p>}
      <ProductForm initial={initial} categories={categories} occasions={occasions} />
    </div>
  );
}
