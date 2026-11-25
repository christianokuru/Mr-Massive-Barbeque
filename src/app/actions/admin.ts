"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { normalizeWhatsapp } from "@/lib/validation";
import { changeOrderStatus, notifyBackInStock } from "@/server/orders";
import { requireAdmin } from "@/server/session";
import { deleteImage as deleteStoredImage, isOurMediaUrl } from "@/server/storage";

export type AdminResult = { ok: true; message?: string; id?: number } | { ok: false; error: string };

const ok = (message?: string, id?: number): AdminResult => ({ ok: true, message, id });
const fail = (error: string): AdminResult => ({ ok: false, error });

function zodFail(err: unknown): AdminResult {
  if (err instanceof z.ZodError) return fail(err.issues[0]?.message ?? "Check the form.");
  if (err instanceof Error && /duplicate key/.test(err.message)) return fail("That slug, SKU or code is already in use.");
  console.warn("[admin]", err);
  return fail("Something went wrong. Please try again.");
}

function bust() {
  updateTag("catalogue");
  refresh();
}

/* ───────────── Orders ───────────── */

const statusSchema = z.enum(ORDER_STATUSES);

export async function updateOrderStatus(orderId: number, to: OrderStatus, tracking?: string | null, note?: string | null): Promise<AdminResult> {
  const session = await requireAdmin();
  const res = await changeOrderStatus(z.coerce.number().int().parse(orderId), statusSchema.parse(to), {
    tracking: tracking ? String(tracking).slice(0, 120) : null,
    note: note ? String(note).slice(0, 300) : null,
    actor: session.user.email,
  });
  refresh();
  return res.ok ? ok(res.changed ? "Status updated" : "No change") : fail(res.error);
}

/** Bulk update reuses the exact single-order rules (state machine, tracking required, restocks). */
export async function bulkUpdateStatus(orderIds: number[], to: "preparing" | "delivered"): Promise<AdminResult> {
  const session = await requireAdmin();
  const ids = z.array(z.coerce.number().int().positive()).min(1).max(100).parse(orderIds);
  const target = z.enum(["preparing", "delivered"]).parse(to);
  let done = 0;
  const errors: string[] = [];
  for (const id of ids) {
    const res = await changeOrderStatus(id, target, { actor: session.user.email });
    if (res.ok) done++;
    else errors.push(res.error);
  }
  refresh();
  if (!done) return fail(errors[0] ?? "No orders could be updated.");
  return ok(`${done} order${done === 1 ? "" : "s"} updated${errors.length ? `, ${errors.length} skipped` : ""}`);
}

/* ───────────── Products ───────────── */

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and dashes.").max(80);
const naira = z.coerce.number().positive("Price must be above ₦0.").max(10_000_000);

const productSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(80),
  slug,
  shortDescription: z.string().trim().max(200).default(""),
  description: z.string().trim().max(3000).default(""),
  categoryId: z.coerce.number().int().positive().nullable(),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
  isSide: z.boolean(),
  spiceLevel: z.coerce.number().int().min(0).max(3),
  reorderDays: z.coerce.number().int().min(1).max(90),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  occasionIds: z.array(z.coerce.number().int().positive()).max(20),
  variants: z
    .array(
      z.object({
        id: z.coerce.number().int().positive().optional(),
        name: z.string().trim().min(1).max(40),
        sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,48}$/, "SKU: 3–48 letters, numbers or dashes."),
        priceNaira: naira,
        compareAtNaira: z.coerce.number().nonnegative().nullable().optional(),
        stock: z.coerce.number().int().min(0).max(100_000),
        active: z.boolean(),
      }),
    )
    .min(1, "Add at least one size."),
});

export async function saveProduct(input: z.input<typeof productSchema>): Promise<AdminResult> {
  await requireAdmin();
  try {
    const d = productSchema.parse(input);
    for (const v of d.variants) {
      if (v.compareAtNaira && v.compareAtNaira <= v.priceNaira) throw new z.ZodError([{ code: "custom", path: ["variants"], message: `"Was" price for ${v.name} must be higher than the price.`, input: v }]);
    }
    const restocked: number[] = [];
    const id = await db.transaction(async (tx) => {
      const values = {
        name: d.name,
        slug: d.slug,
        shortDescription: d.shortDescription,
        description: d.description,
        categoryId: d.categoryId,
        status: d.status,
        featured: d.featured,
        isSide: d.isSide,
        spiceLevel: d.spiceLevel,
        reorderDays: d.reorderDays,
        seoTitle: d.seoTitle || null,
        seoDescription: d.seoDescription || null,
      };
      let productId: number;
      if (d.id) {
        await tx.update(s.product).set(values).where(eq(s.product.id, d.id));
        productId = d.id;
      } else {
        const [row] = await tx.insert(s.product).values(values).returning({ id: s.product.id });
        productId = row.id;
      }
      const existing = await tx.select().from(s.productVariant).where(eq(s.productVariant.productId, productId));
      const keep = d.variants.filter((v) => v.id).map((v) => v.id!);
      // Variants removed from the form are deactivated (orders and combos may reference them).
      const removed = existing.filter((e) => !keep.includes(e.id)).map((e) => e.id);
      if (removed.length) await tx.update(s.productVariant).set({ active: false }).where(inArray(s.productVariant.id, removed));
      for (const [i, v] of d.variants.entries()) {
        const row = {
          productId,
          name: v.name,
          sku: v.sku,
          priceKobo: Math.round(v.priceNaira * 100),
          compareAtKobo: v.compareAtNaira ? Math.round(v.compareAtNaira * 100) : null,
          stock: v.stock,
          sort: i,
          active: v.active,
        };
        const prev = existing.find((e) => e.id === v.id);
        if (prev) {
          await tx.update(s.productVariant).set(row).where(and(eq(s.productVariant.id, prev.id), eq(s.productVariant.productId, productId)));
          if (prev.stock === 0 && v.stock > 0) restocked.push(prev.id);
        } else await tx.insert(s.productVariant).values(row);
      }
      await tx.delete(s.productOccasion).where(eq(s.productOccasion.productId, productId));
      if (d.occasionIds.length) await tx.insert(s.productOccasion).values(d.occasionIds.map((occasionId) => ({ productId, occasionId }))).onConflictDoNothing();
      // Mains get every side as a "Complete your meal" suggestion.
      if (!d.isSide) {
        const sides = await tx.select({ id: s.product.id }).from(s.product).where(and(eq(s.product.isSide, true), ne(s.product.id, productId)));
        if (sides.length) await tx.insert(s.productSide).values(sides.map((x) => ({ productId, sideProductId: x.id }))).onConflictDoNothing();
      }
      return productId;
    });
    await notifyBackInStock(restocked).catch(() => 0);
    bust();
    return ok("Product saved", id);
  } catch (err) {
    return zodFail(err);
  }
}

/** Inline stock edit from the products table. */
export async function setVariantStock(variantId: number, stock: number): Promise<AdminResult> {
  await requireAdmin();
  try {
    const id = z.coerce.number().int().positive().parse(variantId);
    const value = z.coerce.number().int().min(0).max(100_000).parse(stock);
    const [prev] = await db.select({ stock: s.productVariant.stock }).from(s.productVariant).where(eq(s.productVariant.id, id));
    if (!prev) return fail("Variant not found.");
    await db.update(s.productVariant).set({ stock: value }).where(eq(s.productVariant.id, id));
    if (prev.stock === 0 && value > 0) await notifyBackInStock([id]).catch(() => 0);
    bust();
    return ok(`Stock set to ${value}`);
  } catch (err) {
    return zodFail(err);
  }
}

/** Draft copy with a new slug + SKUs and zero stock. */
export async function duplicateProduct(productId: number): Promise<AdminResult> {
  await requireAdmin();
  const id = z.coerce.number().int().positive().parse(productId);
  const [p] = await db.select().from(s.product).where(eq(s.product.id, id));
  if (!p) return fail("Product not found.");
  const suffix = Math.random().toString(36).slice(2, 6);
  const newId = await db.transaction(async (tx) => {
    const { id: _omit, createdAt: _c, updatedAt: _u, ...rest } = p;
    void _omit; void _c; void _u;
    const [copy] = await tx
      .insert(s.product)
      .values({ ...rest, name: `${p.name} (copy)`, slug: `${p.slug}-copy-${suffix}`.slice(0, 80), status: "draft", featured: false })
      .returning({ id: s.product.id });
    const variants = await tx.select().from(s.productVariant).where(eq(s.productVariant.productId, id));
    if (variants.length)
      await tx.insert(s.productVariant).values(
        variants.map((v) => ({ productId: copy.id, name: v.name, sku: `${v.sku}-C${suffix}`.toUpperCase().slice(0, 48), priceKobo: v.priceKobo, compareAtKobo: v.compareAtKobo, stock: 0, sort: v.sort, active: v.active })),
      );
    const images = await tx.select().from(s.productImage).where(eq(s.productImage.productId, id));
    if (images.length) await tx.insert(s.productImage).values(images.map((i) => ({ productId: copy.id, url: i.url, alt: i.alt, sort: i.sort })));
    const occ = await tx.select().from(s.productOccasion).where(eq(s.productOccasion.productId, id));
    if (occ.length) await tx.insert(s.productOccasion).values(occ.map((o) => ({ productId: copy.id, occasionId: o.occasionId })));
    return copy.id;
  });
  bust();
  return ok("Draft copy created", newId);
}

export async function setProductStatus(productId: number, status: "draft" | "active" | "archived"): Promise<AdminResult> {
  await requireAdmin();
  await db
    .update(s.product)
    .set({ status: z.enum(["draft", "active", "archived"]).parse(status) })
    .where(eq(s.product.id, z.coerce.number().int().positive().parse(productId)));
  bust();
  return ok(status === "archived" ? "Product archived" : "Status updated");
}

export async function reorderImages(productId: number, imageIds: number[]): Promise<AdminResult> {
  await requireAdmin();
  const pid = z.coerce.number().int().positive().parse(productId);
  const ids = z.array(z.coerce.number().int().positive()).max(30).parse(imageIds);
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.update(s.productImage).set({ sort: i }).where(and(eq(s.productImage.id, id), eq(s.productImage.productId, pid)));
    }
  });
  bust();
  return ok("Image order saved");
}

export async function updateImageAlt(imageId: number, alt: string): Promise<AdminResult> {
  await requireAdmin();
  await db
    .update(s.productImage)
    .set({ alt: z.string().trim().max(160).parse(alt) })
    .where(eq(s.productImage.id, z.coerce.number().int().positive().parse(imageId)));
  bust();
  return ok("Alt text saved");
}

export async function removeImage(imageId: number): Promise<AdminResult> {
  await requireAdmin();
  const id = z.coerce.number().int().positive().parse(imageId);
  const [img] = await db.delete(s.productImage).where(eq(s.productImage.id, id)).returning();
  if (img) {
    // Only delete the file if no other product (e.g. a duplicate) still uses it.
    const others = await db.$count(s.productImage, eq(s.productImage.url, img.url));
    const combos = await db.$count(s.combo, eq(s.combo.imageUrl, img.url));
    if (!others && !combos) await deleteStoredImage(img.url).catch(() => undefined);
  }
  bust();
  return ok("Image removed");
}

/* ───────────── Categories / occasions ───────────── */

const categorySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(40),
  slug,
  description: z.string().trim().max(300).default(""),
  sort: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<AdminResult> {
  await requireAdmin();
  try {
    const d = categorySchema.parse(input);
    if (d.id) await db.update(s.category).set(d).where(eq(s.category.id, d.id));
    else await db.insert(s.category).values(d);
    bust();
    return ok("Category saved");
  } catch (err) {
    return zodFail(err);
  }
}

export async function deleteCategory(id: number): Promise<AdminResult> {
  await requireAdmin();
  await db.delete(s.category).where(eq(s.category.id, z.coerce.number().int().positive().parse(id)));
  bust();
  return ok("Category deleted (its products are now uncategorised)");
}

/* ───────────── Combos ───────────── */

const comboSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(60),
  slug,
  description: z.string().trim().max(400).default(""),
  imageUrl: z.string().trim().nullable().optional(),
  priceNaira: naira,
  active: z.boolean(),
  items: z.array(z.object({ variantId: z.coerce.number().int().positive(), qty: z.coerce.number().int().min(1).max(20) })).min(2, "A combo needs at least 2 items."),
});

export async function saveCombo(input: z.input<typeof comboSchema>): Promise<AdminResult> {
  await requireAdmin();
  try {
    const d = comboSchema.parse(input);
    if (d.imageUrl && !isOurMediaUrl(d.imageUrl)) return fail("Use an image uploaded to the store.");
    const variants = await db.select().from(s.productVariant).where(inArray(s.productVariant.id, d.items.map((i) => i.variantId)));
    const value = d.items.reduce((sum, i) => sum + (variants.find((v) => v.id === i.variantId)?.priceKobo ?? 0) * i.qty, 0);
    const price = Math.round(d.priceNaira * 100);
    if (price >= value) return fail(`Combo price must be below the items' total (₦${(value / 100).toLocaleString()}).`);
    const id = await db.transaction(async (tx) => {
      const values = { name: d.name, slug: d.slug, description: d.description, imageUrl: d.imageUrl || null, priceKobo: price, active: d.active };
      let comboId = d.id;
      if (comboId) await tx.update(s.combo).set(values).where(eq(s.combo.id, comboId));
      else comboId = (await tx.insert(s.combo).values(values).returning({ id: s.combo.id }))[0].id;
      await tx.delete(s.comboItem).where(eq(s.comboItem.comboId, comboId));
      await tx.insert(s.comboItem).values(d.items.map((i) => ({ comboId: comboId!, variantId: i.variantId, qty: i.qty })));
      return comboId;
    });
    bust();
    return ok("Combo saved", id);
  } catch (err) {
    return zodFail(err);
  }
}

/* ───────────── Coupons ───────────── */

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/, "Code: 3–30 letters, numbers or dashes."),
  kind: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive(),
  minSubtotalNaira: z.coerce.number().min(0).max(10_000_000).default(0),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  influencer: z.string().trim().max(60).nullable().optional(),
});

export async function createCoupon(input: z.input<typeof couponSchema>): Promise<AdminResult> {
  await requireAdmin();
  try {
    const d = couponSchema.parse(input);
    if (d.kind === "percent" && (d.value < 1 || d.value > 100 || !Number.isInteger(d.value))) return fail("Percent must be a whole number 1–100.");
    await db.insert(s.coupon).values({
      code: d.code,
      kind: d.kind,
      value: d.kind === "percent" ? d.value : Math.round(d.value * 100),
      minSubtotalKobo: Math.round(d.minSubtotalNaira * 100),
      maxUses: d.maxUses ?? null,
      endsAt: d.endsAt ? new Date(`${d.endsAt}T23:59:59+01:00`) : null,
      influencer: d.influencer || null,
      source: d.influencer ? "influencer" : "manual",
    });
    refresh();
    return ok(`Coupon ${d.code} created`);
  } catch (err) {
    return zodFail(err);
  }
}

export async function toggleCoupon(id: number, active: boolean): Promise<AdminResult> {
  await requireAdmin();
  await db.update(s.coupon).set({ active: z.boolean().parse(active) }).where(eq(s.coupon.id, z.coerce.number().int().positive().parse(id)));
  refresh();
  return ok(active ? "Coupon enabled" : "Coupon disabled");
}

/* ───────────── Reviews ───────────── */

export async function moderateReview(id: number, status: "approved" | "rejected"): Promise<AdminResult> {
  await requireAdmin();
  await db
    .update(s.review)
    .set({ status: z.enum(["approved", "rejected"]).parse(status) })
    .where(eq(s.review.id, z.coerce.number().int().positive().parse(id)));
  bust();
  return ok(status === "approved" ? "Review published" : "Review hidden");
}

/* ───────────── Shipping zones ───────────── */

const zoneSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(60),
  areas: z.string().trim().max(500).default(""),
  feeNaira: z.coerce.number().min(0).max(1_000_000),
  freeOverNaira: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  etaText: z.string().trim().max(40).default(""),
  active: z.boolean(),
});

export async function saveZone(input: z.input<typeof zoneSchema>): Promise<AdminResult> {
  await requireAdmin();
  try {
    const d = zoneSchema.parse(input);
    const values = {
      name: d.name,
      areas: d.areas,
      feeKobo: Math.round(d.feeNaira * 100),
      freeOverKobo: d.freeOverNaira ? Math.round(d.freeOverNaira * 100) : null,
      etaText: d.etaText,
      active: d.active,
    };
    if (d.id) await db.update(s.shippingZone).set(values).where(eq(s.shippingZone.id, d.id));
    else await db.insert(s.shippingZone).values({ ...values, sort: 99 });
    bust();
    return ok("Delivery zone saved");
  } catch (err) {
    return zodFail(err);
  }
}

/* ───────────── Settings ───────────── */

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().max(20),
  bannerDesktop: z.string().trim().max(140),
  bannerMobile: z.string().trim().max(80),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<AdminResult> {
  await requireAdmin();
  try {
    const d = settingsSchema.parse(input);
    let wa: string | null = null;
    if (d.whatsappNumber) {
      wa = normalizeWhatsapp(d.whatsappNumber);
      if (!wa) return fail("Enter a valid WhatsApp number, e.g. 0803 123 4567 or +234 803 123 4567.");
    }
    await db
      .insert(s.storeSettings)
      .values({ id: 1, whatsappNumber: wa, bannerDesktop: d.bannerDesktop || null, bannerMobile: d.bannerMobile || null })
      .onConflictDoUpdate({
        target: s.storeSettings.id,
        set: { whatsappNumber: wa, bannerDesktop: d.bannerDesktop || null, bannerMobile: d.bannerMobile || null, updatedAt: sql`now()` },
      });
    updateTag("settings");
    refresh();
    return ok("Settings saved");
  } catch (err) {
    return zodFail(err);
  }
}
