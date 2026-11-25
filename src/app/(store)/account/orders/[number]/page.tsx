import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BuyAgainButton } from "@/components/account/account-ui";
import { OrderDetails } from "@/components/store/order-details";
import { RetryPayButton } from "@/components/store/retry-pay";
import { getMyOrderByNumber } from "@/server/account";
import { loadOrderView } from "@/server/order-view";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function OrderPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const session = await requireUser(`/account/orders/${number}`);
  // Scoped to this user's own orders (or guest orders with their verified email).
  const id = await getMyOrderByNumber(session.user.id, session.user.email, number.slice(0, 20));
  const o = id ? await loadOrderView(id) : null;
  if (!o) notFound();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/account/orders" className="inline-flex w-fit items-center gap-1 text-sm font-bold"><ChevronLeft className="size-4" /> All orders</Link>
      <h1 className="text-[40px] leading-[0.9] md:text-heading-lg">Order {o.number}</h1>
      <div className="rounded-card bg-white p-5">
        <OrderDetails o={o} showTimeline />
      </div>
      <div className="flex flex-wrap gap-3">
        {o.payable ? <RetryPayButton number={o.number} email={o.email} label="Complete payment" /> : null}
        {o.paidAt ? <BuyAgainButton number={o.number} /> : null}
      </div>
    </div>
  );
}
