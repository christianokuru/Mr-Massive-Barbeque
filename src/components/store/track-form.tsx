"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { lookupOrder } from "@/app/actions/growth";

export function TrackForm({ error: initialError, number: n = "", email: e = "" }: { error?: string; number?: string; email?: string }) {
  const [number, setNumber] = useState(n);
  const [email, setEmail] = useState(e);
  const [error, setError] = useState(initialError ?? null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      data-testid="track-form"
      onSubmit={(ev) => {
        ev.preventDefault();
        setError(null);
        start(async () => {
          const res = await lookupOrder(number, email);
          if (res.ok) router.push(`/track?number=${encodeURIComponent(res.number)}&email=${encodeURIComponent(email.trim().toLowerCase())}`);
          else setError(res.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Order number</span>
        <input value={number} onChange={(x) => setNumber(x.target.value.toUpperCase())} placeholder="MB-XXXX-XXXX" required className="h-12 rounded-lg border border-input bg-white px-3 uppercase" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Email used at checkout</span>
        <input type="email" value={email} onChange={(x) => setEmail(x.target.value)} required autoComplete="email" className="h-12 rounded-lg border border-input bg-white px-3" />
      </label>
      {error ? <p className="font-bold text-chili" role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-bonnet font-bold">
        {pending ? <Loader2 className="size-5 animate-spin" /> : null} Track order
      </button>
    </form>
  );
}
