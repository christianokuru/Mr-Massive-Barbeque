"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { retryPayment } from "@/app/actions/checkout";

export function RetryPayButton({ number, email, label = "Pay now" }: { number: string; email: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await retryPayment(number, email);
            if (res.ok) window.location.assign(res.redirectUrl);
            else setError(res.error);
          })
        }
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-bonnet px-6 font-bold text-char disabled:opacity-70"
        data-testid="retry-pay"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : null}
        {label}
      </button>
      {error ? <p className="text-sm font-bold text-chili" role="alert">{error}</p> : null}
    </div>
  );
}
