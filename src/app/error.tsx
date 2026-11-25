"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn("[app error]", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <p className="eyebrow">Something burnt</p>
      <h1 className="text-[length:clamp(30px,8.5vw,44px)] leading-[0.9] md:text-heading-lg">We dropped that one</h1>
      <p className="max-w-md text-body-lg text-smoke">Something went wrong on our side. Try again, and if it keeps happening, message us on WhatsApp.</p>
      {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Try again</button>
        <Link href="/" className="inline-flex h-12 items-center rounded-full border-2 border-oxblood px-6 font-bold text-oxblood">Home</Link>
      </div>
    </main>
  );
}
