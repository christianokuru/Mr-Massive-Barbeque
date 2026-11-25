/** Browser-side helpers for phone/laptop notifications (admin alerts + customer order alerts). */

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;

export function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iPhone/iPad only allow web notifications from a site added to the Home Screen. */
export function isIos() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/** This device's existing push subscription, if any. */
export async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Ask permission (if needed) and return this device's push subscription. */
export async function subscribeThisDevice(vapidKey: string) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("NotAllowedError: permission " + perm);
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
}

/** Explain push failures in plain steps (logged with console.warn, not error). */
export function explainPushError(err: unknown): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.warn("[push]", msg);
  if (/push service error|Registration failed/i.test(msg)) {
    return "Your browser couldn't reach its notification service. In Brave, turn on Settings → Privacy → \"Use Google services for push messaging\". A VPN or ad-blocker can also block it.";
  }
  if (/denied|NotAllowedError|permission/i.test(msg)) {
    return "Notifications are blocked for this site. Tap the lock icon next to the web address → Notifications → Allow, then try again.";
  }
  if (/AbortError/i.test(msg)) return "The browser cancelled it. Try again, or check this browser's notification settings.";
  return msg;
}
