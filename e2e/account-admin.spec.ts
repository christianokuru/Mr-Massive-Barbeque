import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "../playwright.config";
import { declineCookies, e2eEmail, noHorizontalScroll, resetRateLimits, signIn, signUpVerified, sql } from "./utils";

const PW = "Grill-Master-2026!";

test.describe.configure({ mode: "serial" });
test.beforeAll(resetRateLimits);

test.describe("customer account", () => {
  test.beforeEach(async ({ page }) => declineCookies(page));

  test("sign-up rules, dashboard, addresses, favourites, privacy, deletion", async ({ page, isMobile }) => {
    await page.goto("/sign-up");
    await page.fill("input[name=name]", "Ada E2E");
    await page.fill("input[name=email]", e2eEmail("weak"));
    await page.fill("input[name=password]", "short");
    await page.click("button[type=submit]");
    await expect(page.getByText("Password too weak: it must be at least 8 characters.")).toBeVisible();

    const email = e2eEmail("customer");
    await signUpVerified(page, email, PW, "Ada Okafor");
    await signIn(page, email, PW);
    await page.waitForURL(/\/account$/);
    if (isMobile) await expect(page.getByTestId("account-tabbar")).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    // Review blocked for non-buyers
    await page.goto("/menu/grilled-croaker");
    await page.getByTestId("write-review").click();
    await page.locator("textarea").fill("Lovely fish, really tasty and hot.");
    await page.getByRole("button", { name: "Submit review" }).click();
    await expect(page.getByText("Only customers who received this item can review it.")).toBeVisible();

    // Favourite
    await page.getByTestId("favourite-button").click();
    await expect(page.getByTestId("favourite-button")).toHaveAttribute("aria-pressed", "true");
    await page.goto("/account/favourites");
    await expect(page.locator("article:visible")).toHaveCount(1);

    // Address
    await page.goto("/account/addresses");
    const form = page.getByTestId("address-form");
    await form.locator("input[name=phone]").fill("08031112222");
    await form.locator("input[name=line1]").fill("5 Bourdillon Road");
    await form.locator("input[name=area]").fill("Ikoyi");
    await form.locator("select").selectOption({ index: 2 });
    await form.getByRole("button", { name: "Save address" }).click();
    await expect(page.locator("[data-testid=address-card]:visible")).toHaveCount(1);

    // Rewards + privacy
    await page.goto("/account/rewards");
    await expect(page.getByTestId("referral-code")).toHaveText(/^[A-Z]+-[A-Z0-9]{4}$/);
    await page.goto("/account/settings");
    await page.getByTestId("marketing-toggle").click();
    await expect(page.getByTestId("marketing-toggle")).toHaveAttribute("aria-checked", "true");
    const data = await (await page.request.get("/account/export")).json();
    expect(data.account.email).toBe(email);
    expect(data.addresses).toHaveLength(1);

    // Delete: wrong password rejected, then deleted (orders kept)
    const del = page.getByTestId("delete-account-form");
    await del.locator("input").fill("wrong-password-123");
    await del.getByRole("button", { name: "Delete my account" }).click();
    await page.getByTestId("confirm-ok").click();
    await expect(del.getByRole("alert")).toContainText("isn't right");
    await del.locator("input").fill(PW);
    await del.getByRole("button", { name: "Delete my account" }).click();
    await page.getByTestId("confirm-ok").click();
    await page.waitForURL(/\?deleted=1/);
    const rows = await sql`select id from "user" where email = ${email}`;
    expect(rows).toHaveLength(0);
  });
});

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => declineCookies(page));

  test("admin lands on /admin and manages the store", async ({ page }, testInfo) => {
    // Fresh throwaway admin each run (never the real ADMIN_EMAIL).
    await sql`delete from "user" where email = ${E2E_ADMIN}`;
    await signUpVerified(page, E2E_ADMIN, PW, "Test Admin");
    await signIn(page, E2E_ADMIN, PW);
    await page.waitForURL(/\/admin$/);
    await expect(page.getByTestId("sales-chart")).toBeVisible();
    await page.getByTestId("range-switch").getByRole("link", { name: "7 days" }).click();
    await expect(page).toHaveURL(/range=7/);

    // Orders: phone search (local format), CSV with filter
    await page.goto("/admin/orders?q=0803%20123");
    const rows = await page.locator("[data-testid=order-row]:visible").count();
    expect(rows).toBeGreaterThan(0);
    const csv = await (await page.request.get(`/api/admin/orders.csv?q=0803%20123`)).text();
    expect(csv.trim().split("\n").length).toBe(rows + 1);

    // Regulars: stats + list render for every range, page fits the screen
    for (const range of ["30", "0"]) {
      await page.goto(`/admin/regulars?range=${range}`);
      await expect(page.getByRole("heading", { name: "Regulars", exact: true })).toBeVisible();
      await expect(page.getByTestId("regulars-list")).toBeVisible();
      await expect(page.getByTestId("regulars-top-items")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }

    // Settings: invalid WhatsApp rejected, banner shows on storefront.
    // Desktop only: both projects editing the one settings row at once would race.
    if (testInfo.project.name === "desktop") {
      await page.goto("/admin/settings");
      // The test DB is the real store: remember the owner's settings and put them back after.
      const original = {
        whatsapp: await page.locator("input[name=whatsapp]").inputValue(),
        bannerDesktop: await page.locator("input[name=bannerDesktop]").inputValue(),
        bannerMobile: await page.locator("input[name=bannerMobile]").inputValue(),
      };
      await page.locator("input[name=whatsapp]").fill("123");
      await page.getByTestId("save-settings").click();
      await expect(page.getByTestId("settings-error")).toBeVisible();
      const banner = `E2E banner ${Date.now()}`;
      await page.locator("input[name=whatsapp]").fill("0803 123 4567");
      await page.locator("input[name=bannerDesktop]").fill(banner);
      await page.locator("input[name=bannerMobile]").fill(banner);
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Settings saved")).toBeVisible();
      await page.goto("/");
      await expect(page.getByTestId("announcement")).toContainText(banner);
      await page.goto("/admin/settings");
      for (const [k, v] of Object.entries(original)) await page.locator(`input[name=${k}]`).fill(v);
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Settings saved")).toBeVisible();
    }

    // Products: fake upload rejected
    await page.goto("/admin/products");
    await page.locator("[data-testid=product-row] a").first().click();
    await page.getByTestId("image-upload-input").setInputFiles({ name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("nope") });
    await expect(page.getByTestId("upload-error")).toContainText("not a valid image");
  });
});
