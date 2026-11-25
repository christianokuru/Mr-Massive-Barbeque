import type { Metadata } from "next";
import Link from "next/link";
import { BuyAgainButton } from "@/components/account/account-ui";
import { EmptyState, StatusBadge } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { OrderStatus } from "@/lib/order-status";
import { listMyOrders } from "@/server/account";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function OrdersPage() {
  const session = await requireUser("/account/orders");
  const orders = await listMyOrders(session.user.id, session.user.email);
  return (
    <div>
      <h1 className="mb-8 text-[44px] leading-[0.9] md:text-heading-lg">Your orders</h1>
      {orders.length ? (
        <ul className="flex flex-col gap-3" data-testid="orders-list">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-card bg-white p-4">
              <Link href={`/account/orders/${o.number}`} className="min-w-0 flex-1">
                <span className="block font-bold">{o.number}</span>
                <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)} · {o.method === "pickup" ? "Pickup" : "Delivery"} · {formatNaira(o.totalKobo)}</span>
              </Link>
              <StatusBadge status={o.status as OrderStatus} method={o.method} />
              {o.paidAt ? <BuyAgainButton number={o.number} className="h-10 px-4 text-sm" /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No orders yet" body="When you order, you'll track it here." action={<Link href="/menu" className="inline-flex h-11 items-center rounded-full bg-bonnet px-5 font-bold">Browse the menu</Link>} />
      )}
    </div>
  );
}
