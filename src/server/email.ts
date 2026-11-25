import "server-only";
import { formatNaira } from "@/lib/money";
import { siteConfig } from "@/lib/site";

/**
 * Resend REST. Without RESEND_API_KEY, emails (and their links) are logged to
 * the server console so every flow still works in development.
 */
export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${siteConfig.name} <onboarding@resend.dev>`;
  if (!key) {
    console.info(`\n[email:dev] to=${to}\nsubject=${subject}\n${text ?? stripHtml(html)}\n`);
    return { ok: true, dev: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text: text ?? stripHtml(html) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn("[email] Resend error", res.status, await res.text().catch(() => ""));
    return { ok: res.ok, dev: false };
  } catch (err) {
    console.warn("[email] send failed", err);
    return { ok: false, dev: false };
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|tr|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url).replace(/\/$/, "");

/** Brand email shell: cream canvas, oxblood heading, scotch-bonnet pill CTA. */
export function layout(opts: { title: string; body: string; cta?: { label: string; url: string } }) {
  const cta = opts.cta
    ? `<p style="margin:28px 0"><a href="${opts.cta.url}" style="background:#ffb627;color:#1b1411;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px;display:inline-block">${esc(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f7f2e8;font-family:Inter,Arial,sans-serif;color:#1b1411">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 24px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5a1309;font-size:13px">${esc(siteConfig.name)}</p>
<h1 style="font-weight:400;font-size:30px;line-height:1.05;margin:0 0 16px">${esc(opts.title)}</h1>
<div style="font-size:16px;line-height:1.5">${opts.body}</div>
${cta}
<p style="margin-top:40px;font-size:12px;color:#5b524c">${esc(siteConfig.name)} · Lagos, Nigeria · <a href="${appUrl()}" style="color:#5a1309">${appUrl().replace(/^https?:\/\//, "")}</a></p>
</div></body></html>`;
}

type OrderEmailData = {
  number: string;
  name: string;
  email: string;
  method: string;
  totalKobo: number;
  subtotalKobo: number;
  discountKobo: number;
  deliveryKobo: number;
  addressLine?: string | null;
  area?: string | null;
  tracking?: string | null;
  items: { name: string; size: string; qty: number; unitKobo: number }[];
};

function itemsTable(o: OrderEmailData) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.qty} × ${esc(i.name)}${i.size ? ` <span style="color:#5b524c">(${esc(i.size)})</span>` : ""}</td><td style="text-align:right">${formatNaira(i.unitKobo * i.qty)}</td></tr>`,
    )
    .join("");
  const line = (label: string, kobo: number, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700" : "color:#5b524c"}">${label}</td><td style="text-align:right;${bold ? "font-weight:700" : ""}">${formatNaira(kobo)}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}
<tr><td colspan="2" style="border-top:1px solid #ded3c3;padding-top:8px"></td></tr>
${line("Subtotal", o.subtotalKobo)}${o.discountKobo ? line("Discount", -o.discountKobo) : ""}${line(o.method === "pickup" ? "Pickup" : "Delivery", o.deliveryKobo)}${line("Total", o.totalKobo, true)}</table>`;
}

const trackUrl = (o: { number: string; email: string }) =>
  `${appUrl()}/track?number=${encodeURIComponent(o.number)}&email=${encodeURIComponent(o.email)}`;

export const emails = {
  verify(to: string, url: string) {
    return sendEmail(
      to,
      "Confirm your email",
      layout({
        title: "Confirm your email",
        body: "<p>Tap the button to confirm your email and finish creating your Massive Barbeque account.</p>",
        cta: { label: "Confirm email", url },
      }),
    );
  },
  resetPassword(to: string, url: string) {
    return sendEmail(
      to,
      "Reset your password",
      layout({
        title: "Reset your password",
        body: "<p>Someone (hopefully you) asked to reset your password. The link expires in 1 hour.</p>",
        cta: { label: "Choose a new password", url },
      }),
    );
  },
  orderConfirmed(o: OrderEmailData) {
    return sendEmail(
      o.email,
      `Order ${o.number} confirmed`,
      layout({
        title: `Thanks, ${esc(o.name.split(" ")[0] ?? "")}. It's on the grill.`,
        body: `<p>Order <strong>${esc(o.number)}</strong> is paid and confirmed.</p>${itemsTable(o)}${
          o.method === "delivery"
            ? `<p>Delivering to: ${esc(o.addressLine ?? "")}, ${esc(o.area ?? "")}</p>`
            : `<p>Pick up at <strong>${esc(siteConfig.pickup.full)}</strong>. We'll message you when it's ready.</p>`
        }`,
        cta: { label: "Track your order", url: trackUrl(o) },
      }),
    );
  },
  adminNewOrder(to: string, o: OrderEmailData, adminUrl: string) {
    return sendEmail(
      to,
      `New paid order ${o.number} · ${formatNaira(o.totalKobo)}`,
      layout({
        title: `New order ${esc(o.number)}`,
        body: `<p>${esc(o.name)} · ${o.method}</p>${itemsTable(o)}`,
        cta: { label: "Open order", url: adminUrl },
      }),
    );
  },
  statusUpdate(o: OrderEmailData, status: string, label: string) {
    const copy: Record<string, string> = {
      out_for_delivery:
        o.method === "pickup"
          ? `<p>Your order is ready. Come grab it while it's hot at ${esc(siteConfig.pickup.full)}.</p>`
          : `<p>Your order is on its way.${o.tracking ? ` Rider: ${esc(o.tracking)}.` : ""}</p>`,
      delivered: "<p>Your order has been delivered. Enjoy, and tell us how it was.</p>",
      cancelled: "<p>Your order has been cancelled. If you paid, a refund will follow.</p>",
      refunded: "<p>Your payment has been refunded. It may take a few days to show.</p>",
      preparing: "<p>Your order is on the grill now.</p>",
    };
    return sendEmail(
      o.email,
      `Order ${o.number}: ${label}`,
      layout({ title: label, body: copy[status] ?? `<p>Status: ${esc(label)}</p>`, cta: { label: "View order", url: trackUrl(o) } }),
    );
  },
  paymentProblem(to: string, number: string, problem: string, adminUrl: string) {
    return sendEmail(
      to,
      `Payment problem on ${number}`,
      layout({ title: "Payment needs attention", body: `<p>Order ${esc(number)}: ${esc(problem)}</p>`, cta: { label: "Open order", url: adminUrl } }),
    );
  },
  welcome(to: string, code: string) {
    return sendEmail(
      to,
      "Your welcome code inside",
      layout({
        title: "Welcome to the grill",
        body: `<p>Thanks for joining. Here's 10% off your first order:</p><p style="font-size:24px;font-weight:700;letter-spacing:.08em">${esc(code)}</p>`,
        cta: { label: "Order now", url: `${appUrl()}/menu` },
      }),
    );
  },
  abandonedBag(to: string, itemsText: string, n: number) {
    return sendEmail(
      to,
      n === 1 ? "Your BBQ is getting cold" : "Still craving? Your bag is waiting",
      layout({
        title: n === 1 ? "You left something on the grill" : "Your bag is still waiting",
        body: `<p>${esc(itemsText)}</p>`,
        cta: { label: "Back to my bag", url: `${appUrl()}/cart` },
      }),
    );
  },
  craving(to: string, productName: string, url: string) {
    return sendEmail(
      to,
      `Craving ${productName} again?`,
      layout({ title: `Time for more ${esc(productName)}?`, body: "<p>It's been a while. Your favourite is one tap away.</p>", cta: { label: "Reorder", url } }),
    );
  },
  backInStock(to: string, productName: string, url: string) {
    return sendEmail(
      to,
      `${productName} is back on the grill`,
      layout({ title: `${esc(productName)} is back`, body: "<p>The size you wanted is available again. Today's batch goes fast.</p>", cta: { label: "Order now", url } }),
    );
  },
  referralReward(to: string, code: string) {
    return sendEmail(
      to,
      "You earned a reward",
      layout({
        title: "Your friend ordered. You earned ₦2,000 off.",
        body: `<p>Use this code on your next order:</p><p style="font-size:24px;font-weight:700;letter-spacing:.08em">${esc(code)}</p>`,
        cta: { label: "See my rewards", url: `${appUrl()}/account/rewards` },
      }),
    );
  },
};

export type { OrderEmailData };
