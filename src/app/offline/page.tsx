import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

/** Served by the service worker when there's no connection. Fully static. */
export default function Offline() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <Image src="/brand/logo.png" alt="Massive Barbeque" width={467} height={530} className="h-24 w-auto" />
      <h1 className="text-[length:clamp(30px,8.5vw,44px)] leading-[0.9]">The grill can&apos;t reach you</h1>
      <p className="max-w-sm text-body-lg text-smoke">You&apos;re offline. Check your connection and try again. Your bag is saved.</p>
      <Link href="/" className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Try again</Link>
    </main>
  );
}
