import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { OrderDetails } from "@/components/store/order-details";
import { PurchaseTracker } from "@/components/store/purchase-tracker";
import { RetryPayButton } from "@/components/store/retry-pay";
import { AutoRefresh } from "@/components/store/auto-refresh";
import { clearCart, readCartId } from "@/server/cart";
import { loadOrderView } from "@/server/order-view";
import { settlePayment } from "@/server/orders";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };

async function Result({ searchParams }: { searchParams: PageProps<"/checkout/complete">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  // Only OUR reference is used; Paystack's redirect params (status, trxref…) are ignored.
  const reference = typeof sp.reference === "string" ? sp.reference.slice(0, 100) : "";
  const [pay] = reference ? await db.select().from(s.payment).where(eq(s.payment.reference, reference)) : [];
  if (!pay) {
    return (
      <div className="text-center">
        <h1 className="text-heading">We couldn&apos;t find that payment</h1>
        <p className="mt-3 text-muted-foreground">If you were charged, your order will still be confirmed. Check your email or track your order.</p>
        <Link href="/track" className="mt-6 inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Track an order</Link>
      </div>
    );
  }

  let result;
  try {
    result = await settlePayment(reference);
  } catch {
    result = { outcome: "pending" as const, orderNumber: "" };
  }
  const o = await loadOrderView(pay.orderId);
  if (!o) return null;

  const paid = result.outcome === "paid" || result.outcome === "already_paid" || (o.paidAt && o.status !== "pending_payment");
  if (paid) {
    const cartId = await readCartId();
    if (cartId) await clearCart(cartId);
  }

  return (
    <div className="flex flex-col gap-8">
      {paid ? (
        <div className="flex flex-col items-start gap-3">
          <CheckCircle2 className="size-12 text-oxblood" />
          <h1 className="text-[length:clamp(30px,8.5vw,44px)] leading-[0.9] md:text-display">It&apos;s on the grill, {o.name.split(" ")[0]}.</h1>
          <p className="text-body-lg text-smoke">Payment received. We&apos;ve emailed your receipt to {o.email}.</p>
          <PurchaseTracker
            number={o.number}
            value={o.totalKobo / 100}
            items={o.items.map((i) => ({ item_id: String(i.variantId ?? `combo-${i.comboId}`), item_name: i.name, price: i.unitKobo / 100, quantity: i.qty }))}
          />
        </div>
      ) : result.outcome === "flagged" ? (
        <div className="flex flex-col items-start gap-3">
          <Clock className="size-12 text-oxblood" />
          <h1 className="text-heading">We received your payment</h1>
          <p className="text-body-lg text-smoke">There&apos;s a small issue we need to check by hand. Our team has been alerted and will contact you shortly.</p>
        </div>
      ) : o.status === "pending_payment" ? (
        <div className="flex flex-col items-start gap-3">
          {result.outcome === "failed" ? <XCircle className="size-12 text-chili" /> : <Clock className="size-12 text-oxblood" />}
          <h1 className="text-heading">{result.outcome === "failed" ? "Payment didn't go through" : "Confirming your payment…"}</h1>
          <p className="text-body-lg text-smoke">
            {result.outcome === "failed"
              ? "No money was taken. You can try again; your order is held until the payment window closes."
              : "Bank transfers can take a minute. This page refreshes automatically."}
          </p>
          {result.outcome !== "failed" ? <AutoRefresh seconds={8} /> : null}
          <RetryPayButton number={o.number} email={o.email} label={result.outcome === "failed" ? "Try payment again" : "Pay again"} />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <XCircle className="size-12 text-chili" />
          <h1 className="text-heading">This order has {o.status === "expired" ? "expired" : "been cancelled"}</h1>
          <p className="text-body-lg text-smoke">No payment was received in time. Your bag is still saved.</p>
          <Link href="/cart" className="inline-flex h-12 items-center rounded-full bg-bonnet px-6 font-bold">Back to my bag</Link>
        </div>
      )}
      <div className="rounded-card border border-line p-5">
        <OrderDetails o={o} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`/track?number=${encodeURIComponent(o.number)}&email=${encodeURIComponent(o.email)}`} className="inline-flex h-12 items-center rounded-full border-2 border-oxblood px-6 font-bold text-oxblood">Track this order</Link>
        <Link href="/sign-up" className="inline-flex h-12 items-center px-2 font-bold underline">Create an account for faster reorders</Link>
      </div>
    </div>
  );
}

export default function CompletePage({ searchParams }: PageProps<"/checkout/complete">) {
  return (
    <div className="container-page max-w-3xl py-10 md:py-16">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-card bg-sand" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
