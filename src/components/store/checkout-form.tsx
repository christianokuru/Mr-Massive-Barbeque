"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bike, Loader2, Lock, Store } from "lucide-react";
import { placeOrder, quoteCheckout, saveCheckoutContact, type QuoteView } from "@/app/actions/checkout";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Zone = { id: number; name: string; areas: string; fee: string; eta: string };
type Address = { id: number; label: string; line1: string; area: string; zoneId: number | null; phone: string };
type Line = { name: string; size: string; qty: number; total: string };

const field = "h-12 w-full rounded-lg border border-input bg-white px-3 text-base outline-none focus:ring-3 focus:ring-ring/40 aria-[invalid=true]:border-chili";

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="text-sm font-bold text-chili" role="alert">{error}</span> : null}
    </label>
  );
}

export function CheckoutForm({
  zones,
  addresses,
  lines,
  prefill,
  signedIn,
  analytics,
}: {
  zones: Zone[];
  addresses: Address[];
  lines: Line[];
  prefill: { email: string; name: string; phone: string };
  signedIn: boolean;
  analytics: { value: number; items: { item_id: string; item_name: string; price: number; quantity: number }[] };
}) {
  const def = addresses[0];
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone || def?.phone || "");
  const [name, setName] = useState(prefill.name);
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [zoneId, setZoneId] = useState<number | null>(def?.zoneId ?? null);
  const [addressLine, setAddressLine] = useState(def?.line1 ?? "");
  const [area, setArea] = useState(def?.area ?? "");
  const [notes, setNotes] = useState("");
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [q, setQ] = useState<QuoteView | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [placing, startPlace] = useTransition();
  const [quoting, startQuote] = useTransition();
  const began = useRef(false);

  useEffect(() => {
    if (began.current) return;
    began.current = true;
    track("begin_checkout", analytics);
  }, [analytics]);

  // Live server-side quote
  useEffect(() => {
    startQuote(async () => {
      const res = await quoteCheckout({ method, zoneId, code: appliedCode || null, email: email || null });
      if ("error" in res) setFormError(res.error);
      else setQ(res);
    });
  }, [method, zoneId, appliedCode, email]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startPlace(async () => {
      const res = await placeOrder({
        email,
        phone,
        name,
        method,
        zoneId,
        addressLine,
        area,
        notes,
        code: appliedCode || null,
        saveAddress: signedIn && saveAddress,
      });
      if (res.ok) {
        window.location.assign(res.redirectUrl);
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        document.querySelector("[role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]" data-testid="checkout-form">
      <div className="flex min-w-0 flex-col gap-10">
        <section className="flex flex-col gap-4">
          <h2 className="text-heading-sm">1. Your details</h2>
          <Field label="Email" error={errors.email} hint="For your receipt and order updates">
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && saveCheckoutContact(email)}
              aria-invalid={!!errors.email}
              className={field}
              name="email"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone (WhatsApp)" error={errors.phone}>
              <input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" aria-invalid={!!errors.phone} className={field} name="phone" />
            </Field>
            <Field label="Full name" error={errors.name}>
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} className={field} name="name" />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-heading-sm">2. Delivery or pickup</h2>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Delivery method">
            {([
              ["delivery", "Delivery", Bike, "Hot to your door"],
              ["pickup", "Pickup", Store, "Free · grab it fresh"],
            ] as const).map(([v, l, Icon, d]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={method === v}
                onClick={() => setMethod(v)}
                className={cn("flex items-center gap-3 rounded-2xl border-2 p-4 text-left", method === v ? "border-oxblood bg-paprika" : "border-line bg-white")}
                data-testid={`method-${v}`}
              >
                <Icon className="size-6 shrink-0 text-oxblood" />
                <span><span className="block font-bold">{l}</span><span className="text-sm text-muted-foreground">{d}</span></span>
              </button>
            ))}
          </div>
          {method === "delivery" ? (
            <>
              {addresses.length > 1 ? (
                <Field label="Saved addresses">
                  <select
                    className={field}
                    defaultValue={def?.id}
                    onChange={(e) => {
                      const a = addresses.find((x) => x.id === Number(e.target.value));
                      if (a) {
                        setAddressLine(a.line1);
                        setArea(a.area);
                        setZoneId(a.zoneId);
                        setPhone(a.phone);
                      }
                    }}
                  >
                    {addresses.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.line1}, {a.area}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="Delivery zone" error={errors.zoneId}>
                <select value={zoneId ?? ""} onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : null)} aria-invalid={!!errors.zoneId} className={field} name="zone" data-testid="zone-select">
                  <option value="">Choose your area</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} · {z.fee} · {z.eta}</option>
                  ))}
                </select>
              </Field>
              {zoneId ? <p className="-mt-2 text-sm text-muted-foreground">Covers: {zones.find((z) => z.id === zoneId)?.areas}</p> : null}
              <Field label="Street address" error={errors.addressLine}>
                <input autoComplete="street-address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="House number, street, estate" aria-invalid={!!errors.addressLine} className={field} name="address" />
              </Field>
              <Field label="Area / landmark" error={errors.area}>
                <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Admiralty Way, near the roundabout" aria-invalid={!!errors.area} className={field} name="area" />
              </Field>
              {signedIn ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="size-5 accent-[var(--mb-oxblood)]" />
                  Save this address to my account
                </label>
              ) : null}
            </>
          ) : (
            <p className="rounded-2xl bg-sand p-4 text-sm">We&apos;ll WhatsApp you the pickup point in Lagos and message you when your order is ready.</p>
          )}
          <Field label="Notes for the kitchen (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={2} placeholder="Extra pepper, no onions, gate code…" className="w-full rounded-lg border border-input bg-white p-3" />
          </Field>
        </section>
      </div>

      <aside className="flex h-fit min-w-0 flex-col gap-4 rounded-card bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-heading-sm">Order summary</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{l.qty} × {l.name} <span className="text-muted-foreground">({l.size})</span></span>
              <span className="shrink-0 font-bold">{l.total}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="code">Coupon or referral code</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon or referral code" className="h-11 min-w-0 flex-1 rounded-lg border border-input px-3 uppercase" data-testid="code-input" />
          <button type="button" onClick={() => setAppliedCode(code.trim())} className="h-11 rounded-full bg-char px-4 font-bold text-cream" data-testid="apply-code">
            Apply
          </button>
        </div>
        {q?.discountError && appliedCode ? <p className="text-sm font-bold text-chili" role="alert">{q.discountError}</p> : null}
        <dl className={cn("flex flex-col gap-2 border-t border-line pt-4", quoting && "opacity-60")} data-testid="summary">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{q?.subtotal ?? "…"}</dd></div>
          {q?.discount ? <div className="flex justify-between text-oxblood"><dt>{q.discountLabel}</dt><dd data-testid="discount">{q.discount}</dd></div> : null}
          <div className="flex justify-between"><dt>{method === "pickup" ? "Pickup" : "Delivery"}</dt><dd data-testid="delivery-fee">{q?.delivery ?? "…"}</dd></div>
          {q?.freeDeliveryNote ? <p className="text-xs text-muted-foreground">{q.freeDeliveryNote}</p> : null}
          <div className="flex justify-between border-t border-line pt-3 text-subheading font-bold"><dt>Total</dt><dd data-testid="total">{q?.total ?? "…"}</dd></div>
        </dl>
        {formError ? <p className="rounded-xl bg-[#f6d6d0] p-3 text-sm font-bold text-[#7a1a0c]" role="alert" data-testid="checkout-error">{formError}</p> : null}
        <button type="submit" disabled={placing} className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-bonnet font-bold text-char disabled:opacity-70" data-testid="place-order">
          {placing ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
          {placing ? "Placing order…" : `Pay ${q?.total ?? ""}`}
        </button>
        <p className="text-center text-xs text-muted-foreground">Secured by Paystack · Card, transfer or USSD. Your order is held for 60 minutes while you pay.</p>
      </aside>
    </form>
  );
}
