import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, Star } from "lucide-react";
import { BuyAgainButton, QuickReorderButton } from "@/components/account/account-ui";
import { EmptyState, StatusBadge } from "@/components/store/bits";
import { OrderTracker } from "@/components/store/order-details";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import type { OrderStatus } from "@/lib/order-status";
import { activeOrder, latestQuiz, listMyOrders, reviewPrompts, runningLow } from "@/server/account";
import { loadOrderView } from "@/server/order-view";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const SPICE: Record<string, string> = { mild: "Mild", hot: "Hot", extra_hot: "Extra hot" };

export default async function AccountHome() {
  const session = await requireUser("/account");
  const { id, email, name } = session.user;
  const [activeId, low, prompts, quiz, orders] = await Promise.all([
    activeOrder(id, email),
    runningLow(id, email),
    reviewPrompts(id, email),
    latestQuiz(id, email),
    listMyOrders(id, email, 4),
  ]);
  const active = activeId ? await loadOrderView(activeId) : null;
  const unpaid = orders.find((o) => o.status === "pending_payment");
  const answers = (quiz?.answers ?? null) as { spice?: string; crew?: string; protein?: string } | null;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="eyebrow mb-2">Your account</p>
        <h1 className="text-[44px] leading-[0.9] md:text-display">Hi, {name.split(" ")[0]}.</h1>
      </div>

      {active ? (
        <section className="rounded-card bg-white p-5 md:p-6" data-testid="active-order">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Order {active.number}</p>
              <p className="text-subheading font-bold">Your order is on its way</p>
            </div>
            <StatusBadge status={active.status} method={active.method} />
          </div>
          <OrderTracker status={active.status} method={active.method} reached={active.reached} />
          <Link href={`/account/orders/${active.number}`} className="mt-5 inline-flex items-center gap-1 font-bold underline">View order <ArrowRight className="size-4" /></Link>
        </section>
      ) : null}

      {unpaid ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-paprika p-5">
          <p><span className="font-bold">Order {unpaid.number} is waiting for payment.</span> It&apos;s held until the payment window closes.</p>
          <Link href={`/account/orders/${unpaid.number}`} className="inline-flex h-11 items-center rounded-full bg-bonnet px-5 font-bold">Complete payment</Link>
        </section>
      ) : null}

      {low.length ? (
        <section data-testid="running-low">
          <h2 className="mb-4 text-heading-sm">Running low? Craving again?</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {low.map((p) => (
              <li key={p.product_id} className="flex items-center gap-3 rounded-card bg-white p-3">
                {p.image ? <Image src={p.image} alt="" width={64} height={64} className="size-16 rounded-xl object-cover" /> : null}
                <Link href={`/menu/${p.slug}`} className="min-w-0 flex-1">
                  <span className="block font-bold">{p.name}</span>
                  <span className="text-sm text-muted-foreground">Last ordered {formatDate(p.last_paid)}{p.variant_name ? ` · ${p.variant_name}` : ""}</span>
                </Link>
                {p.variant_id && (p.stock ?? 0) > 0 ? <QuickReorderButton variantId={p.variant_id} /> : <span className="text-xs text-muted-foreground">Sold out</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {prompts.length ? (
        <section data-testid="review-prompts">
          <h2 className="mb-4 text-heading-sm">How was it?</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {prompts.map((p) => (
              <li key={p.product_id} className="w-56 shrink-0 rounded-card bg-white p-3">
                {p.image ? <Image src={p.image} alt="" width={224} height={140} className="h-28 w-full rounded-xl object-cover" /> : null}
                <p className="mt-2 font-bold">{p.name}</p>
                <Link href={`/menu/${p.slug}#reviews`} className="mt-2 inline-flex items-center gap-1 text-sm font-bold underline"><Star className="size-4" /> Leave a review</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card bg-char p-5 text-cream" data-testid="taste-profile">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-bonnet uppercase"><Flame className="size-4" /> Your taste profile</p>
          {answers ? (
            <>
              <p className="font-display text-heading-sm">{SPICE[answers.spice ?? ""] ?? "Balanced"} heat · {answers.protein === "fish" ? "Fish lover" : answers.protein === "meat" ? "Meat lover" : "A bit of everything"}</p>
              <p className="mt-1 text-cream/75">Usually feeding {answers.crew === "solo" ? "just you" : answers.crew === "two" ? "two" : answers.crew === "family" ? "the family" : "a crowd"}.</p>
              <Link href="/quiz" className="mt-4 inline-flex text-sm font-bold underline">Retake the quiz</Link>
            </>
          ) : (
            <>
              <p className="text-cream/80">Take the 60-second quiz and we&apos;ll remember your spice level and favourites.</p>
              <Link href="/quiz" className="mt-4 inline-flex h-11 items-center rounded-full bg-bonnet px-5 font-bold text-char">Find your plate</Link>
            </>
          )}
        </div>
        <Link href="/account/rewards" className="flex flex-col justify-between rounded-card bg-paprika p-5">
          <p className="text-xs font-bold tracking-[0.12em] text-oxblood uppercase">Rewards</p>
          <p className="font-display text-heading-sm">Give ₦2,000, get ₦2,000</p>
          <p className="text-smoke">Invite a friend. When they order, you both win.</p>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-heading-sm">Recent orders</h2>
          <Link href="/account/orders" className="text-sm font-bold underline">All orders</Link>
        </div>
        {orders.length ? (
          <ul className="flex flex-col gap-3">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-card bg-white p-4">
                <Link href={`/account/orders/${o.number}`} className="min-w-0 flex-1">
                  <span className="block font-bold">{o.number}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)} · {formatNaira(o.totalKobo)}</span>
                </Link>
                <StatusBadge status={o.status as OrderStatus} method={o.method} />
                {o.paidAt ? <BuyAgainButton number={o.number} className="h-10 px-4 text-sm" /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No orders yet" body="Your first plate is a tap away." action={<Link href="/menu" className="inline-flex h-11 items-center rounded-full bg-bonnet px-5 font-bold">Browse the menu</Link>} />
        )}
      </section>
    </div>
  );
}
