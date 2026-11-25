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
      body: JSON.stringify({ from, to: [to], reply_to: siteConfig.email, subject, html, text: text ?? stripHtml(html) }),
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
    .replace(/<head>[\s\S]*?<\/head>/i, "")
    .replace(/<div style="display:none[^"]*">[\s\S]*?<\/div>/i, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<\/(p|h1|h2|tr|div)>/gi, "\n")
    .replace(/&rarr;/g, "→").replace(/&times;/g, "×").replace(/&minus;/g, "-").replace(/&middot;|&nbsp;·&nbsp;/g, " · ")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url).replace(/\/$/, "");

// Brand palette (inline styles only: email clients ignore stylesheets).
const C = { oxblood: "#5a1309", cream: "#f7f2e8", char: "#1b1411", smoke: "#6b615a", line: "#ece3d4", bonnet: "#ffb627", paprika: "#fbe9d7", sand: "#f3ead9" };
const FONT = "font-family:Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";
const P = `margin:0 0 12px;font-size:11px;line-height:1.7;color:${C.char}`;

/** A body paragraph (11px). */
const p = (html: string) => `<p style="${P}">${html}</p>`;
/** Small uppercase label. */
const label = (s: string) => `<p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.oxblood}">${s}</p>`;
/** Soft rounded box. */
const box = (html: string, bg: string = C.sand) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td style="background:${bg};border-radius:14px;padding:16px 18px">${html}</td></tr></table>`;
/** Big code (coupons, rewards). */
const code = (s: string) =>
  box(`<p style="margin:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:.14em;color:${C.oxblood}">${esc(s)}</p>`, C.paprika);

const lagosTime = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * Brand email shell: oxblood header with logo, white card on a cream canvas,
 * 11px body text, scotch-bonnet pill button, warm sign-off and footer.
 */
export function layout(opts: {
  title: string;
  body: string;
  cta?: { label: string; url: string };
  /** Short grey line shown in the inbox list next to the subject. */
  preview?: string;
  eyebrow?: string;
  /** Hide the "With love from the grill" sign-off (admin emails). */
  signoff?: boolean;
}) {
  const site = appUrl();
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px"><tr><td style="background:${C.bonnet};border-radius:999px"><a href="${opts.cta.url}" style="display:inline-block;padding:12px 26px;font-size:12px;font-weight:700;color:${C.char};text-decoration:none;border-radius:999px">${esc(opts.cta.label)} &rarr;</a></td></tr></table>`
    : "";
  const signoff =
    opts.signoff === false
      ? ""
      : `<p style="margin:24px 0 0;font-size:11px;line-height:1.7;color:${C.char}">With love from the grill,<br><strong>The Massive Barbeque family</strong> 🔥</p>`;
  const social = Object.entries(siteConfig.social)
    .map(([k, url]) => `<a href="${url}" style="color:${C.oxblood};text-decoration:none;font-weight:700">${k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}</a>`)
    .join(" &nbsp;·&nbsp; ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};${FONT};color:${C.char}">
${opts.preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preview)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="background:${C.oxblood};border-radius:20px 20px 0 0;padding:22px 20px 18px">
<img src="${site}/brand/logo-light.png" width="64" height="73" alt="${esc(siteConfig.name)}" style="display:block;border:0;width:64px;height:auto">
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 20px 20px;padding:28px 26px 30px">
${opts.eyebrow ? label(esc(opts.eyebrow)) : ""}
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.25;font-weight:700;color:${C.char}">${opts.title}</h1>
${opts.body}
${cta}
${signoff}
</td></tr>
<tr><td align="center" style="padding:20px 12px 0;font-size:10px;line-height:1.7;color:${C.smoke}">
${social}<br>
${esc(siteConfig.pickup.full)}<br>
<a href="${site}" style="color:${C.smoke}">${site.replace(/^https?:\/\//, "")}</a> &nbsp;·&nbsp; <a href="mailto:${siteConfig.email}" style="color:${C.smoke}">${siteConfig.email}</a>
</td></tr>
</table></td></tr></table></body></html>`;
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
  phone?: string | null;
  notes?: string | null;
  zoneName?: string | null;
  couponCode?: string | null;
  paidAt?: Date | null;
  userId?: string | null;
  items: { name: string; size: string; qty: number; unitKobo: number }[];
};

const firstName = (name: string) => esc(name.trim().split(/\s+/)[0] ?? "");

function itemsTable(o: OrderEmailData) {
  const td = `padding:7px 0;font-size:11px;line-height:1.5;border-bottom:1px solid ${C.line}`;
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="${td}"><strong>${i.qty} &times; ${esc(i.name)}</strong>${i.size ? ` <span style="color:${C.smoke}">${esc(i.size)}</span>` : ""}</td><td align="right" style="${td};white-space:nowrap">${formatNaira(i.unitKobo * i.qty)}</td></tr>`,
    )
    .join("");
  const line = (l: string, v: string, bold = false) =>
    `<tr><td style="padding:4px 0;font-size:${bold ? "13px" : "11px"};${bold ? "font-weight:700" : `color:${C.smoke}`}">${l}</td><td align="right" style="padding:4px 0;font-size:${bold ? "13px" : "11px"};white-space:nowrap;${bold ? `font-weight:700;color:${C.oxblood}` : ""}">${v}</td></tr>`;
  const discount = o.discountKobo ? line(`Discount${o.couponCode ? ` (${esc(o.couponCode)})` : ""}`, `&minus;${formatNaira(o.discountKobo)}`) : "";
  const fee = o.deliveryKobo ? formatNaira(o.deliveryKobo) : "Free";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows}
<tr><td colspan="2" style="height:8px"></td></tr>
${line("Subtotal", formatNaira(o.subtotalKobo))}${discount}${line(o.method === "pickup" ? "Pickup" : "Delivery", fee)}${line("Total paid", formatNaira(o.totalKobo), true)}</table>`;
}

/** Where the food is going. */
function handover(o: OrderEmailData) {
  return o.method === "delivery"
    ? box(`${label("Delivering to")}<p style="margin:0;font-size:11px;line-height:1.6">${esc(o.addressLine ?? "")}${o.area ? `, ${esc(o.area)}` : ""}${o.zoneName ? `<br><span style="color:${C.smoke}">${esc(o.zoneName)}</span>` : ""}</p>`)
    : box(`${label("Pick up at")}<p style="margin:0;font-size:11px;line-height:1.6">${esc(siteConfig.pickup.full)}<br><span style="color:${C.smoke}">We'll message you the moment it's ready.</span></p>`);
}

/** Three small steps: what happens next. */
function nextSteps(o: OrderEmailData) {
  const steps = [
    ["🔥", "On the grill", "Our grill masters are firing up your order right now."],
    o.method === "delivery" ? ["🛵", "On its way", "A rider brings it to you hot. We'll let you know when they leave."] : ["🛍️", "Ready for you", "We'll message you when it's packed and waiting."],
    ["😋", "Dig in", "Enjoy every bite, then tell us how it was."],
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${steps
    .map(
      ([icon, t, d]) =>
        `<tr><td width="30" valign="top" style="padding:5px 0;font-size:16px">${icon}</td><td style="padding:5px 0;font-size:11px;line-height:1.5"><strong>${t}</strong><br><span style="color:${C.smoke}">${d}</span></td></tr>`,
    )
    .join("")}</table>`;
}

const trackUrl = (o: { number: string; email: string }) =>
  `${appUrl()}/track?number=${encodeURIComponent(o.number)}&email=${encodeURIComponent(o.email)}`;

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^\d]/g, "")}`;

export const emails = {
  verify(to: string, url: string) {
    return sendEmail(
      to,
      "Confirm your email",
      layout({
        eyebrow: "Almost there",
        title: "Welcome to the family! 🔥",
        preview: "One tap to confirm your email and you're in.",
        body:
          p("We're so glad you're here. Tap the button below to confirm your email and finish setting up your Massive Barbeque account.") +
          p(`<span style="color:${C.smoke}">Didn't sign up? You can safely ignore this email.</span>`),
        cta: { label: "Confirm my email", url },
      }),
    );
  },
  resetPassword(to: string, url: string) {
    return sendEmail(
      to,
      "Reset your password",
      layout({
        eyebrow: "Account help",
        title: "Let's get you back in",
        preview: "Choose a new password. The link works for 1 hour.",
        body:
          p("Someone (hopefully you) asked to reset your password. Tap the button to choose a new one. The link works for 1 hour.") +
          p(`<span style="color:${C.smoke}">Didn't ask for this? Ignore this email and your password stays the same.</span>`),
        cta: { label: "Choose a new password", url },
      }),
    );
  },
  orderConfirmed(o: OrderEmailData) {
    return sendEmail(
      o.email,
      `Thank you! Order ${o.number} is on the grill 🔥`,
      layout({
        eyebrow: `Order ${esc(o.number)} · Paid`,
        title: `Thank you, ${firstName(o.name)}! Your order is on the grill.`,
        preview: `We've got your order and the fire is already going. Total paid ${formatNaira(o.totalKobo)}.`,
        body:
          p("Thank you so much for choosing Massive Barbeque. Your payment came through and our grill masters are already preparing your food, fresh and full of flavour, just the way you like it.") +
          nextSteps(o) +
          label("Your order") +
          itemsTable(o) +
          handover(o) +
          p(`Questions about your order? Just reply to this email or reach us at <a href="mailto:${siteConfig.email}" style="color:${C.oxblood};font-weight:700">${siteConfig.email}</a>. We're always happy to help.`),
        cta: { label: "Track my order", url: trackUrl(o) },
      }),
    );
  },
  adminNewOrder(to: string, o: OrderEmailData, adminUrl: string) {
    const contact = [
      `<strong>${esc(o.name)}</strong>`,
      o.phone ? `<a href="tel:${esc(o.phone)}" style="color:${C.char}">${esc(o.phone)}</a> &nbsp;·&nbsp; <a href="${waLink(o.phone)}" style="color:#128C4B;font-weight:700">WhatsApp</a>` : "",
      `<a href="mailto:${esc(o.email)}" style="color:${C.char}">${esc(o.email)}</a>`,
    ]
      .filter(Boolean)
      .join("<br>");
    const when = o.paidAt ? lagosTime.format(o.paidAt) : "";
    return sendEmail(
      to,
      `💰 New order ${o.number} · ${formatNaira(o.totalKobo)} · ${o.method === "pickup" ? "Pickup" : "Delivery"}`,
      layout({
        eyebrow: `New paid order${when ? ` · ${esc(when)}` : ""}`,
        title: `Fire up the grill! ${formatNaira(o.totalKobo)} from ${firstName(o.name)}`,
        preview: `${o.name} paid ${formatNaira(o.totalKobo)} for ${o.items.reduce((n, i) => n + i.qty, 0)} item(s). ${o.method === "pickup" ? "Pickup" : "Delivery"}.`,
        signoff: false,
        body:
          p(`Great news, a new order just came in and it's fully paid. Here's everything you need to get it out ${o.method === "pickup" ? "ready for pickup" : "hot and on time"}.`) +
          box(`${label("Customer")}<p style="margin:0;font-size:11px;line-height:1.7">${contact}</p>`) +
          label(`Order ${esc(o.number)}`) +
          itemsTable(o) +
          handover(o) +
          (o.notes ? box(`${label("Note from the customer")}<p style="margin:0;font-size:11px;line-height:1.6">&ldquo;${esc(o.notes)}&rdquo;</p>`, C.paprika) : "") +
          p(`<span style="color:${C.smoke}">Tip: move the order to &ldquo;Preparing&rdquo; in the dashboard and the customer gets an update automatically.</span>`),
        cta: { label: "Open order", url: adminUrl },
      }),
    );
  },
  statusUpdate(o: OrderEmailData, status: string, statusLabel: string) {
    const name = firstName(o.name);
    const copy: Record<string, { title: string; body: string }> = {
      preparing: { title: `It's sizzling, ${name}! 🔥`, body: p("Your order is on the grill right now. We're giving it all the love and smoke it deserves.") },
      out_for_delivery:
        o.method === "pickup"
          ? { title: `Your food is ready, ${name}!`, body: p(`Come grab it while it's hot at <strong>${esc(siteConfig.pickup.full)}</strong>. See you soon!`) }
          : { title: `On its way to you, ${name}! 🛵`, body: p(`Your order has left the grill and is heading your way, hot and fresh.${o.tracking ? ` Your rider: <strong>${esc(o.tracking)}</strong>.` : ""}`) },
      delivered: {
        title: `Enjoy your meal, ${name}! 😋`,
        body: p("Your order has been delivered. We hope every bite hits the spot. Thank you for eating with us, and we'd love to hear how it was."),
      },
      cancelled: { title: "Your order was cancelled", body: p(`We're sorry, ${name}. Your order has been cancelled. If you paid, your refund is on its way. Reply to this email if anything looks wrong.`) },
      refunded: { title: "Your refund is on its way", body: p(`Hi ${name}, we've refunded your payment. It can take a few working days to show in your account. Thank you for your patience.`) },
    };
    const c = copy[status] ?? { title: esc(statusLabel), body: p(`Your order status is now <strong>${esc(statusLabel)}</strong>.`) };
    return sendEmail(
      o.email,
      `Order ${o.number}: ${statusLabel}`,
      layout({ eyebrow: `Order ${esc(o.number)} · ${esc(statusLabel)}`, title: c.title, preview: statusLabel, body: c.body, cta: { label: "View my order", url: trackUrl(o) } }),
    );
  },
  paymentProblem(to: string, number: string, problem: string, adminUrl: string) {
    return sendEmail(
      to,
      `⚠️ Payment problem on ${number}`,
      layout({
        eyebrow: `Order ${esc(number)}`,
        title: "A payment needs your attention",
        signoff: false,
        body: p("A payment came in but something didn't match, so the order is on hold until you check it.") + box(`${label("What we found")}<p style="margin:0;font-size:11px;line-height:1.6">${esc(problem)}</p>`, C.paprika),
        cta: { label: "Open order", url: adminUrl },
      }),
    );
  },
  welcome(to: string, couponCode: string) {
    return sendEmail(
      to,
      "Welcome! Your 10% off code is inside 🔥",
      layout({
        eyebrow: "Welcome to the family",
        title: "So glad you're here!",
        preview: `Here's 10% off your first order: ${couponCode}`,
        body: p("Thank you for joining us. You'll be the first to hear about new menu drops and weekend specials. To say hello, here's 10% off your first order:") + code(couponCode) + p("Just enter it at checkout."),
        cta: { label: "See the menu", url: `${appUrl()}/menu` },
      }),
    );
  },
  abandonedBag(to: string, itemsText: string, n: number) {
    return sendEmail(
      to,
      n === 1 ? "Your BBQ is getting cold" : "Still craving? Your bag is waiting",
      layout({
        eyebrow: "Your bag",
        title: n === 1 ? "You left something on the grill 🔥" : "Your bag is still waiting for you",
        body: p("We saved your bag so you can pick up right where you left off:") + box(p(esc(itemsText)).replace("margin:0 0 12px", "margin:0")) + p("Today's batch goes fast, so don't wait too long!"),
        cta: { label: "Back to my bag", url: `${appUrl()}/cart` },
      }),
    );
  },
  craving(to: string, productName: string, url: string) {
    return sendEmail(
      to,
      `Craving ${productName} again?`,
      layout({ eyebrow: "We miss you", title: `Time for more ${esc(productName)}?`, body: p("It's been a little while! Your favourite is fresh off the grill and just one tap away."), cta: { label: "Order again", url } }),
    );
  },
  backInStock(to: string, productName: string, url: string) {
    return sendEmail(
      to,
      `${productName} is back on the grill`,
      layout({ eyebrow: "Good news", title: `${esc(productName)} is back! 🔥`, body: p("The one you were waiting for is available again. Today's batch goes fast, so grab yours while it's hot."), cta: { label: "Order now", url } }),
    );
  },
  referralReward(to: string, rewardCode: string) {
    return sendEmail(
      to,
      "You earned a reward 🎉",
      layout({
        eyebrow: "Thank you for sharing",
        title: "Your friend ordered. You earned ₦2,000 off!",
        body: p("Thank you for spreading the word about Massive Barbeque. Here's your reward for your next order:") + code(rewardCode),
        cta: { label: "See my rewards", url: `${appUrl()}/account/rewards` },
      }),
    );
  },
};

export type { OrderEmailData };
