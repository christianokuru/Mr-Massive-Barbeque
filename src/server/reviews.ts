import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

/** Orders that make this user a verified buyer: their own orders, or guest orders with their verified email. */
export async function verifiedBuyerOrderId(userId: string, email: string, productId: number) {
  const rows = await db
    .select({ id: s.order.id })
    .from(s.order)
    .innerJoin(s.orderItem, eq(s.orderItem.orderId, s.order.id))
    .leftJoin(s.comboItem, eq(s.comboItem.comboId, s.orderItem.comboId))
    .leftJoin(s.productVariant, eq(s.productVariant.id, s.comboItem.variantId))
    .where(
      and(
        or(eq(s.order.userId, userId), eq(s.order.email, email.toLowerCase())),
        inArray(s.order.status, ["delivered"]),
        or(eq(s.orderItem.productId, productId), eq(s.productVariant.productId, productId)),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}
