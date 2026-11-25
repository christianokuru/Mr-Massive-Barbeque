"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, Loader2, LogOut, MessageCircle, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addAddress,
  buyAgain,
  deleteAddress,
  deleteMyAccount,
  quickReorder,
  setDefaultAddress,
  setMarketingOptIn,
  updateProfile,
  type AccountResult,
} from "@/app/actions/account";
import { PasswordField, inputClass } from "@/components/auth/password-field";
import { useConfirm } from "@/components/confirm";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { PASSWORD_MIN, PASSWORD_TOO_WEAK, PHONE_HINT } from "@/lib/validation";
import { cn } from "@/lib/utils";

/** Run an action and toast its result. Returns the result. */
export function toastResult(res: AccountResult | { ok: boolean; message?: string; error?: string }) {
  if (res.ok) {
    if ("message" in res && res.message) toast.success(res.message);
  } else toast.error(("error" in res && res.error) || "Something went wrong.");
  return res;
}

const pill = "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 font-bold disabled:opacity-60";

export function BuyAgainButton({ number, className }: { number: string; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      data-testid="buy-again"
      onClick={() =>
        start(async () => {
          const res = toastResult(await buyAgain(number));
          if (res.ok) router.push("/cart");
        })
      }
      className={cn(pill, "bg-bonnet text-char", className)}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Buy again
    </button>
  );
}

export function QuickReorderButton({ variantId }: { variantId: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void toastResult(await quickReorder(variantId)))} className={cn(pill, "h-10 bg-bonnet px-4 text-sm text-char")} data-testid="quick-reorder">
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Reorder
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await authClient.signOut();
          window.location.assign(new URL("/", window.location.origin).toString());
        })
      }
      className={cn("inline-flex items-center gap-2 font-bold", className)}
      data-testid="sign-out"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Sign out
    </button>
  );
}

export function ReferralShare({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const text = `I order my BBQ from Massive Barbeque. Use my code ${code} for ₦2,000 off your first order: ${url}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-oxblood bg-white px-4 py-3">
        <span className="font-display text-heading-sm tracking-wide" data-testid="referral-code">{code}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={cn(pill, "h-10 bg-sand px-4 text-sm")}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={cn(pill, "bg-[#25D366] text-white")}>
          <MessageCircle className="size-4" /> Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) navigator.share({ title: "Massive Barbeque", text, url }).catch(() => undefined);
            else navigator.clipboard.writeText(text).then(() => toast.success("Invite copied"));
          }}
          className={cn(pill, "border-2 border-oxblood text-oxblood")}
        >
          <Share2 className="size-4" /> Share
        </button>
      </div>
    </div>
  );
}

type Zone = { id: number; name: string };
type Addr = { id: number; label: string; line1: string; area: string; zoneName: string | null; phone: string; isDefault: boolean };

export function AddressManager({ addresses, zones }: { addresses: Addr[]; zones: Zone[] }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const [form, setForm] = useState({ label: "Home", line1: "", area: "", zoneId: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-8">
      {addresses.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 rounded-card bg-white p-5" data-testid="address-card">
              <p className="flex items-center gap-2 font-bold">{a.label}{a.isDefault ? <span className="rounded-full bg-paprika px-2 py-0.5 text-xs text-oxblood">Default</span> : null}</p>
              <p className="text-smoke">{a.line1}, {a.area}</p>
              <p className="text-sm text-muted-foreground">{a.zoneName} · {a.phone}</p>
              <div className="mt-2 flex gap-2">
                {!a.isDefault ? (
                  <button type="button" disabled={pending} onClick={() => start(async () => void toastResult(await setDefaultAddress(a.id)))} className="text-sm font-bold underline">
                    Make default
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={async () => {
                    if (await confirm({ title: "Remove this address?", confirmLabel: "Remove", destructive: true }))
                      start(async () => void toastResult(await deleteAddress(a.id)));
                  }}
                  className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No saved addresses yet. Add one below or save it at checkout.</p>
      )}
      <form
        className="flex max-w-xl flex-col gap-4 rounded-card bg-white p-5"
        data-testid="address-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await addAddress({ ...form, zoneId: Number(form.zoneId) });
            if (res.ok) {
              toastResult(res);
              setForm({ label: "Home", line1: "", area: "", zoneId: "", phone: "" });
            } else setError(res.error);
          });
        }}
      >
        <p className="text-subheading font-bold">Add an address</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Label</span><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputClass} maxLength={30} /></label>
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Phone <span className="font-normal text-muted-foreground">({PHONE_HINT})</span></span><input type="tel" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="0803 123 4567" /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Street address</span><input name="line1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className={inputClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Area</span><input name="area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} /></label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Delivery zone</span>
            <select name="zone" value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className={inputClass}>
              <option value="">Choose zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </label>
        </div>
        {error ? <p className="font-bold text-chili" role="alert">{error}</p> : null}
        <button type="submit" disabled={pending} className={cn(pill, "bg-bonnet text-char")}>Save address</button>
      </form>
    </div>
  );
}

export function ProfileForm({ name: n, phone: p }: { name: string; phone: string }) {
  const [name, setName] = useState(n);
  const [phone, setPhone] = useState(p);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => void toastResult(await updateProfile({ name, phone }))); }}>
      <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></label>
      <label className="flex flex-col gap-1.5"><span className="text-sm font-bold">Phone <span className="font-normal text-muted-foreground">({PHONE_HINT})</span></span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="0803 123 4567" /></label>
      <button type="submit" disabled={pending} className={cn(pill, "w-fit bg-char text-cream")}>Save profile</button>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setPwError(null);
        if (next.length < PASSWORD_MIN) return setPwError(PASSWORD_TOO_WEAK);
        start(async () => {
          const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
          if (error) {
            if (error.code === "PASSWORD_TOO_SHORT") setPwError(PASSWORD_TOO_WEAK);
            else setError(authErrorMessage(error));
          } else {
            toast.success("Password changed. Other devices were signed out.");
            setCurrent("");
            setNext("");
          }
        });
      }}
    >
      <PasswordField label="Current password" value={current} onChange={setCurrent} name="current-password" />
      <PasswordField label="New password" value={next} onChange={setNext} meter autoComplete="new-password" name="new-password" error={pwError} />
      {error ? <p className="font-bold text-chili" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} className={cn(pill, "w-fit bg-char text-cream")}>Change password</button>
    </form>
  );
}

export function MarketingToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block font-bold">Offers & new menu drops</span>
        <span className="text-sm text-muted-foreground">Occasional emails. Order updates always arrive.</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        data-testid="marketing-toggle"
        onClick={() =>
          start(async () => {
            const res = toastResult(await setMarketingOptIn(!on));
            if (res.ok) setOn(!on);
          })
        }
        className={cn("relative h-8 w-14 shrink-0 rounded-full transition", on ? "bg-oxblood" : "bg-line")}
      >
        <span className={cn("absolute top-1 size-6 rounded-full bg-white transition", on ? "left-7" : "left-1")} />
      </button>
    </label>
  );
}

export function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  return (
    <form
      className="flex flex-col gap-3"
      data-testid="delete-account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const ok = await confirm({
          title: "Delete your account?",
          body: "This removes your profile, addresses, favourites and rewards. Past orders stay on our books for accounting, without your account.",
          confirmLabel: "Delete account",
          destructive: true,
        });
        if (!ok) return;
        start(async () => {
          const res = await deleteMyAccount(password);
          if (res.ok) {
            await authClient.signOut().catch(() => undefined);
            window.location.assign(new URL("/?deleted=1", window.location.origin).toString());
          } else setError(res.error);
        });
      }}
    >
      <PasswordField label="Confirm with your password" value={password} onChange={setPassword} name="delete-password" error={error} />
      <button type="submit" disabled={pending || !password} className={cn(pill, "w-fit bg-[#b42318] text-white")}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete my account
      </button>
    </form>
  );
}
