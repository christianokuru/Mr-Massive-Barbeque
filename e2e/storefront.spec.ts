import { expect, test } from "@playwright/test";
import { declineCookies, e2eEmail, noHorizontalScroll, resetRateLimits, sql, uid } from "./utils";

test.beforeAll(resetRateLimits);

test.describe("storefront", () => {
  test.beforeEach(async ({ page }) => declineCookies(page));

  test("pages fit a phone without horizontal scroll", async ({ page }) => {
    for (const path of ["/", "/menu", "/menu/grilled-catfish", "/combos", "/cart", "/checkout", "/track", "/quiz", "/journal", "/faq", "/shipping", "/sign-in", "/sign-up"]) {
      await page.goto(path);
      expect(await noHorizontalScroll(page), path).toBe(true);
    }
  });

  test("search, filters and empty state", async ({ page }) => {
    await page.goto("/menu");
    await page.getByTestId("menu-search").fill("plantain");
    await expect(page.getByTestId("result-count")).toHaveText(/2 items/);
    await page.getByTestId("menu-search").fill("zzzz-nothing");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
    await page.goto("/category/sides");
    await expect(page.locator("article:visible")).toHaveCount(4);
  });

  test("mobile menu opens and navigates", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByTestId("mobile-menu-button").click();
    await page.getByRole("link", { name: "Combos", exact: true }).click();
    await expect(page).toHaveURL(/\/combos$/);
  });

  test("bag: add, triple-tap, combo, qty, checkout validation, coupon, pay", async ({ page, isMobile }) => {
    await page.goto("/cart");
    await expect(page.getByText("Your bag is empty")).toBeVisible();

    await page.goto("/menu/grilled-catfish");
    await page.getByTestId("variant-option").nth(1).click();
    // Triple tap must not add three times.
    const add = page.getByTestId("add-to-bag");
    await add.click();
    await add.click({ force: true }).catch(() => undefined);
    await add.click({ force: true }).catch(() => undefined);
    await expect(page.getByTestId("bag-count")).toHaveText(/^[1-3]$/);

    if (isMobile) {
      await page.evaluate(() => window.scrollTo(0, 1600));
      await expect(page.getByTestId("sticky-add")).toBeVisible();
    }

    await page.goto("/combos/catfish-feast");
    await page.getByTestId("add-combo").click();
    await expect(page.getByText("Added to your bag")).toBeVisible();

    await page.goto("/cart");
    await expect(page.locator("[data-testid=cart-line]:visible")).toHaveCount(2);
    await expect(page.getByTestId("free-delivery-bar")).toBeVisible();
    const qtyBefore = await page.locator("[data-testid=line-qty]:visible").first().innerText();
    await page.getByRole("button", { name: "Increase quantity" }).first().click();
    await expect(page.locator("[data-testid=line-qty]:visible").first()).not.toHaveText(qtyBefore);

    await page.getByTestId("checkout-link").click();
    await page.getByTestId("place-order").click();
    await expect(page.getByTestId("checkout-error")).toContainText("fix the highlighted");

    const email = e2eEmail("buyer");
    await page.fill("input[name=email]", email);
    // People often keep the 0 after +234: must be accepted
    await page.fill("input[name=phone]", "+234 0803 123 4567");
    await page.fill("input[name=name]", "E2E Buyer");
    await page.getByTestId("zone-select").selectOption({ index: 1 });
    await page.fill("input[name=address]", "12 Admiralty Way");
    await page.fill("input[name=area]", "Lekki Phase 1");
    // A wrong code, then cleared, must not block checkout
    await page.getByTestId("code-input").fill("NOTAREALCODE");
    await page.getByTestId("apply-code").click();
    await expect(page.getByText("That code isn't valid.")).toBeVisible();
    await page.getByTestId("code-input").fill("");
    await expect(page.getByText("That code isn't valid.")).toBeHidden();
    await page.getByTestId("code-input").fill("WELCOME10");
    await page.getByTestId("apply-code").click();
    await expect(page.getByTestId("discount")).toContainText("-₦");
    await page.getByTestId("place-order").click();
    await page.waitForURL(/checkout\.paystack\.com/, { timeout: 30_000 });

    const [order] = await sql`select status, discount_kobo from "order" where email = ${email}`;
    expect(order.status).toBe("pending_payment");
    expect(Number(order.discount_kobo)).toBeGreaterThan(0);
  });

  test("without payment keys the order is cancelled and stock returned", async ({ page }) => {
    const base = "http://localhost:3001";
    const [before] = await sql`select v.id, v.stock from product_variant v join product p on p.id = v.product_id where p.slug = 'yam-fries'`;
    await page.goto(`${base}/menu/yam-fries`);
    await page.getByTestId("add-to-bag").click();
    await expect(page.getByText("Added to your bag")).toBeVisible();
    await page.goto(`${base}/checkout`);
    const email = e2eEmail("nopay");
    await page.fill("input[name=email]", email);
    await page.fill("input[name=phone]", "08031234567");
    await page.fill("input[name=name]", "No Pay");
    await page.getByTestId("method-pickup").click();
    await page.getByTestId("place-order").click();
    await expect(page.getByTestId("checkout-error")).toContainText("isn't available");
    const [order] = await sql`select status from "order" where email = ${email}`;
    expect(order.status).toBe("cancelled");
    const [after] = await sql`select stock from product_variant where id = ${before.id}`;
    expect(after.stock).toBe(before.stock);
  });

  test("track order, newsletter and quiz", async ({ page }) => {
    await page.goto("/track");
    await page.fill("input[placeholder='MB-XXXX-XXXX']", "MB-AAAA-AAAA");
    await page.fill("input[type=email]", "nobody@example.com");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("track-form").getByRole("alert")).toContainText("couldn't find");

    await page.goto("/");
    const nl = page.getByTestId("newsletter-form").last();
    await nl.locator("input").fill(e2eEmail("news"));
    await nl.getByRole("button", { name: "Subscribe" }).click();
    await expect(nl).toContainText("WELCOME10");

    await page.goto("/quiz");
    for (let i = 0; i < 4; i++) await page.getByTestId("quiz-option").first().click();
    await page.getByTestId("quiz-submit").click();
    await page.waitForURL(/\/quiz\/results\//);
    await expect(page.locator("article:visible").first()).toBeVisible();
  });
});

test("consent gates analytics", async ({ page }) => {
  const analytics: string[] = [];
  page.on("request", (r) => /googletagmanager|clarity\.ms|facebook\.net/.test(r.url()) && analytics.push(r.url()));
  await page.goto("/");
  await expect(page.getByTestId("consent-banner")).toBeVisible();
  await page.waitForTimeout(1000);
  expect(analytics).toHaveLength(0);
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByTestId("consent-banner")).toBeHidden();
  await page.getByRole("button", { name: "Cookie settings" }).click();
  await expect(page.getByTestId("consent-banner")).toBeVisible();
});

test("return from Paystack shows success even with the reference repeated in the URL", async ({ page }) => {
  await declineCookies(page);
  const email = e2eEmail("paid");
  const number = `MB-E2E-${uid()}`;
  const ref = `${number}-REF`;
  const [o] = await sql`insert into "order" (number, email, phone, name, method, status, subtotal_kobo, total_kobo, payment_expires_at, paid_at)
    values (${number}, ${email}, '+2348031234567', 'Ada Paid', 'pickup', 'confirmed', 1200000, 1200000, now() + interval '1 hour', now()) returning id`;
  await sql`insert into payment (order_id, reference, amount_kobo, status) values (${o.id}, ${ref}, 1200000, 'success')`;
  try {
    // Paystack adds ?trxref=…&reference=… on top of our own ?reference=…
    await page.goto(`/checkout/complete?reference=${ref}&trxref=${ref}&reference=${ref}`);
    await expect(page.getByRole("heading", { name: /on the grill, Ada/ })).toBeVisible();
  } finally {
    await sql`delete from "order" where id = ${o.id}`;
  }
});
