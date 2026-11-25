/** Order status state machine shared by server and UI. Client-safe. */

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "expired",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  preparing: "On the grill",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
};

/** Pickup orders use a different label for the "ready" step. */
export function statusLabel(status: OrderStatus, method: "delivery" | "pickup" | string) {
  if (method === "pickup" && status === "out_for_delivery") return "Ready for pickup";
  if (method === "pickup" && status === "delivered") return "Picked up";
  return STATUS_LABEL[status];
}

export const PAID_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "refunded",
];

/** Statuses that count towards revenue. */
export const REVENUE_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

/** Allowed admin transitions. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["cancelled"],
  confirmed: ["preparing", "out_for_delivery", "cancelled", "refunded"],
  preparing: ["out_for_delivery", "cancelled", "refunded"],
  out_for_delivery: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  expired: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Customer-facing tracker steps. */
export const TRACKER_STEPS = ["confirmed", "preparing", "out_for_delivery", "delivered"] as const;

export function trackerIndex(status: OrderStatus) {
  const i = (TRACKER_STEPS as readonly string[]).indexOf(status);
  return i;
}

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

/** Tone for status badges. */
export function statusTone(status: OrderStatus): "neutral" | "warn" | "good" | "bad" | "info" {
  switch (status) {
    case "pending_payment":
      return "warn";
    case "confirmed":
    case "preparing":
      return "info";
    case "out_for_delivery":
      return "info";
    case "delivered":
      return "good";
    case "cancelled":
    case "expired":
    case "refunded":
      return "bad";
  }
}
