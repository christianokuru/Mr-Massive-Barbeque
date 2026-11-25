"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LIVE_MAX_AGE_MS, liveCheckSeconds, statusLabel, type OrderStatus } from "@/lib/order-status";

const EMOJI: Partial<Record<OrderStatus, string>> = { preparing: "🔥", out_for_delivery: "🛵", delivered: "😋", cancelled: "", refunded: "" };

/**
 * Keeps an open order page up to date without a manual refresh.
 * Checks a tiny status endpoint (every 10s when the customer is waiting, 30s while it grills),
 * pauses when the page isn't visible, stops once the order is finished, and only
 * re-renders the page when something actually changed.
 */
export function LiveOrderStatus({
  number,
  email,
  status,
  v,
  method,
  createdAt,
}: {
  number: string;
  /** Guests (tracking page) prove access with the order email; signed-in owners don't need it. */
  email?: string;
  status: OrderStatus;
  v: string;
  method: string;
  createdAt: string;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const seen = useRef(v);
  // Show the "Update" message when the refreshed page arrives (not before), so it always
  // matches the tracker underneath it.
  const [shownV, setShownV] = useState(v);
  if (v !== shownV) {
    setShownV(v);
    const e = EMOJI[status];
    setNotice(`${statusLabel(status, method)}${e ? ` ${e}` : ""}`);
  }
  const every = liveCheckSeconds(status);
  // Read once on mount: forgotten tabs on old orders never start checking.
  const [tooOld] = useState(() => Date.now() - new Date(createdAt).getTime() > LIVE_MAX_AGE_MS);
  const live = every !== null && !tooOld;

  useEffect(() => {
    seen.current = v;
  }, [v]);

  useEffect(() => {
    if (!live || every === null) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const url = `/api/orders/${encodeURIComponent(number)}/status${email ? `?email=${encodeURIComponent(email)}` : ""}`;

    async function check() {
      if (stopped || document.hidden) return;
      let wait = every!;
      try {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (res.status === 404) return; // no access / gone: stop quietly
        if (res.ok) {
          const data = (await res.json()) as { status: OrderStatus; v: string };
          if (data.v !== seen.current) {
            seen.current = data.v;
            router.refresh(); // re-render the tracker, rider details and timeline
            // Keep checking. If the pace changes, the refreshed props restart this effect.
          }
        } else wait = 30;
      } catch {
        wait = 30; // offline / flaky network: try again more slowly
      }
      if (!stopped) timer = setTimeout(check, wait * 1000);
    }

    function onVisible() {
      clearTimeout(timer);
      if (!document.hidden) void check(); // back on the page: check straight away
    }

    timer = setTimeout(check, every * 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, every, number, email, method, router]);

  return (
    <div className="flex flex-col gap-2" data-testid="live-status">
      {notice ? (
        <p role="status" aria-live="polite" className="animate-in fade-in slide-in-from-top-1 rounded-2xl bg-bonnet px-4 py-3 text-sm font-bold text-char" data-testid="live-notice">
          Update: your order is now {notice}
        </p>
      ) : null}
      {live ? (
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-sand px-3 py-1 text-xs font-bold text-muted-foreground" data-testid="live-badge">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-oxblood opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-oxblood" />
          </span>
          Live · updates automatically
        </p>
      ) : null}
    </div>
  );
}
