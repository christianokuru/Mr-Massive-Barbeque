import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ComboEditor } from "@/components/admin/admin-forms";
import { formatNaira } from "@/lib/money";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Combos" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Combos() {
  await requireAdmin();
  const [combos, items, variants] = await Promise.all([
    db.select().from(s.combo).orderBy(asc(s.combo.sort), asc(s.combo.id)),
    db.select().from(s.comboItem),
    db
      .select({ id: s.productVariant.id, name: s.productVariant.name, priceKobo: s.productVariant.priceKobo, product: s.product.name })
      .from(s.productVariant)
      .innerJoin(s.product, eq(s.product.id, s.productVariant.productId))
      .where(eq(s.productVariant.active, true))
      .orderBy(asc(s.product.name), asc(s.productVariant.sort)),
  ]);
  const opts = variants.map((v) => ({ id: v.id, label: `${v.product} · ${v.name} (${formatNaira(v.priceKobo)})`, priceKobo: v.priceKobo }));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[36px] leading-none md:text-heading-lg">Combos</h1>
      <div className="grid gap-4 2xl:grid-cols-2">
        {combos.map((c) => (
          <ComboEditor
            key={c.id}
            variants={opts}
            initial={{ id: c.id, name: c.name, slug: c.slug, description: c.description, imageUrl: c.imageUrl, priceNaira: c.priceKobo / 100, active: c.active, items: items.filter((i) => i.comboId === c.id).map((i) => ({ variantId: i.variantId, qty: i.qty })) }}
          />
        ))}
      </div>
      <h2 className="mt-4 text-heading-sm">New combo</h2>
      <ComboEditor variants={opts} initial={{ name: "", slug: "", description: "", imageUrl: null, priceNaira: 0, active: true, items: [] }} />
    </div>
  );
}
