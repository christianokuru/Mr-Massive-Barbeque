import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, Mail, MessageCircle } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { StatusBadge } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { REVENUE_STATUSES, type OrderStatus } from "@/lib/order-status";
import { normalizeWhatsapp } from "@/lib/validation";
import { latestQuiz, listMyOrders } from "@/server/account";
import { customerFavourites } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Customer" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Customer({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [u] = await db.select().from(s.user).where(eq(s.user.id, id));
  if (!u) notFound();
  const [orders, addresses, [profile], quiz, favs] = await Promise.all([
    listMyOrders(u.id, u.email, 100),
    db.select().from(s.address).where(eq(s.address.userId, u.id)),
    db.select().from(s.profile).where(eq(s.profile.userId, u.id)),
    latestQuiz(u.id, u.email),
    customerFavourites(u.id, u.email),
  ]);
  const paid = orders.filter((o) => (REVENUE_STATUSES as readonly string[]).includes(o.status));
  const spent = paid.reduce((sum, o) => sum + o.totalKobo, 0);
  const phone = profile?.phone ?? orders[0]?.phone ?? null;
  const wa = phone ? normalizeWhatsapp(phone) : null;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/customers" className="inline-flex w-fit items-center gap-1 text-sm font-bold"><ChevronLeft className="size-4" /> Customers</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">{u.name}</h1>
          <p className="mt-2 text-muted-foreground">{u.email}{phone ? ` · ${phone}` : ""} · joined {formatDate(u.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <a href={`mailto:${u.email}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 font-bold"><Mail className="size-4" /> Email</a>
          {wa ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 font-bold text-white"><MessageCircle className="size-4" /> WhatsApp</a> : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-card bg-white p-5"><p className="text-sm font-bold text-muted-foreground">Paid orders</p><p className="font-display text-[length:clamp(24px,7vw,34px)]">{paid.length}</p></div>
        <div className="rounded-card bg-white p-5"><p className="text-sm font-bold text-muted-foreground">Spent (NGN)</p><p className="font-display text-[length:clamp(24px,7vw,34px)]">{formatNaira(spent)}</p></div>
        <div className="rounded-card bg-white p-5"><p className="text-sm font-bold text-muted-foreground">Average order</p><p className="font-display text-[length:clamp(24px,7vw,34px)]">{formatNaira(paid.length ? Math.round(spent / paid.length / 100) * 100 : 0)}</p></div>
        <div className="rounded-card bg-white p-5"><p className="text-sm font-bold text-muted-foreground">Marketing</p><p className="font-display text-[length:clamp(24px,7vw,34px)]">{profile?.marketingOptIn ? "Opted in" : "No"}</p></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="rounded-card bg-white p-5">
          <h2 className="mb-3 font-sans text-body-lg font-bold">Orders</h2>
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link href={`/admin/orders/${o.id}`} className="font-bold hover:underline">{o.number}</Link>
                <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</span>
                <StatusBadge status={o.status as OrderStatus} method={o.method} />
                <span className="ml-auto font-bold">{formatNaira(o.totalKobo)}</span>
              </li>
            ))}
            {!orders.length ? <li className="py-3 text-muted-foreground">No orders yet.</li> : null}
          </ul>
        </section>
        <div className="flex flex-col gap-6">
          <section className="rounded-card bg-white p-5" data-testid="customer-favourites">
            <h2 className="mb-3 font-sans text-body-lg font-bold">Usually orders</h2>
            {favs.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {favs.map((f) => (
                  <li key={f.name} className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{f.name}</span>
                    <span className="shrink-0 text-muted-foreground">{f.times === paid.length ? "every order" : `${f.times} of ${paid.length} orders`} · {f.qty} total</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No paid orders yet.</p>
            )}
          </section>
          <section className="rounded-card bg-white p-5">
            <h2 className="mb-3 font-sans text-body-lg font-bold">Addresses</h2>
            {addresses.length ? addresses.map((a) => <p key={a.id} className="text-sm"><span className="font-bold">{a.label}:</span> {a.line1}, {a.area}</p>) : <p className="text-sm text-muted-foreground">None saved.</p>}
          </section>
          <section className="rounded-card bg-white p-5">
            <h2 className="mb-3 font-sans text-body-lg font-bold">Taste profile (quiz)</h2>
            {quiz ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(quiz.answers, null, 2)}</pre> : <p className="text-sm text-muted-foreground">Hasn&apos;t taken the quiz.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
