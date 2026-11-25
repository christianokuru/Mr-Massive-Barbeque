"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { currentSubscription, explainPushError, isIos, pushSupported, subscribeThisDevice, VAPID_PUBLIC_KEY } from "@/lib/push-client";

type State = "loading" | "hidden" | "ios-home" | "off" | "on";

/**
 * "Notify me on this phone" for one order. Works for guests: access is the same as the
 * live status (signed-in owner, or the order email). Alerts stop once the order is finished.
 */
export function OrderPushButton({ number, email }: { number: string; email?: string }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const base = `/api/orders/${encodeURIComponent(number)}/push`;

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<State> => {
      if (!VAPID_PUBLIC_KEY) return "hidden";
      if (!pushSupported()) return isIos() ? "ios-home" : "hidden";
      const sub = await currentSubscription();
      if (!sub || Notification.permission !== "granted") return "off";
      const q = new URLSearchParams({ endpoint: sub.endpoint, ...(email ? { email } : {}) });
      const res = await fetch(`${base}?${q}`);
      return res.ok && (await res.json()).on ? "on" : "off";
    })()
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setState("off"));
    return () => {
      cancelled = true;
    };
  }, [base, email]);

  const turnOn = () =>
    start(async () => {
      setError(null);
      try {
        const sub = await subscribeThisDevice(VAPID_PUBLIC_KEY!);
        const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, subscription: sub.toJSON() }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Couldn't turn on alerts (${res.status})`);
        setState("on");
      } catch (e) {
        setError(explainPushError(e));
      }
    });

  const turnOff = () =>
    start(async () => {
      setError(null);
      const sub = await currentSubscription();
      if (sub) await fetch(base, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, endpoint: sub.endpoint }) });
      // Keep the device subscription itself: it may be following other orders (or admin alerts).
      setState("off");
    });

  if (state === "loading" || state === "hidden") return null;
  return (
    <div className="flex flex-col gap-2" data-testid="order-push">
      {state === "ios-home" ? (
        <p className="rounded-2xl bg-sand px-4 py-3 text-xs">
          <span className="font-bold">Want a phone alert when your food moves?</span> On iPhone, tap Share → Add to Home Screen, then open your order from that icon.
        </p>
      ) : state === "on" ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-oxblood"><BellRing className="size-4" /> Phone alerts on for this order</span>
          <button type="button" onClick={turnOff} disabled={pending} className="font-bold text-muted-foreground underline">Turn off</button>
        </p>
      ) : (
        <button type="button" onClick={turnOn} disabled={pending} className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-char px-4 text-sm font-bold text-cream disabled:opacity-70" data-testid="order-push-on">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />} Notify me on this phone
        </button>
      )}
      {error ? <p className="rounded-xl bg-[#f6d6d0] p-3 text-xs font-bold text-[#7a1a0c]" role="alert">{error}</p> : null}
    </div>
  );
}
