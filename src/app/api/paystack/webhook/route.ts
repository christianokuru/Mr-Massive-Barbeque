import { isValidWebhookSignature } from "@/server/paystack";
import { settlePayment } from "@/server/orders";

/**
 * Paystack webhook. Signature (HMAC-SHA512, constant-time) first, then we
 * re-verify the transaction server-to-server by our own reference.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!isValidWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  const reference = event.data?.reference;
  if (event.event === "charge.success" && typeof reference === "string" && reference.length <= 100) {
    try {
      await settlePayment(reference);
    } catch (err) {
      console.error("[webhook] settle failed", err);
      return new Response("Retry", { status: 500 });
    }
  }
  return new Response("ok");
}
