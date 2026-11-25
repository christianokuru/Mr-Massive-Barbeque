import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import type { OrderStatus } from "@/lib/order-status";

export type OrderView = Awaited<ReturnType<typeof loadOrderView>>;

/** Full order view (caller must have authorised access to this order id). */
export async function loadOrderView(orderId: number) {
  const [o] = await db.select().from(s.order).where(eq(s.order.id, orderId));
  if (!o) return null;
  const [items, events] = await Promise.all([
    db.select().from(s.orderItem).where(eq(s.orderItem.orderId, orderId)).orderBy(asc(s.orderItem.id)),
    db.select().from(s.orderEvent).where(eq(s.orderEvent.orderId, orderId)).orderBy(asc(s.orderEvent.createdAt), asc(s.orderEvent.id)),
  ]);
  // Date each tracker step was reached.
  const reached: Partial<Record<OrderStatus, Date>> = {};
  for (const e of events) if (e.toStatus && !reached[e.toStatus as OrderStatus]) reached[e.toStatus as OrderStatus] = e.createdAt;
  if (o.paidAt && !reached.confirmed) reached.confirmed = o.paidAt;
  const payable = o.status === "pending_payment" && +o.paymentExpiresAt > Date.now();
  return { ...o, status: o.status as OrderStatus, items, events, reached, payable };
}
