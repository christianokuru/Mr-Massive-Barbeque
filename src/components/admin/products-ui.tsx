"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { duplicateProduct, removeImage, reorderImages, saveProduct, setProductStatus, setVariantStock, updateImageAlt, type AdminResult } from "@/app/actions/admin";
import { useConfirm } from "@/components/confirm";
import { cn } from "@/lib/utils";

const input = "h-11 w-full rounded-lg border border-input bg-white px-3 outline-none focus:ring-3 focus:ring-ring/40";

export function done(res: AdminResult) {
  if (res.ok) toast.success(res.message ?? "Saved");
  else toast.error(res.error);
  return res.ok;
}

/** Inline per-variant stock edit (saves on blur / Enter). */
export function StockInput({ variantId, stock, label }: { variantId: number; stock: number; label: string }) {
  const [value, setValue] = useState(String(stock));
  const [saved, setSaved] = useState(stock);
  const [pending, start] = useTransition();
  const commit = () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      setValue(String(saved));
      return toast.error("Stock must be a whole number ≥ 0");
    }
    if (n === saved) return;
    start(async () => {
      if (done(await setVariantStock(variantId, n))) setSaved(n);
      else setValue(String(saved));
    });
  };
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full bg-sand py-1 pr-1 pl-3 text-xs font-bold">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
        aria-label={`Stock for ${label}`}
        data-testid="stock-input"
        className={cn("h-8 w-16 rounded-full border bg-white px-2 text-center", Number(value) === 0 ? "border-chili text-chili" : "border-line", pending && "opacity-50")}
      />
    </label>
  );
}

export function ProductRowActions({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateProduct(id);
            if (done(res) && res.ok && res.id) router.push(`/admin/products/${res.id}`);
          })
        }
        className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold hover:bg-sand"
        data-testid="duplicate-product"
      >
        <Copy className="size-3.5" /> Duplicate
      </button>
      {status !== "archived" ? (
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            if (await confirm({ title: "Archive this product?", body: "It disappears from the menu. Past orders keep it.", confirmLabel: "Archive", destructive: true }))
              start(async () => void done(await setProductStatus(id, "archived")));
          }}
          className="inline-flex h-9 items-center rounded-full px-3 text-xs font-bold text-muted-foreground hover:bg-sand"
        >
          Archive
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => start(async () => void done(await setProductStatus(id, "draft")))} className="inline-flex h-9 items-center rounded-full px-3 text-xs font-bold hover:bg-sand">
          Restore
        </button>
      )}
    </div>
  );
}

type Variant = { id?: number; name: string; sku: string; priceNaira: number; compareAtNaira: number | null; stock: number; active: boolean };
export type ProductFormValue = {
  id?: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: number | null;
  status: "draft" | "active" | "archived";
  featured: boolean;
  isSide: boolean;
  spiceLevel: number;
  reorderDays: number;
  seoTitle: string;
  seoDescription: string;
  occasionIds: number[];
  variants: Variant[];
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function ProductForm({ initial, categories, occasions }: { initial: ProductFormValue; categories: { id: number; name: string }[]; occasions: { id: number; name: string }[] }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setVar = (i: number, patch: Partial<Variant>) => setV((x) => ({ ...x, variants: x.variants.map((vr, j) => (j === i ? { ...vr, ...patch } : vr)) }));

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      data-testid="product-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await saveProduct({ ...v, seoTitle: v.seoTitle || null, seoDescription: v.seoDescription || null });
          if (res.ok) {
            toast.success(res.message);
            if (!v.id && res.id) router.push(`/admin/products/${res.id}`);
          } else setError(res.error);
        });
      }}
    >
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-card bg-white p-5">
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Name</span>
            <input className={input} value={v.name} onChange={(e) => setV((x) => ({ ...x, name: e.target.value, slug: x.id ? x.slug : slugify(e.target.value) }))} required name="name" />
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">URL slug</span>
            <input className={input} value={v.slug} onChange={(e) => set("slug", e.target.value)} required name="slug" />
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Short description</span>
            <input className={input} value={v.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={200} />
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Full description</span>
            <textarea className="min-h-28 rounded-lg border border-input bg-white p-3" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={3000} />
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-card bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-body-lg font-bold">Sizes & prices</h2>
            <button type="button" onClick={() => setV((x) => ({ ...x, variants: [...x.variants, { name: "", sku: `${x.slug.toUpperCase().slice(0, 30) || "MB"}-${x.variants.length + 1}`, priceNaira: 0, compareAtNaira: null, stock: 0, active: true }] }))} className="inline-flex h-9 items-center gap-1 rounded-full bg-sand px-3 text-sm font-bold">
              <Plus className="size-4" /> Add size
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="p-1">Size</th><th className="p-1">SKU</th><th className="p-1">Price ₦</th><th className="p-1">Was ₦</th><th className="p-1">Stock</th><th className="p-1">On</th><th /></tr></thead>
              <tbody>
                {v.variants.map((vr, i) => (
                  <tr key={vr.id ?? `new-${i}`}>
                    <td className="p-1"><input className={input} value={vr.name} onChange={(e) => setVar(i, { name: e.target.value })} required aria-label="Size name" /></td>
                    <td className="p-1"><input className={input} value={vr.sku} onChange={(e) => setVar(i, { sku: e.target.value.toUpperCase() })} required aria-label="SKU" /></td>
                    <td className="p-1"><input className={input} type="number" min={1} step="50" value={vr.priceNaira || ""} onChange={(e) => setVar(i, { priceNaira: Number(e.target.value) })} required aria-label="Price" /></td>
                    <td className="p-1"><input className={input} type="number" min={0} step="50" value={vr.compareAtNaira ?? ""} onChange={(e) => setVar(i, { compareAtNaira: e.target.value ? Number(e.target.value) : null })} aria-label="Was price" /></td>
                    <td className="p-1"><input className={input} type="number" min={0} value={vr.stock} onChange={(e) => setVar(i, { stock: Number(e.target.value) })} aria-label="Stock" /></td>
                    <td className="p-1 text-center"><input type="checkbox" checked={vr.active} onChange={(e) => setVar(i, { active: e.target.checked })} aria-label="Active" className="size-5 accent-[var(--mb-oxblood)]" /></td>
                    <td className="p-1">
                      {v.variants.length > 1 ? (
                        <button type="button" onClick={() => setV((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))} aria-label="Remove size" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sand"><Trash2 className="size-4" /></button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-card bg-white p-5">
          <h2 className="font-sans text-body-lg font-bold">Search engines</h2>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">SEO title <span className="font-normal text-muted-foreground">({v.seoTitle.length}/70)</span></span>
            <input className={input} value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} placeholder={`${v.name} | Order online in Lagos`} />
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">SEO description <span className="font-normal text-muted-foreground">({v.seoDescription.length}/160)</span></span>
            <textarea className="min-h-20 rounded-lg border border-input bg-white p-3" value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={160} />
          </label>
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-card bg-white p-5">
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Status</span>
            <select className={input} value={v.status} onChange={(e) => set("status", e.target.value as ProductFormValue["status"])} name="status">
              <option value="draft">Draft (hidden)</option><option value="active">Active (on the menu)</option><option value="archived">Archived</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Category</span>
            <select className={input} value={v.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Spice level</span>
            <select className={input} value={v.spiceLevel} onChange={(e) => set("spiceLevel", Number(e.target.value))}>
              <option value={0}>No heat</option><option value={1}>Mild</option><option value={2}>Hot</option><option value={3}>Extra hot</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Reorder reminder after (days)</span>
            <input className={input} type="number" min={1} max={90} value={v.reorderDays} onChange={(e) => set("reorderDays", Number(e.target.value))} />
          </label>
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} className="size-5 accent-[var(--mb-oxblood)]" /> Best seller (featured)</label>
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={v.isSide} onChange={(e) => set("isSide", e.target.checked)} className="size-5 accent-[var(--mb-oxblood)]" /> This is a side</label>
        </section>
        <section className="flex flex-col gap-2 rounded-card bg-white p-5">
          <p className="text-sm font-bold">Occasions</p>
          {occasions.map((o) => (
            <label key={o.id} className="flex items-center gap-2">
              <input type="checkbox" checked={v.occasionIds.includes(o.id)} onChange={(e) => set("occasionIds", e.target.checked ? [...v.occasionIds, o.id] : v.occasionIds.filter((x) => x !== o.id))} className="size-5 accent-[var(--mb-oxblood)]" />
              {o.name}
            </label>
          ))}
        </section>
        {error ? <p className="rounded-xl bg-[#f6d6d0] p-3 text-sm font-bold text-[#7a1a0c]" role="alert" data-testid="product-error">{error}</p> : null}
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-bonnet font-bold" data-testid="save-product">
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} {v.id ? "Save changes" : "Create product"}
        </button>
        {v.id ? <Link href={`/menu/${v.slug}`} target="_blank" className="text-center text-sm font-bold underline">View on store</Link> : null}
      </div>
    </form>
  );
}

type Img = { id: number; url: string; alt: string };

/** Upload (real images only), drag-and-drop + arrow reordering, alt text, remove. */
export function ImageManager({ productId, images: initial }: { productId: number; images: Img[] }) {
  const [images, setImages] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const persist = (next: Img[]) => {
    setImages(next);
    start(async () => void done(await reorderImages(productId, next.map((i) => i.id))));
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    persist(next);
  };

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    const added: Img[] = [];
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", f);
      fd.set("productId", String(productId));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(`${f.name}: ${body.error ?? "Upload failed"}`);
        continue;
      }
      added.push({ id: body.imageId, url: body.url, alt: "" });
    }
    setImages((x) => [...x, ...added]);
    if (added.length) toast.success(`${added.length} photo${added.length === 1 ? "" : "s"} uploaded`);
    setUploading(false);
    if (file.current) file.current.value = "";
  }

  return (
    <section className="flex flex-col gap-4 rounded-card bg-white p-5" data-testid="image-manager">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-body-lg font-bold">Photos <span className="text-sm font-normal text-muted-foreground">(first is the cover; drag to reorder)</span></h2>
        <button type="button" onClick={() => file.current?.click()} disabled={uploading} className="inline-flex h-10 items-center gap-2 rounded-full bg-char px-4 text-sm font-bold text-cream">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} data-testid="image-upload-input" />
      </div>
      <p className="text-xs text-muted-foreground">JPG, PNG, WebP or AVIF · at least 400px · max 4 MB. Location data is removed automatically.</p>
      {error ? <p className="rounded-xl bg-[#f6d6d0] p-3 text-sm font-bold text-[#7a1a0c]" role="alert" data-testid="upload-error">{error}</p> : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
        {images.map((img, i) => (
          <li
            key={img.id}
            draggable
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId === null || dragId === img.id) return;
              move(images.findIndex((x) => x.id === dragId), i);
              setDragId(null);
            }}
            className={cn("flex flex-col gap-2 rounded-2xl border border-line p-2", dragId === img.id && "opacity-50")}
            data-testid="product-image"
          >
            <div className="relative aspect-square overflow-hidden rounded-xl bg-sand">
              <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
              {i === 0 ? <span className="absolute top-2 left-2 rounded-full bg-bonnet px-2 py-0.5 text-xs font-bold">Cover</span> : null}
              <GripVertical className="absolute top-2 right-2 size-5 rounded bg-white/80 text-char" aria-hidden />
            </div>
            <input
              defaultValue={img.alt}
              placeholder="Alt text (describe the photo)"
              onBlur={(e) => e.target.value !== img.alt && start(async () => void done(await updateImageAlt(img.id, e.target.value)))}
              className="h-9 rounded-lg border border-line px-2 text-xs"
              aria-label="Alt text"
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move earlier" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sand disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Move later" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sand disabled:opacity-30" data-testid="move-later"><ArrowDown className="size-4" /></button>
              <button
                type="button"
                onClick={async () => {
                  if (!(await confirm({ title: "Remove this photo?", confirmLabel: "Remove", destructive: true }))) return;
                  setImages((x) => x.filter((y) => y.id !== img.id));
                  start(async () => void done(await removeImage(img.id)));
                }}
                aria-label="Remove photo"
                className="ml-auto inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-sand"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!images.length ? <p className="text-sm text-muted-foreground">No photos yet. Products without a photo still show, but sell far less.</p> : null}
    </section>
  );
}
