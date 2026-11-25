import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import type { Page } from "@playwright/test";

export const sql = neon(process.env.DATABASE_URL!);
export const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
export const e2eEmail = (tag: string) => `e2e-${tag}-${uid()}@example.com`;

/** Skip the cookie banner (consent gating has its own test). */
export async function declineCookies(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mb_consent", "declined");
    } catch {}
  });
}

export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

/** Verification links are logged to the server console when no email key is set. */
export function verificationLinkFromLog(logPath: string, email: string) {
  const log = readFileSync(logPath, "utf8");
  const re = /to=(\S+)\nsubject=Confirm your email\n[\s\S]*?\((http[^)\s]+verify-email[^)\s]+)\)/g;
  let found: string | null = null;
  for (const m of log.matchAll(re)) if (m[1] === email) found = m[2];
  return found;
}

/** Create a verified customer directly (Better Auth sign-up doesn't reveal existing emails). */
export async function signUpVerified(page: Page, email: string, password: string, name = "E2E Customer") {
  await page.goto("/sign-up");
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.getByTestId("check-email").waitFor();
  await sql`update "user" set email_verified = true where email = ${email}`;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
}

export async function resetRateLimits() {
  await sql`delete from rate_limit`;
  await sql`delete from throttle`;
}
