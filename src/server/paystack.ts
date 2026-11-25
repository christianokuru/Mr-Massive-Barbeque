import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://api.paystack.co";

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackConfigError();
  return key;
}

export class PaystackConfigError extends Error {
  constructor() {
    super("Online payment is not configured yet.");
  }
}

export function paystackConfigured() {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

type InitResult = { authorization_url: string; access_code: string; reference: string };

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitResult> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: InitResult } | null;
  if (!res.ok || !json?.status || !json.data) {
    throw new Error(json?.message ?? `Paystack initialize failed (${res.status})`);
  }
  return json.data;
}

export type VerifiedTransaction = {
  status: string; // success | failed | abandoned | ...
  reference: string;
  amount: number; // kobo
  currency: string;
  channel?: string;
  paid_at?: string | null;
};

/** Server-to-server verification by OUR reference. Never trust redirect params. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404 || res.status === 400) return null;
  const json = (await res.json().catch(() => null)) as { status?: boolean; data?: VerifiedTransaction } | null;
  if (!res.ok || !json?.status || !json.data) {
    throw new Error(`Paystack verify failed (${res.status})`);
  }
  return json.data;
}

/** Webhook signature: HMAC-SHA512 of the raw body, compared in constant time. */
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
