"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { createCoupon, deleteCategory, moderateReview, saveCategory, saveCombo, saveSettings, saveZone, toggleCoupon } from "@/app/actions/admin";
import { useConfirm } from "@/components/confirm";
import { cn } from "@/lib/utils";
import { done } from "./products-ui";

const input = "h-11 w-full rounded-lg border border-input bg-white px-3 outline-none focus:ring-3 focus:ring-ring/40";
const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 font-bold disabled:opacity-60";
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ───────────── Categories ───────────── */

type Cat = { id?: number; name: string; slug: string; description: string; sort: number; products?: number };

export function CategoryRow({ cat }: { cat: Cat }) {
  const [v, setV] = useState(cat);
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  return (
    <form
      className="grid gap-3 rounded-card bg-white p-4 md:grid-cols-[1fr_1fr_2fr_80px_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (done(await saveCategory(v)) && !cat.id) setV({ name: "", slug: "", description: "", sort: 0 });
        });
      }}
    >
      <input className={input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value, slug: cat.id ? v.slug : slugify(e.target.value) })} placeholder="Name" aria-label="Name" required />
      <input className={input} value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} placeholder="slug" aria-label="Slug" required />
      <input className={input} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="Description" aria-label="Description" />
      <input className={input} type="number" value={v.sort} onChange={(e) => setV({ ...v, sort: Number(e.target.value) })} aria-label="Sort order" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={cn(btn, "bg-bonnet")}>{cat.id ? "Save" : <><Plus className="size-4" /> Add</>}</button>
        {cat.id ? (
          <button
            type="button"
            disabled={pending}
            aria-label="Delete category"
            onClick={async () => {
              if (await confirm({ title: `Delete ${cat.name}?`, body: `${cat.products ?? 0} product(s) will become uncategorised.`, confirmLabel: "Delete", destructive: true }))
                start(async () => void done(await deleteCategory(cat.id!)));
            }}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-sand"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </form>
  );
}

/* ───────────── Combos ───────────── */

type VariantOpt = { id: number; label: string; priceKobo: number };
type ComboValue = { id?: number; name: string; slug: string; description: string; imageUrl: string | null; priceNaira: number; active: boolean; items: { variantId: number; qty: number }[] };

export function ComboEditor({ initial, variants }: { initial: ComboValue; variants: VariantOpt[] }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = v.items.reduce((s, i) => s + (variants.find((x) => x.id === i.variantId)?.priceKobo ?? 0) * i.qty, 0) / 100;

  async function upload(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", f);
    fd.set("folder", "combos");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) setV((x) => ({ ...x, imageUrl: body.url }));
    else setError(body.error ?? "Upload failed");
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-card bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await saveCombo(v);
          if (res.ok) {
            done(res);
            if (!initial.id) setV({ name: "", slug: "", description: "", imageUrl: null, priceNaira: 0, active: true, items: [] });
          } else setError(res.error);
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <input className={input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value, slug: initial.id ? v.slug : slugify(e.target.value) })} placeholder="Combo name" aria-label="Combo name" required />
        <input className={input} value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} placeholder="slug" aria-label="Slug" required />
      </div>
      <input className={input} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="What's inside, who it's for" aria-label="Description" />
      <div className="flex flex-col gap-2">
        {v.items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <select className={input} value={it.variantId} onChange={(e) => setV({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, variantId: Number(e.target.value) } : x)) })} aria-label="Item">
              {variants.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <input className={cn(input, "w-20")} type="number" min={1} max={20} value={it.qty} onChange={(e) => setV({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)) })} aria-label="Quantity" />
            <button type="button" onClick={() => setV({ ...v, items: v.items.filter((_, j) => j !== i) })} aria-label="Remove item" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-sand"><X className="size-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setV({ ...v, items: [...v.items, { variantId: variants[0]?.id ?? 0, qty: 1 }] })} className="inline-flex h-10 w-fit items-center gap-1 rounded-full bg-sand px-4 text-sm font-bold"><Plus className="size-4" /> Add item</button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-bold">Combo price ₦
          <input className={cn(input, "w-40")} type="number" min={1} step={50} value={v.priceNaira || ""} onChange={(e) => setV({ ...v, priceNaira: Number(e.target.value) })} required />
        </label>
        <p className="pb-3 text-sm text-muted-foreground">Items total ₦{value.toLocaleString()} · saving ₦{Math.max(0, value - v.priceNaira).toLocaleString()}</p>
        <label className="flex items-center gap-2 pb-3 font-bold"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-5 accent-[var(--mb-oxblood)]" /> Active</label>
        <label className={cn(btn, "cursor-pointer bg-sand")}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {v.imageUrl ? "Change photo" : "Photo"}
          <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      {error ? <p className="text-sm font-bold text-chili" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} className={cn(btn, "w-fit bg-bonnet")}>{initial.id ? "Save combo" : "Create combo"}</button>
    </form>
  );
}

/* ───────────── Coupons ───────────── */

export function CouponForm() {
  const empty = { code: "", kind: "percent" as "percent" | "fixed", value: 10, minSubtotalNaira: 0, maxUses: "", endsAt: "", influencer: "" };
  const [v, setV] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-card bg-white p-5 md:grid-cols-4"
      data-testid="coupon-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createCoupon({ ...v, maxUses: v.maxUses ? Number(v.maxUses) : null, endsAt: v.endsAt || null, influencer: v.influencer || null });
          if (res.ok) {
            done(res);
            setV(empty);
          } else setError(res.error);
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-bold">Code<input name="code" className={input} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" required /></label>
      <label className="flex flex-col gap-1 text-sm font-bold">Type
        <select className={input} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as "percent" | "fixed" })}><option value="percent">% off</option><option value="fixed">₦ off</option></select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">{v.kind === "percent" ? "Percent" : "Amount ₦"}<input name="value" className={input} type="number" min={1} value={v.value} onChange={(e) => setV({ ...v, value: Number(e.target.value) })} required /></label>
      <label className="flex flex-col gap-1 text-sm font-bold">Min. spend ₦<input className={input} type="number" min={0} value={v.minSubtotalNaira} onChange={(e) => setV({ ...v, minSubtotalNaira: Number(e.target.value) })} /></label>
      <label className="flex flex-col gap-1 text-sm font-bold">Max uses<input className={input} type="number" min={1} value={v.maxUses} onChange={(e) => setV({ ...v, maxUses: e.target.value })} placeholder="Unlimited" /></label>
      <label className="flex flex-col gap-1 text-sm font-bold">Ends<input className={input} type="date" value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} /></label>
      <label className="flex flex-col gap-1 text-sm font-bold md:col-span-2">Influencer (tracks revenue)<input className={input} value={v.influencer} onChange={(e) => setV({ ...v, influencer: e.target.value })} placeholder="e.g. @lagosfoodie" /></label>
      {error ? <p className="text-sm font-bold text-chili md:col-span-4" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} className={cn(btn, "w-fit bg-bonnet md:col-span-4")} data-testid="create-coupon">Create coupon</button>
    </form>
  );
}

export function CouponToggle({ id, active }: { id: number; active: boolean }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Coupon active"
      disabled={pending}
      onClick={() => start(async () => { if (done(await toggleCoupon(id, !on))) setOn(!on); })}
      className={cn("relative h-7 w-12 rounded-full transition", on ? "bg-oxblood" : "bg-line")}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white transition", on ? "left-6" : "left-1")} />
    </button>
  );
}

/* ───────────── Reviews ───────────── */

export function ReviewActions({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {status !== "approved" ? (
        <button type="button" disabled={pending} onClick={() => start(async () => void done(await moderateReview(id, "approved")))} className={cn(btn, "h-10 bg-bonnet px-4 text-sm")} data-testid="approve-review"><Check className="size-4" /> Approve</button>
      ) : null}
      {status !== "rejected" ? (
        <button type="button" disabled={pending} onClick={() => start(async () => void done(await moderateReview(id, "rejected")))} className={cn(btn, "h-10 border-2 border-line px-4 text-sm")}><X className="size-4" /> Hide</button>
      ) : null}
    </div>
  );
}

/* ───────────── Shipping zones ───────────── */

type ZoneValue = { id?: number; name: string; areas: string; feeNaira: number; freeOverNaira: number | null; etaText: string; active: boolean };

export function ZoneRow({ zone }: { zone: ZoneValue }) {
  const [v, setV] = useState(zone);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-card bg-white p-4 lg:grid-cols-[1.2fr_2fr_110px_130px_130px_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (done(await saveZone(v)) && !zone.id) setV({ name: "", areas: "", feeNaira: 0, freeOverNaira: null, etaText: "", active: true });
        });
      }}
    >
      <input className={input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Zone name" aria-label="Zone name" required />
      <input className={input} value={v.areas} onChange={(e) => setV({ ...v, areas: e.target.value })} placeholder="Areas covered" aria-label="Areas" />
      <input className={input} type="number" min={0} step={100} value={v.feeNaira} onChange={(e) => setV({ ...v, feeNaira: Number(e.target.value) })} aria-label="Fee ₦" placeholder="Fee ₦" />
      <input className={input} type="number" min={0} step={1000} value={v.freeOverNaira ?? ""} onChange={(e) => setV({ ...v, freeOverNaira: e.target.value ? Number(e.target.value) : null })} aria-label="Free over ₦" placeholder="Free over ₦" />
      <input className={input} value={v.etaText} onChange={(e) => setV({ ...v, etaText: e.target.value })} aria-label="ETA" placeholder="45–75 min" />
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-5 accent-[var(--mb-oxblood)]" /> On</label>
      <button type="submit" disabled={pending} className={cn(btn, "bg-bonnet")}>{zone.id ? "Save" : "Add zone"}</button>
    </form>
  );
}

/* ───────────── Settings ───────────── */

export function SettingsForm({ initial }: { initial: { whatsappNumber: string; bannerDesktop: string; bannerMobile: string } }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex max-w-2xl flex-col gap-5 rounded-card bg-white p-5"
      data-testid="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await saveSettings(v);
          if (res.ok) done(res);
          else setError(res.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">WhatsApp number</span>
        <input name="whatsapp" className={input} value={v.whatsappNumber} onChange={(e) => setV({ ...v, whatsappNumber: e.target.value })} placeholder="0803 123 4567" inputMode="tel" />
        <span className="text-xs text-muted-foreground">Powers the chat button on every page (free wa.me link). Leave empty to hide it.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Announcement banner (desktop)</span>
        <input name="bannerDesktop" className={input} value={v.bannerDesktop} onChange={(e) => setV({ ...v, bannerDesktop: e.target.value })} maxLength={140} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Announcement banner (mobile, shorter)</span>
        <input name="bannerMobile" className={input} value={v.bannerMobile} onChange={(e) => setV({ ...v, bannerMobile: e.target.value })} maxLength={80} />
      </label>
      {error ? <p className="text-sm font-bold text-chili" role="alert" data-testid="settings-error">{error}</p> : null}
      <button type="submit" disabled={pending} className={cn(btn, "w-fit bg-bonnet")} data-testid="save-settings">Save settings</button>
    </form>
  );
}
