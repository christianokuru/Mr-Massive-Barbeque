import { expect, test } from "@playwright/test";

test.describe("security probes", () => {
  test("webhook without a valid signature → 401", async ({ request }) => {
    const res = await request.post("/api/paystack/webhook", { data: { event: "charge.success", data: { reference: "x" } }, headers: { "x-paystack-signature": "forged" } });
    expect(res.status()).toBe(401);
  });

  test("cron without the secret → 401", async ({ request }) => {
    expect((await request.get("/api/cron/daily")).status()).toBe(401);
    expect((await request.get("/api/cron/daily", { headers: { Authorization: "Bearer wrong" } })).status()).toBe(401);
  });

  test("admin pages and APIs → 404 for guests", async ({ request }) => {
    for (const path of ["/admin", "/admin/orders", "/admin/settings", "/api/admin/orders.csv", "/api/admin/subscribers.csv"]) {
      expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
    }
    expect((await request.post("/api/admin/upload", { multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } } })).status()).toBe(404);
    expect((await request.put("/api/admin/push")).status()).toBe(404);
  });

  test("account requires sign-in", async ({ request }) => {
    const res = await request.get("/account/orders", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("/sign-in?next=%2Faccount%2Forders");
    expect((await request.get("/account/export", { maxRedirects: 0 })).status()).toBe(307);
  });

  test("open redirects are blocked", async ({ request }) => {
    const res = await request.get("/auth/after?next=https://evil.example.com", { maxRedirects: 0 });
    expect(res.headers().location).not.toContain("evil.example.com");
  });

  test("unknown catalogue URLs return a real 404", async ({ request }) => {
    for (const path of ["/menu/nope", "/category/nope", "/combos/nope", "/journal/nope"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("security headers", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});
