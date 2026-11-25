import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgePercent,
  Bell,
  BookOpen,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Package,
  Settings,
  Sun,
  Truck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { siteConfig } from "@/lib/site";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Guide" };

// Auth-gated page: not expected to navigate instantly.
export const instant = false;

type Section = { id: string; title: string; icon: typeof Package; intro: string; body: ReactNode };

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-oxblood text-sm font-bold text-cream">{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-paprika p-4"><span className="font-bold">Tip: </span>{children}</p>;
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border-2 border-bonnet bg-bonnet/15 p-4"><span className="font-bold">Good to know: </span>{children}</p>;
}

function H({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 font-sans text-body-lg font-bold">{children}</h3>;
}

function Status({ name, children }: { name: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl bg-cream p-3 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 font-bold">{name}</span>
      <span>{children}</span>
    </li>
  );
}

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "Start here",
    icon: BookOpen,
    intro: "Everything you need to run the shop from your phone or laptop.",
    body: (
      <>
        <p>This dashboard is the back office of your website. Customers order and pay on the website, and everything they do shows up here: new orders, who ordered, what they ordered and whether they paid.</p>
        <p>Use the menu on the left (on a phone, tap the ☰ button at the top) to move between sections. <strong>View store</strong> opens the website the way customers see it, and <strong>Sign out</strong> logs you out.</p>
        <Note>Only one email address can open this dashboard: the store&apos;s admin email. Anyone else who tries just sees a &quot;page not found&quot; message.</Note>
      </>
    ),
  },
  {
    id: "daily",
    title: "Your daily routine",
    icon: Sun,
    intro: "A simple checklist for every day the grill is open.",
    body: (
      <>
        <H>Every morning</H>
        <Steps
          items={[
            <>Open <strong>Products</strong> and type in how many of each item you can grill today. This is your &quot;today&apos;s batch&quot;. When it runs out, the website shows &quot;Sold out today&quot; automatically.</>,
            <>Check <strong>Orders → To ship</strong> for any paid orders still waiting.</>,
            <>If you&apos;re running an offer, update the announcement banner in <strong>Settings</strong>.</>,
          ]}
        />
        <H>During the day</H>
        <Steps
          items={[
            <>When a new order comes in, open it and tap <strong>Update status → On the grill</strong>.</>,
            <>When it leaves with a rider, choose <strong>Out for delivery</strong> and type the rider&apos;s name and phone number. For pickup orders this step is called <strong>Ready for pickup</strong>.</>,
            <>When the customer has it, choose <strong>Delivered</strong> (or <strong>Picked up</strong>).</>,
          ]}
        />
        <H>End of day</H>
        <Steps
          items={[
            <>Make sure nothing is left in <strong>To ship</strong>.</>,
            <>Glance at <strong>Reviews</strong> and approve the good ones.</>,
          ]}
        />
        <Note>Stock doesn&apos;t reset by itself overnight. If you don&apos;t update it in the morning, the website keeps whatever number was left from yesterday.</Note>
      </>
    ),
  },
  {
    id: "dashboard",
    title: "The dashboard home page",
    icon: LayoutDashboard,
    intro: "Your sales at a glance.",
    body: (
      <>
        <p>Use the <strong>7 / 30 / 90 days</strong> buttons at the top right to choose the period you&apos;re looking at.</p>
        <ul className="flex flex-col gap-2">
          <Status name="Revenue">Money from paid orders in that period.</Status>
          <Status name="Orders">How many orders were paid. The small text also counts orders that were started but never paid.</Status>
          <Status name="Average order">What a typical customer spends.</Status>
          <Status name="To ship">Paid orders you still need to prepare or send out. Tap it to see them.</Status>
          <Status name="Customers">People with an account, and how many joined in that period.</Status>
        </ul>
        <p>The <strong>Daily sales</strong> chart shows one bar per day. Hover over (or tap) a bar to see that day&apos;s total. <strong>Best sellers</strong> lists your top items, and <strong>Low stock today</strong> warns you when something has 5 or fewer left.</p>
      </>
    ),
  },
  {
    id: "orders",
    title: "Orders",
    icon: Package,
    intro: "Finding orders, moving them along and handling problems.",
    body: (
      <>
        <H>What each status means</H>
        <ul className="flex flex-col gap-2">
          <Status name="Awaiting payment">The customer started paying but hasn&apos;t finished. Don&apos;t cook it yet. If they don&apos;t pay within 60 minutes, the order closes by itself and the food goes back on the menu.</Status>
          <Status name="Confirmed">Paid. Time to cook.</Status>
          <Status name="On the grill">You&apos;re preparing it.</Status>
          <Status name="Out for delivery">With the rider (for pickup orders: ready to collect).</Status>
          <Status name="Delivered">Done. The customer is emailed and can now leave a review.</Status>
          <Status name="Cancelled / Expired">Not going ahead. The food is put back on the menu automatically.</Status>
          <Status name="Refunded">You&apos;ve given the money back.</Status>
        </ul>
        <H>Finding an order</H>
        <p>Use the search box. You can type an order number (like MB-7KQ2-9XHD), a name, an email or a phone number. Phone numbers work either way: 0803… or +234803…. Use the tabs to show only one status, and the dates to pick a period.</p>
        <H>Moving an order along</H>
        <Steps
          items={[
            <>Tap the order number to open it.</>,
            <>On the right, under <strong>Update status</strong>, pick the next step and tap <strong>Update status</strong>.</>,
            <>Before a delivery order can go <strong>Out for delivery</strong>, add the rider&apos;s name and phone. The customer sees it on their tracking page.</>,
          ]}
        />
        <p>The dashboard only offers steps that make sense, so you can&apos;t accidentally jump a paid order back to &quot;awaiting payment&quot;. Every change is written in the order&apos;s <strong>History</strong>, with the time and who did it.</p>
        <H>Updating many orders at once</H>
        <p>On the Orders page, tick the boxes on the left, then use <strong>Mark on the grill</strong> or <strong>Mark delivered</strong> in the dark bar that appears. Orders that can&apos;t take that step are skipped safely.</p>
        <H>Contacting the customer</H>
        <p>Inside an order, use <strong>Call</strong>, <strong>WhatsApp</strong> or <strong>Email</strong> under the customer&apos;s name. WhatsApp opens with a ready-made message that mentions their order number.</p>
        <H>Packing slip</H>
        <p>Tap <strong>Packing slip</strong> to print a clean sheet listing the items, with tick boxes and the customer&apos;s details. It doesn&apos;t show prices, so it&apos;s safe to hand to staff or riders.</p>
        <H>Cancelling or refunding</H>
        <Steps
          items={[
            <>If the customer already paid, refund them first in your <strong>Paystack dashboard</strong>. The money goes back through Paystack, not through this website.</>,
            <>Then come back here and set the order to <strong>Refunded</strong> (or <strong>Cancelled</strong>). You&apos;ll be asked to confirm.</>,
            <>The customer gets an email, and the food goes back on the menu if it hadn&apos;t been delivered.</>,
          ]}
        />
        <H>Payment problems</H>
        <p>Very occasionally a payment doesn&apos;t match (for example the wrong amount, someone paying twice, or paying after the order had expired). The order&apos;s <strong>Payments</strong> box then shows a red ⚠ note explaining it, and you get an email. Usually the fix is a refund in Paystack.</p>
        <H>Downloading a spreadsheet</H>
        <p>Tap <strong>CSV</strong> on the Orders page to download the orders you&apos;re currently looking at. It opens in Excel or Google Sheets, which is handy for accounting.</p>
      </>
    ),
  },
  {
    id: "products",
    title: "Products & stock",
    icon: UtensilsCrossed,
    intro: "Prices, sizes, photos and today's batch.",
    body: (
      <>
        <H>Changing stock quickly</H>
        <p>On the <strong>Products</strong> page, each size has a small number box. Type the new number and press Enter (or just tap somewhere else). It saves straight away. A number in red means that size is sold out.</p>
        <Tip>Customers can ask to be emailed when a sold-out item comes back. When you raise the stock from 0, they&apos;re emailed automatically.</Tip>
        <H>Adding a new item</H>
        <Steps
          items={[
            <>Tap <strong>New product</strong>.</>,
            <>Fill in the name and descriptions. The web address fills itself in.</>,
            <>Under <strong>Sizes & prices</strong>, add each size (for example Regular, Standard, Biggie) with its price and today&apos;s stock. &quot;Was ₦&quot; is optional and shows a crossed-out old price.</>,
            <>On the right, pick a category, spice level and occasions. Leave the status as <strong>Draft</strong> while you work on it.</>,
            <>Tap <strong>Create product</strong>, then add photos at the top of the page.</>,
            <>When it&apos;s ready, change the status to <strong>Active</strong> and save. It&apos;s now on the menu.</>,
          ]}
        />
        <H>The options on the right, explained</H>
        <ul className="flex flex-col gap-2">
          <Status name="Draft / Active / Archived">Draft is hidden from customers. Active is on the menu. Archived is retired but kept for old orders.</Status>
          <Status name="Best seller">Adds a &quot;Best seller&quot; tag and moves the item to the top of the menu.</Status>
          <Status name="This is a side">Sides appear under &quot;Complete your meal&quot; on every main dish.</Status>
          <Status name="Reorder reminder">How many days after buying a customer gets a friendly &quot;craving it again?&quot; email.</Status>
          <Status name="Search engines">Optional. A custom title and description for Google. If empty, a good one is written for you.</Status>
        </ul>
        <H>Photos</H>
        <p>Tap <strong>Upload</strong> and choose one or more photos (JPG, PNG, WebP; at least 400 pixels wide, up to 4 MB each). The <strong>first photo is the cover</strong>. Drag photos to reorder them, or use the up and down arrows. Add a short description under each photo; it helps blind visitors and Google.</p>
        <Tip>Bright, close-up photos taken in daylight sell much better. Location data is removed from photos automatically for your privacy.</Tip>
        <H>Duplicate and archive</H>
        <p><strong>Duplicate</strong> makes a hidden copy with zero stock, which is useful for a new item similar to an existing one. <strong>Archive</strong> takes an item off the menu without deleting its history. You can restore it later.</p>
      </>
    ),
  },
  {
    id: "combos",
    title: "Categories & combos",
    icon: Boxes,
    intro: "How the menu is grouped, and bundle deals.",
    body: (
      <>
        <p><strong>Categories</strong> are the menu sections customers see (Grilled Fish, Chicken, Sides…). The number on the right sets the order. Deleting a category doesn&apos;t delete its items; they just become uncategorised.</p>
        <p><strong>Combos</strong> are bundles at a special price, like the Catfish Feast. To make one, give it a name, add at least two items with quantities, set a price, and add a photo. The combo price must be <strong>lower</strong> than buying the items separately; the page shows the customer&apos;s saving as you type.</p>
        <Note>A combo shows &quot;Sold out today&quot; automatically when any item inside it runs out.</Note>
      </>
    ),
  },
  {
    id: "coupons",
    title: "Coupons, referrals & influencers",
    icon: BadgePercent,
    intro: "Discount codes and how rewards work.",
    body: (
      <>
        <H>Creating a coupon</H>
        <Steps
          items={[
            <>Choose a code customers will type (for example WEEKEND15).</>,
            <>Pick <strong>% off</strong> or <strong>₦ off</strong> and the amount.</>,
            <>Optional: a minimum spend, a limit on how many times it can be used in total, and an end date.</>,
            <>Tap <strong>Create coupon</strong>.</>,
          ]}
        />
        <p>Each person can use a code only once. Turn a code off at any time with its switch.</p>
        <H>Influencer codes</H>
        <p>Type the influencer&apos;s name (for example @lagosfoodie) when creating their code. The table then shows how many orders and how much money that code brought in, so you know exactly who&apos;s worth working with.</p>
        <H>Built-in rewards (no work needed)</H>
        <ul className="flex flex-col gap-2">
          <Status name="WELCOME10">10% off a first order. New newsletter and quiz sign-ups receive it by email.</Status>
          <Status name="Refer a friend">Customers share their personal code. Their friend gets ₦2,000 off a first order of ₦5,000+, and when the friend pays, the customer automatically gets a ₦2,000 code too.</Status>
        </ul>
      </>
    ),
  },
  {
    id: "reviews",
    title: "Reviews",
    icon: MessageSquareText,
    intro: "Only real customers can review, and you decide what shows.",
    body: (
      <>
        <p>Only customers whose order was <strong>delivered</strong> can leave a review, so every review is from a real buyer. New reviews wait in the <strong>Pending</strong> tab until you act.</p>
        <p>Tap <strong>Approve</strong> to show it on the item&apos;s page, or <strong>Hide</strong> to keep it off the website. The red badge in the menu tells you how many are waiting.</p>
        <Tip>Approving honest reviews, even a few 4-star ones, makes the 5-star ones more believable.</Tip>
      </>
    ),
  },
  {
    id: "customers",
    title: "Customers, regulars, abandoned bags & subscribers",
    icon: Users,
    intro: "Who's buying, and who almost did.",
    body: (
      <>
        <p><strong>Customers</strong> lists everyone with an account, with their number of orders and total spend. Tap a name to see their orders, what they <strong>usually order</strong>, saved addresses, quiz answers and buttons to email or WhatsApp them.</p>
        <p><strong>Regulars</strong> shows the people who buy again and again (2 or more paid orders), including guests who checked out without an account. For each one you see how many times they&apos;ve ordered, how much they&apos;ve spent, how often they order (for example &quot;about every 7 days&quot;) and the items they pick most. The box on the right lists what your regulars buy most, so you know what never to run out of. Use the buttons at the top to look at the last 30 days, 90 days, a year or all time.</p>
        <Tip>If a regular&apos;s &quot;last order&quot; date is red, they haven&apos;t ordered in over a month. Send them a WhatsApp with a coupon code to win them back.</Tip>
        <p><strong>Abandoned bags</strong> shows people who put food in their bag but didn&apos;t pay. The website emails them a reminder automatically (at most twice, so nobody gets spammed). If we have their phone number, a <strong>WhatsApp</strong> button lets you nudge them personally.</p>
        <p><strong>Subscribers</strong> is your mailing list. Tap <strong>CSV</strong> to download it for an email campaign.</p>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Delivery zones & pickup",
    icon: Truck,
    intro: "Where you deliver, what it costs and how long it takes.",
    body: (
      <>
        <p>Each zone has a name, the areas it covers, a delivery fee, an optional &quot;free over&quot; amount and an estimated time. Customers pick their zone at checkout and see the fee straight away.</p>
        <Steps
          items={[
            <>To change a zone, edit its boxes and tap <strong>Save</strong>.</>,
            <>To stop delivering somewhere, untick <strong>On</strong> and save.</>,
            <>To add a new area, fill in the &quot;Add a zone&quot; row at the bottom.</>,
          ]}
        />
        <p>Pickup is always free. Customers who choose pickup are told to collect from <strong>{siteConfig.pickup.full}</strong>.</p>
      </>
    ),
  },
  {
    id: "settings",
    title: "Store settings",
    icon: Settings,
    intro: "WhatsApp button and the announcement banner.",
    body: (
      <>
        <ul className="flex flex-col gap-2">
          <Status name="WhatsApp number">Shows the green chat button on every page. On an item&apos;s page, the message is pre-filled with that item&apos;s name. Leave it empty to hide the button.</Status>
          <Status name="Banner (desktop)">The dark strip at the very top of the website on computers. Great for offers and free-delivery messages.</Status>
          <Status name="Banner (mobile)">A shorter version for phones. Keep it under about 40 characters so it fits.</Status>
        </ul>
        <p>Changes show on the website as soon as you tap <strong>Save settings</strong>.</p>
      </>
    ),
  },
  {
    id: "alerts",
    title: "New-order alerts on your phone",
    icon: Bell,
    intro: "Get a notification the moment someone pays.",
    body: (
      <>
        <Steps
          items={[
            <>Open the dashboard on the phone or laptop you want alerts on.</>,
            <>On the home page, find <strong>Order alerts</strong> and tap <strong>Turn on</strong>, then allow notifications when your browser asks.</>,
            <>Tap <strong>Send test</strong>. You should get a notification within a few seconds.</>,
          ]}
        />
        <p>Do this on each device you want alerts on. Works on Chrome or Edge on a laptop, and Chrome on Android.</p>
        <p><strong>iPhone:</strong> open the website in Safari, tap the Share button → <strong>Add to Home Screen</strong>, open the store from that new icon, sign in, then turn alerts on.</p>
        <Note>If the card shows a red message, it tells you exactly what to change (usually a browser setting). Tapping a notification opens that order.</Note>
      </>
    ),
  },
  {
    id: "emails",
    title: "Emails customers receive",
    icon: Mail,
    intro: "Sent automatically; you don't need to do anything.",
    body: (
      <ul className="flex flex-col gap-2">
        <Status name="Account">Confirm email, and reset password.</Status>
        <Status name="Orders">Order confirmed (with receipt), on the grill, out for delivery / ready for pickup, delivered, cancelled, refunded.</Status>
        <Status name="Reminders">Items left in the bag (max 2), &quot;craving it again?&quot;, and &quot;back on the grill&quot; when a sold-out item returns.</Status>
        <Status name="Rewards">Welcome code, and referral reward codes.</Status>
        <Status name="To you">A copy of every new paid order, and a warning if a payment needs checking.</Status>
      </ul>
    ),
  },
  {
    id: "help",
    title: "Quick answers",
    icon: CircleHelp,
    intro: "Common questions.",
    body: (
      <div className="flex flex-col divide-y divide-line">
        {[
          ["A customer says they paid but the order says “Awaiting payment”.", "Bank transfers can take a few minutes to confirm. Wait 5 minutes and refresh. If it still hasn’t changed, check the payment in your Paystack dashboard using the order number."],
          ["Can I take an order on WhatsApp and put it in here?", "Customers should place it on the website (you can send them the link), so it’s paid and tracked properly. Use WhatsApp for questions."],
          ["I made a mistake on an order status.", "You can’t go backwards, to protect your records. Add a note explaining it next time you update the order, and message the customer if needed."],
          ["How do I change a price?", "Products → tap the item → change the price under Sizes & prices → Save changes. It updates on the website immediately; orders already placed keep the price they paid."],
          ["An item is finished for today.", "Set its stock to 0 on the Products page. It shows “Sold out today”, and customers can ask to be told when it’s back."],
          ["Someone is asking for their data to be deleted.", "Customers can do it themselves under Account → Settings → Privacy. Their past orders stay in your records for accounting, without their account."],
        ].map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {q}
              <span className="text-2xl leading-none transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-2 text-smoke">{a}</p>
          </details>
        ))}
      </div>
    ),
  },
];

export default async function AdminGuide() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">How to use your dashboard</p>
        <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Guide</h1>
        <p className="mt-3 max-w-2xl text-body-lg text-smoke">A plain-English manual for running Massive Barbeque online. Read it once from top to bottom, then come back whenever you need a reminder.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Guide contents" className="h-fit rounded-card bg-white p-4 xl:sticky xl:top-6" data-testid="guide-toc">
          <p className="mb-2 px-2 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Contents</p>
          <ol className="grid gap-0.5 sm:grid-cols-2 xl:grid-cols-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold hover:bg-sand">
                  <s.icon className="size-4 shrink-0 text-oxblood" /> {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {SECTIONS.map((s, i) => (
            <details key={s.id} id={s.id} open={i < 2} className="group scroll-mt-20 rounded-card bg-white p-5 md:p-6 [&[open]]:pb-7" data-testid="guide-section">
              <summary className="flex cursor-pointer list-none items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-paprika text-oxblood">
                  <s.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-heading-sm leading-tight">{s.title}</span>
                  <span className="text-muted-foreground">{s.intro}</span>
                </span>
                <span className="pt-2 text-2xl leading-none text-oxblood transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 text-body-lg leading-relaxed">{s.body}</div>
            </details>
          ))}
          <p className="text-center text-sm text-muted-foreground">
            Still stuck? Contact your developer at{" "}
            <Link href={siteConfig.credit.url} target="_blank" className="font-bold underline">Kylva</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
