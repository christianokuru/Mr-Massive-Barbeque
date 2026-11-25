"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Explain push failures in plain steps (logged with console.warn, not error). */
function explain(err: unknown): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.warn("[push]", msg);
  if (/push service error|Registration failed/i.test(msg)) {
    return "The browser couldn't reach its push service. In Brave, turn on Settings → Privacy → \"Use Google services for push messaging\". VPNs or ad-blocking DNS can also block fcm.googleapis.com.";
  }
  if (/denied|NotAllowedError|permission/i.test(msg)) {
    return "Notifications are blocked for this site. Click the lock icon in the address bar → Notifications → Allow, then try again.";
  }
  if (/AbortError/i.test(msg)) return "The browser cancelled the subscription. Try again, or check notification settings for this browser.";
  return msg;
}

type State = "loading" | "unsupported" | "ios-home" | "off" | "on" | "no-key";

export function PushCard({ vapidKey }: { vapidKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!vapidKey) next = "no-key";
      else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        const ios = /iPhone|iPad/.test(navigator.userAgent);
        next = ios ? "ios-home" : "unsupported";
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        next = sub ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })().catch(() => !cancelled && setState("off"));
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  const turnOn = () =>
    start(async () => {
      setError(null);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") throw new Error("NotAllowedError: permission " + perm);
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
        const res = await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Server refused (${res.status})`);
        setState("on");
        toast.success("Order alerts are on for this device");
      } catch (e) {
        setError(explain(e));
      }
    });

  const test = () =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/admin/push", { method: "PUT" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) toast.success(`Test sent to ${body.sent} device${body.sent === 1 ? "" : "s"}`);
      else setError(explain(new Error(body.error ?? `Failed (${res.status})`)));
    });

  const turnOff = () =>
    start(async () => {
      setError(null);
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Order alerts turned off on this device");
    });

  return (
    <section className="flex flex-col gap-3 rounded-card bg-white p-5" data-testid="push-card">
      <div className="flex items-center gap-2">
        {state === "on" ? <Bell className="size-5 text-oxblood" /> : <BellOff className="size-5 text-ash" />}
        <h2 className="font-sans text-body-lg font-bold">Order alerts</h2>
        <span className="ml-auto text-xs font-bold text-muted-foreground">{state === "on" ? "On for this device" : state === "loading" ? "" : "Off"}</span>
      </div>
      <p className="text-sm text-muted-foreground">Get a phone or laptop notification the moment a paid order lands.</p>
      {state === "no-key" ? <p className="rounded-xl bg-sand p-3 text-sm">Add <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code> and <code>VAPID_SUBJECT</code> to enable alerts.</p> : null}
      {state === "unsupported" ? <p className="rounded-xl bg-sand p-3 text-sm">This browser doesn&apos;t support push. Use Chrome or Edge on a laptop, or Chrome on Android.</p> : null}
      {state === "ios-home" ? <p className="rounded-xl bg-sand p-3 text-sm">On iPhone, tap Share → Add to Home Screen, open the store from that icon, then turn alerts on here.</p> : null}
      <div className="flex flex-wrap gap-2">
        {state === "off" ? (
          <button type="button" onClick={turnOn} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-full bg-bonnet px-4 text-sm font-bold">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />} Turn on
          </button>
        ) : null}
        {state === "on" ? (
          <>
            <button type="button" onClick={test} disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-full bg-char px-4 text-sm font-bold text-cream">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send test
            </button>
            <button type="button" onClick={turnOff} disabled={pending} className="inline-flex h-10 items-center rounded-full border-2 border-line px-4 text-sm font-bold">Turn off</button>
          </>
        ) : null}
      </div>
      {error ? <p className="rounded-xl bg-[#f6d6d0] p-3 text-sm font-bold text-[#7a1a0c]" role="alert">{error}</p> : null}
    </section>
  );
}
