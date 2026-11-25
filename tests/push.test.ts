import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Fake the push service: record what would reach the phone, and pretend one device was uninstalled.
const sent: { endpoint: string; payload: { title: string; body: string; url: string; tag: string } }[] = [];
vi.mock("web-push", () => ({
  setVapidDetails: () => undefined,
  sendNotification: async (sub: { endpoint: string }, payload: string) => {
    if (sub.endpoint.includes("gone")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
    sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
  },
}));

import { db } from "@/db";
import * as s from "@/db/schema";
import { changeOrderStatus, createOrder, settlePayment } from "@/server/orders";
import type { VerifiedTransaction } from "@/server/paystack";
import { cartLinesFor, checkoutInput, cleanup, makeProduct, testEmail } from "./helpers";

const ok = (reference: string, amount: number): VerifiedTransaction => ({ status: "success", reference, amount, currency: "NGN", channel: "card" });

beforeAll(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||= "test-public";
  process.env.VAPID_PRIVATE_KEY ||= "test-private";
  process.env.VAPID_SUBJECT ||= "mailto:test@example.com";
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterAll(async () => {
  await cleanup();
  await db.$client.end();
});

describe("customer phone alerts", () => {
  it("alerts the customer at each step, drops dead devices, and stops when the order is done", async () => {
    const { variant } = await makeProduct({ stock: 5, priceNaira: 10000 });
    const email = testEmail("push");
    const { lines } = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const { order, reference } = await createOrder(checkoutInput(lines, email));
    await settlePayment(reference, ok(reference, order.totalKobo));

    const phone = "https://fcm.googleapis.com/fcm/send/vitest-phone";
    const old = "https://fcm.googleapis.com/fcm/send/vitest-gone";
    await db.insert(s.orderPush).values([
      { orderId: order.id, endpoint: phone, p256dh: "p".repeat(20), auth: "a".repeat(12) },
      { orderId: order.id, endpoint: old, p256dh: "p".repeat(20), auth: "a".repeat(12) },
    ]);

    await changeOrderStatus(order.id, "preparing", { actor: "test" });
    expect(sent.at(-1)?.payload.title).toMatch(/on the grill/);
    expect(sent.at(-1)?.payload.url).toContain(`/track?number=${order.number}`); // guest: tracking link
    let subs = await db.select().from(s.orderPush).where(eq(s.orderPush.orderId, order.id));
    expect(subs.map((x) => x.endpoint)).toEqual([phone]); // uninstalled device removed

    await changeOrderStatus(order.id, "out_for_delivery", { actor: "test" });
    expect(sent.at(-1)?.payload.title).toMatch(/Ready for pickup/);

    await changeOrderStatus(order.id, "delivered", { actor: "test" });
    expect(sent.at(-1)?.payload.title).toMatch(/Enjoy/);
    subs = await db.select().from(s.orderPush).where(eq(s.orderPush.orderId, order.id));
    expect(subs).toHaveLength(0); // finished: no more alerts for this order
    expect(sent.every((x) => x.endpoint === phone && x.payload.tag === `order-${order.number}`)).toBe(true);
  });
});
