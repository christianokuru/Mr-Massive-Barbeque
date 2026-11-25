import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ReviewActions } from "@/components/admin/admin-forms";
import { EmptyState, Pill, Stars } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Reviews" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Reviews({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.status === "approved" || sp.status === "rejected" ? sp.status : "pending";
  const rows = await db
    .select({ r: s.review, product: s.product.name, slug: s.product.slug })
    .from(s.review)
    .innerJoin(s.product, eq(s.product.id, s.review.productId))
    .where(eq(s.review.status, tab))
    .orderBy(desc(s.review.createdAt))
    .limit(200);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[36px] leading-none md:text-heading-lg">Reviews</h1>
      <nav className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <Link key={t} href={`/admin/reviews?status=${t}`} className={cn("rounded-full px-4 py-2 text-sm font-bold capitalize", t === tab ? "bg-oxblood text-cream" : "bg-white")}>{t}</Link>
        ))}
      </nav>
      {rows.length ? (
        <ul className="grid gap-4 xl:grid-cols-2">
          {rows.map(({ r, product, slug }) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-card bg-white p-5" data-testid="review-row">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/menu/${slug}`} className="font-bold hover:underline">{product}</Link>
                <Stars value={r.rating} />
              </div>
              <p className="text-sm text-muted-foreground">{r.authorName} · Verified buyer · {formatDate(r.createdAt)} <Pill tone="info">{r.spiceLevel.replace("_", " ")}</Pill></p>
              {r.title ? <p className="font-bold">{r.title}</p> : null}
              <p className="text-smoke">{r.body}</p>
              <ReviewActions id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={`No ${tab} reviews`} body="Verified-buyer reviews land here for approval." />
      )}
    </div>
  );
}
