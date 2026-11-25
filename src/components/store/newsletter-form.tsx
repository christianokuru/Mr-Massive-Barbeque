"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions/growth";
import { cn } from "@/lib/utils";

export function NewsletterForm({ source = "newsletter", dark = false }: { source?: string; dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await subscribeNewsletter(email, source);
          setMsg(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
          if (res.ok) setEmail("");
        });
      }}
      className="w-full max-w-md"
      data-testid="newsletter-form"
    >
      <label htmlFor={`nl-${source}`} className="sr-only">
        Email address
      </label>
      <div className={cn("flex h-13 items-center rounded-full border-2 p-1 pl-5", dark ? "border-cream/40 bg-transparent" : "border-char/20 bg-white")}>
        <input
          id={`nl-${source}`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className={cn("min-w-0 flex-1 bg-transparent text-base outline-none", dark ? "text-cream placeholder:text-cream/60" : "placeholder:text-ash")}
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Subscribe"
          className="inline-flex h-11 items-center gap-1 rounded-full bg-bonnet px-5 font-bold text-char disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <>Join <ArrowRight className="size-4" /></>}
        </button>
      </div>
      <p aria-live="polite" className={cn("mt-2 min-h-5 text-sm", msg && !msg.ok && "text-chili", dark && msg?.ok && "text-bonnet")}>
        {msg?.text}
      </p>
    </form>
  );
}
