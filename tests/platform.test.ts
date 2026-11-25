import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
vi.mock("web-push", () => ({ setVapidDetails: vi.fn(), sendNotification: (...args: unknown[]) => sendNotification(...args) }));

import { db } from "@/db";
import * as s from "@/db/schema";
import { csvCell, escapeLike, jsonLd } from "@/lib/csv";
import { normalizePhone, safeNext } from "@/lib/validation";
import { reviewPrompts, runningLow } from "@/server/account";
import { createOrder, settlePayment } from "@/server/orders";
import { isAllowedPushEndpoint, pushToAdmin } from "@/server/push";
import { deleteImage, ImageValidationError, uploadImage } from "@/server/storage";
import { cartLinesFor, checkoutInput, cleanup, makeProduct, makeUser, testEmail } from "./helpers";

beforeAll(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterAll(async () => {
  await cleanup();
  await db.$client.end();
});

describe("escaping and redirects", () => {
  it("neutralises CSV formula injection", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+234803")).toBe("'+234803");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("Ada, Lekki")).toBe('"Ada, Lekki"');
    expect(csvCell(12500)).toBe("12500");
  });
  it("escapes LIKE wildcards and JSON-LD <", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(jsonLd({ a: "</script><script>" })).not.toContain("</script>");
  });
  it("only allows same-origin relative next paths", () => {
    expect(safeNext("/account/orders?x=1")).toBe("/account/orders?x=1");
    expect(safeNext("https://evil.com")).toBe("/account");
    expect(safeNext("//evil.com")).toBe("/account");
    expect(safeNext("/\\evil.com")).toBe("/account");
    expect(safeNext("javascript:alert(1)")).toBe("/account");
  });
  it("normalises Nigerian phone numbers", () => {
    expect(normalizePhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("image uploads", () => {
  it("rejects files that aren't real images", async () => {
    await expect(uploadImage(Buffer.from("definitely not an image"))).rejects.toBeInstanceOf(ImageValidationError);
  });
  it("rejects images that are too small", async () => {
    const tiny = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#5a1309" } }).png().toBuffer();
    await expect(uploadImage(tiny)).rejects.toThrow(/at least 400px/);
  });
  it("uploads a valid image as WebP with EXIF stripped", async () => {
    const img = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ffb627" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-gps-test" } })
      .toBuffer();
    const url = await uploadImage(img, "site");
    expect(url).toMatch(/\.webp$/);
    const res = await fetch(url);
    const body = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(body).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(res.headers.get("cache-control")).toContain("immutable");
    await deleteImage(url);
  });
});

describe("admin push alerts", () => {
  it("only accepts real push-service endpoints (SSRF guard)", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedPushEndpoint("https://evil.com/fcm.googleapis.com")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
  });

  it("sends only to the admin's devices and drops expired subscriptions", async () => {
    const admin = await makeUser(testEmail("admin"));
    const other = await makeUser(testEmail("other"));
    process.env.ADMIN_EMAIL = admin.email;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test";
    process.env.VAPID_PRIVATE_KEY = "test";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    await db.insert(s.pushSubscription).values([
      { userId: admin.id, endpoint: `https://fcm.googleapis.com/fcm/send/live-${admin.id}`, p256dh: "p".repeat(20), auth: "a".repeat(10) },
      { userId: admin.id, endpoint: `https://fcm.googleapis.com/fcm/send/gone-${admin.id}`, p256dh: "p".repeat(20), auth: "a".repeat(10) },
      { userId: other.id, endpoint: `https://fcm.googleapis.com/fcm/send/other-${other.id}`, p256dh: "p".repeat(20), auth: "a".repeat(10) },
    ]);
    sendNotification.mockReset();
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.includes("gone-")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
    });
    const res = await pushToAdmin({ title: "t", body: "b", url: "/admin" });
    expect(res.sent).toBe(1);
    expect(res.removed).toBe(1);
    const called = sendNotification.mock.calls.map((c) => (c[0] as { endpoint: string }).endpoint);
    expect(called.some((e) => e.includes(other.id))).toBe(false);
    const left = await db.select().from(s.pushSubscription).where(eq(s.pushSubscription.userId, admin.id));
    expect(left).toHaveLength(1);
  });
});

describe("customer dashboard scoping", () => {
  it("running-low and review prompts include guest orders with the same email, never other people's", async () => {
    const { product, variant } = await makeProduct({ stock: 20, reorderDays: 1 });
    const me = await makeUser(testEmail("me"));
    const stranger = testEmail("stranger");

    // A guest order placed with my email (before I had an account), delivered 3 days ago.
    const mine = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const a = await createOrder(checkoutInput(mine.lines, me.email));
    await settlePayment(a.reference, { status: "success", reference: a.reference, amount: a.order.totalKobo, currency: "NGN" });
    await db.update(s.order).set({ status: "delivered", paidAt: new Date(Date.now() - 3 * 86_400_000) }).where(eq(s.order.id, a.order.id));

    // Someone else's order of the same product.
    const theirs = await cartLinesFor([{ variantId: variant.id, qty: 1 }]);
    const b = await createOrder(checkoutInput(theirs.lines, stranger));
    await settlePayment(b.reference, { status: "success", reference: b.reference, amount: b.order.totalKobo, currency: "NGN" });
    await db.update(s.order).set({ status: "delivered", paidAt: new Date(Date.now() - 3 * 86_400_000) }).where(eq(s.order.id, b.order.id));

    const low = await runningLow(me.id, me.email);
    expect(low.map((r) => r.product_id)).toContain(product.id);
    const prompts = await reviewPrompts(me.id, me.email);
    expect(prompts.map((r) => r.product_id)).toContain(product.id);

    const other = await makeUser(testEmail("nobody"));
    expect((await runningLow(other.id, other.email)).map((r) => r.product_id)).not.toContain(product.id);
    expect((await reviewPrompts(other.id, other.email)).map((r) => r.product_id)).not.toContain(product.id);
  });
});
