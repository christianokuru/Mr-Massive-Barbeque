import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, asc, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ProductRowActions, StockInput } from "@/components/admin/products-ui";
import { EmptyState, Pill } from "@/components/store/bits";
import { escapeLike } from "@/lib/csv";
import { formatNaira } from "@/lib/money";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const status = typeof sp.status === "string" && ["draft", "active", "archived"].includes(sp.status) ? sp.status : "";
  const cat = typeof sp.category === "string" && /^\d+$/.test(sp.category) ? Number(sp.category) : null;

  const where: SQL[] = [];
  if (q) where.push(ilike(s.product.name, `%${escapeLike(q)}%`));
  if (status) where.push(eq(s.product.status, status));
  else where.push(inArray(s.product.status, ["draft", "active"]));
  if (cat) where.push(eq(s.product.categoryId, cat));

  const [products, categories] = await Promise.all([
    db
      .select({ p: s.product, category: s.category.name })
      .from(s.product)
      .leftJoin(s.category, eq(s.category.id, s.product.categoryId))
      .where(and(...where))
      .orderBy(asc(s.product.name)),
    db.select().from(s.category).orderBy(asc(s.category.sort)),
  ]);
  const ids = products.map((x) => x.p.id);
  const [variants, images] = ids.length
    ? await Promise.all([
        db.select().from(s.productVariant).where(and(inArray(s.productVariant.productId, ids), eq(s.productVariant.active, true))).orderBy(asc(s.productVariant.sort)),
        db.select().from(s.productImage).where(inArray(s.productImage.productId, ids)).orderBy(asc(s.productImage.sort), asc(s.productImage.id)),
      ])
    : [[], []];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[36px] leading-none md:text-heading-lg">Products</h1>
        <Link href="/admin/products/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-bonnet px-5 font-bold"><Plus className="size-4" /> New product</Link>
      </div>
      <form className="flex flex-wrap gap-3" action="/admin/products">
        <input name="q" defaultValue={q} placeholder="Search products" className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white px-4 sm:max-w-sm" />
        <select name="status" defaultValue={status} className="h-11 rounded-full border border-line bg-white px-4">
          <option value="">Active + drafts</option><option value="active">Active</option><option value="draft">Drafts</option><option value="archived">Archived</option>
        </select>
        <select name="category" defaultValue={cat ?? ""} className="h-11 rounded-full border border-line bg-white px-4">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="h-11 rounded-full bg-char px-5 font-bold text-cream">Filter</button>
      </form>
      {products.length ? (
        <ul className="flex flex-col gap-3" data-testid="products-list">
          {products.map(({ p, category }) => {
            const img = images.find((i) => i.productId === p.id);
            const vs = variants.filter((v) => v.productId === p.id);
            return (
              <li key={p.id} className="flex flex-col gap-3 rounded-card bg-white p-4 md:flex-row md:items-center" data-testid="product-row">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {img ? <Image src={img.url} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="size-14 shrink-0 rounded-xl bg-sand" />}
                  <div className="min-w-0">
                    <Link href={`/admin/products/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {category ?? "Uncategorised"} · {vs.length ? `from ${formatNaira(Math.min(...vs.map((v) => v.priceKobo)))}` : "no sizes"}
                      <Pill tone={p.status === "active" ? "good" : p.status === "draft" ? "warn" : "neutral"}>{p.status}</Pill>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vs.map((v) => <StockInput key={v.id} variantId={v.id} stock={v.stock} label={v.name} />)}
                </div>
                <ProductRowActions id={p.id} status={p.status} />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No products found" body="Change the filters or create a product." />
      )}
    </div>
  );
}
