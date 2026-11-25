import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CheckoutForm } from "@/components/store/checkout-form";
import { EmptyState } from "@/components/store/bits";
import { formatNaira } from "@/lib/money";
import { getCurrentCartLines } from "@/server/cart";
import { getZones } from "@/server/catalogue";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function Checkout() {
  const [lines, zones, session] = await Promise.all([getCurrentCartLines(), getZones(), getSession()]);
  if (!lines.length) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Add something from the grill first."
        action={<Link href="/menu" className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Browse the menu</Link>}
      />
    );
  }
  if (lines.some((l) => !l.available)) {
    return (
      <EmptyState
        title="Some items just sold out"
        body="Update your bag and try again."
        action={<Link href="/cart" className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Review bag</Link>}
      />
    );
  }
  const user = session?.user.emailVerified ? session.user : null;
  const [addresses, profile] = user
    ? await Promise.all([
        db.select().from(s.address).where(eq(s.address.userId, user.id)).orderBy(desc(s.address.isDefault), desc(s.address.createdAt)),
        db.select().from(s.profile).where(eq(s.profile.userId, user.id)).then((r) => r[0]),
      ])
    : [[], undefined];

  return (
    <CheckoutForm
      zones={zones.map((z) => ({ id: z.id, name: z.name, areas: z.areas, fee: formatNaira(z.feeKobo), eta: z.etaText }))}
      addresses={addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1, area: a.area, zoneId: a.zoneId, phone: a.phone }))}
      lines={lines.map((l) => ({ name: l.name, size: l.size, qty: l.qty, total: formatNaira(l.unitKobo * l.qty) }))}
      prefill={{ email: user?.email ?? "", name: user?.name ?? "", phone: profile?.phone ?? "" }}
      signedIn={!!user}
      analytics={{
        value: lines.reduce((sum, l) => sum + (l.unitKobo * l.qty) / 100, 0),
        items: lines.map((l) => ({ item_id: l.kind === "variant" ? String(l.variantId) : `combo-${l.comboId}`, item_name: l.name, price: l.unitKobo / 100, quantity: l.qty })),
      }}
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="mb-8 text-[48px] leading-[0.88] md:text-display">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-sand" />}>
        <Checkout />
      </Suspense>
    </div>
  );
}
