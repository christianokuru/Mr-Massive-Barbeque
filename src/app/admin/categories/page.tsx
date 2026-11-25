import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CategoryRow } from "@/components/admin/admin-forms";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Categories" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Categories() {
  await requireAdmin();
  const rows = await db
    .select({ c: s.category, products: count(s.product.id) })
    .from(s.category)
    .leftJoin(s.product, eq(s.product.categoryId, s.category.id))
    .groupBy(s.category.id)
    .orderBy(asc(s.category.sort));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Categories</h1>
      {rows.map(({ c, products }) => (
        <CategoryRow key={c.id} cat={{ id: c.id, name: c.name, slug: c.slug, description: c.description, sort: c.sort, products }} />
      ))}
      <h2 className="mt-4 text-heading-sm">Add a category</h2>
      <CategoryRow cat={{ name: "", slug: "", description: "", sort: rows.length }} />
    </div>
  );
}
