import { z } from "zod";

/** Shared Zod schemas + normalisers. Client-safe. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: "Enter a valid email address." }));

/** Nigerian phone: accepts 0803..., +234803..., 234803..., +2340803..., 00234... → +234803... */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00234")) digits = digits.slice(2);
  let local: string;
  if (digits.startsWith("234")) local = digits.slice(3);
  else local = digits;
  // People often keep the 0 after +234 (e.g. +234 0803…): drop it.
  if (local.startsWith("0")) local = local.slice(1);
  if (!/^[789]\d{9}$/.test(local)) return null;
  return `+234${local}`;
}

/** Digits used for phone search: "0803 123" → "803123". */
export function phoneSearchDigits(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00234")) digits = digits.slice(2);
  if (digits.startsWith("234")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export const PHONE_HINT = "e.g. 0803 123 4567 or +234 803 123 4567";

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter your 11-digit phone number, like 0803 123 4567.")
  .max(20)
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter an 11-digit Nigerian number, like 0803 123 4567 or +234 803 123 4567." });
      return z.NEVER;
    }
    return n;
  });

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_TOO_WEAK = `Password too weak: it must be at least ${PASSWORD_MIN} characters.`;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, PASSWORD_TOO_WEAK)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters.`);

export const nameSchema = z.string().trim().min(2, "Enter your name.").max(80);

export const idSchema = z.coerce.number().int().positive();
export const qtySchema = z.coerce.number().int().min(1).max(20);

/** Only allow same-origin relative paths (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n\t]/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://x");
    if (u.origin !== "http://x") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/** WhatsApp numbers: digits only, international format, 10–15 digits. */
export function normalizeWhatsapp(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("2340")) digits = `234${digits.slice(4)}`;
  const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  return /^[1-9]\d{9,14}$/.test(intl) ? intl : null;
}
