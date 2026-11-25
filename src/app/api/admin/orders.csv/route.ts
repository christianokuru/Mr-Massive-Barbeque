import { csvResponse } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { exportOrders } from "@/server/admin";
import { adminOrNull } from "@/server/session";

/** CSV of the currently filtered orders list. */
export async function GET(req: Request) {
  if (!(await adminOrNull())) return new Response("Not found", { status: 404 });
  const p = new URL(req.url).searchParams;
  const rows = await exportOrders({
    q: p.get("q") ?? undefined,
    status: p.get("status") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
  });
  return csvResponse(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Order", "Date (Lagos)", "Status", "Customer", "Email", "Phone", "Method", "Zone", "Address", "Subtotal (NGN)", "Discount (NGN)", "Delivery (NGN)", "Total (NGN)", "Code", "Paid at"],
    ...rows.map((o) => [
      o.number,
      formatDateTime(o.createdAt),
      STATUS_LABEL[o.status as OrderStatus] ?? o.status,
      o.name,
      o.email,
      o.phone,
      o.method,
      o.zoneName ?? "",
      o.addressLine ? `${o.addressLine}, ${o.area ?? ""}` : "",
      o.subtotalKobo / 100,
      o.discountKobo / 100,
      o.deliveryKobo / 100,
      o.totalKobo / 100,
      o.couponCode ?? o.referralCode ?? "",
      o.paidAt ? formatDateTime(o.paidAt) : "",
    ]),
  ]);
}
