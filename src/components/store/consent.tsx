"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const KEY = "mb_consent";
type Choice = "accepted" | "declined" | null;
const EVT = "mb:consent-change";

function read(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Only well-formed IDs are ever inlined into scripts. */
const GA = /^G-[A-Z0-9]{4,12}$/.test(process.env.NEXT_PUBLIC_GA_ID ?? "") ? process.env.NEXT_PUBLIC_GA_ID! : null;
const CLARITY = /^[a-z0-9]{6,14}$/.test(process.env.NEXT_PUBLIC_CLARITY_ID ?? "") ? process.env.NEXT_PUBLIC_CLARITY_ID! : null;
const PIXEL = /^\d{8,20}$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "") ? process.env.NEXT_PUBLIC_META_PIXEL_ID! : null;

export function openCookieSettings() {
  window.dispatchEvent(new Event("mb:cookie-settings"));
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}

export function ConsentAndAnalytics() {
  // "unset" on the server so nothing renders until the client knows the stored choice.
  const choice = useSyncExternalStore<Choice | "unset">(subscribe, read, () => "unset");
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener("mb:cookie-settings", reopen);
    return () => window.removeEventListener("mb:cookie-settings", reopen);
  }, []);

  const open = choice === null || reopened;

  function decide(c: "accepted" | "declined") {
    const wasAccepted = choice === "accepted";
    try {
      localStorage.setItem(KEY, c);
    } catch {}
    setReopened(false);
    window.dispatchEvent(new Event(EVT));
    // Turning analytics off after it loaded needs a reload to unload scripts.
    if (wasAccepted && c === "declined") window.location.reload();
  }

  return (
    <>
      {choice === "accepted" && GA ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA}');`}
          </Script>
        </>
      ) : null}
      {choice === "accepted" && CLARITY ? (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY}");`}
        </Script>
      ) : null}
      {choice === "accepted" && PIXEL ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="Cookie consent"
          data-testid="consent-banner"
          className="fixed inset-x-3 z-50 mx-auto max-w-xl rounded-card border border-line bg-white p-5 shadow-[var(--shadow-lift)] md:inset-x-auto md:left-6"
          style={{ bottom: "calc(12px + var(--bottom-bar, 0px) + env(safe-area-inset-bottom, 0px))" }}
        >
          <p className="font-bold">Cookies, but make it spicy</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We use analytics cookies to see what people love and improve the site. Your bag and sign-in work either way.{" "}
            <Link href="/privacy" className="underline">Privacy policy</Link>
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => decide("accepted")} className="h-11 flex-1 rounded-full bg-bonnet font-bold text-char">
              Accept
            </button>
            <button type="button" onClick={() => decide("declined")} className="h-11 flex-1 rounded-full border-2 border-oxblood font-bold text-oxblood">
              Decline
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
