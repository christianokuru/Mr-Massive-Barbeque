import type { Metadata } from "next";
import { count, desc } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import * as s from "@/db/schema";
import { EmptyState } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Subscribers" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Subscribers() {
  await requireAdmin();
  const [rows, [total]] = await Promise.all([
    db.select().from(s.subscriber).orderBy(desc(s.subscriber.createdAt)).limit(500),
    db.select({ n: count() }).from(s.subscriber),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Subscribers <span className="text-muted-foreground">({total.n})</span></h1>
        <a href="/api/admin/subscribers.csv" className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-oxblood px-4 font-bold text-oxblood"><Download className="size-4" /> CSV</a>
      </div>
      {rows.length ? (
        <ul className="divide-y divide-line rounded-card bg-white px-4">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3"><span className="font-bold">{r.email}</span><span className="text-sm text-muted-foreground">{r.source} · {formatDate(r.createdAt)}</span></li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No subscribers yet" body="Footer sign-ups, quiz emails and opted-in customers appear here." />
      )}
    </div>
  );
}
