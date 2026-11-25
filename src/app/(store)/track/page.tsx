import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { OrderDetails } from "@/components/store/order-details";
import { RetryPayButton } from "@/components/store/retry-pay";
import { TrackForm } from "@/components/store/track-form";
import { emailSchema } from "@/lib/validation";
import { loadOrderView } from "@/server/order-view";
import { enforceRateLimit } from "@/server/rate-limit";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Track your Massive Barbeque order with your order number and email.",
  alternates: { canonical: "/track" },
};

async function Lookup({ searchParams }: { searchParams: PageProps<"/track">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  const number = typeof sp.number === "string" ? sp.number.trim().toUpperCase().slice(0, 20) : "";
  const emailRaw = typeof sp.email === "string" ? sp.email : "";
  if (!number || !emailRaw) return <TrackForm />;

  let limited = false;
  try {
    await enforceRateLimit("order-lookup-page", 20, 600);
  } catch {
    limited = true;
  }
  const email = emailSchema.safeParse(emailRaw);
  const [row] =
    !limited && email.success
      ? await db.select({ id: s.order.id }).from(s.order).where(and(eq(s.order.number, number), eq(s.order.email, email.data)))
      : [];
  const o = row ? await loadOrderView(row.id) : null;
  if (!o) {
    return <TrackForm error={limited ? "Too many lookups. Please wait a few minutes." : "We couldn't find an order with those details."} number={number} email={emailRaw} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-line p-5" data-testid="track-result">
        <OrderDetails o={o} />
      </div>
      {o.payable ? <RetryPayButton number={o.number} email={o.email} label="Complete payment" /> : null}
    </div>
  );
}

export default function TrackPage({ searchParams }: PageProps<"/track">) {
  return (
    <div className="container-page max-w-3xl py-10 md:py-16">
      <p className="eyebrow mb-3">Track order</p>
      <h1 className="mb-8 text-[48px] leading-[0.88] md:text-display">Where&apos;s my BBQ?</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-sand" />}>
        <Lookup searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
