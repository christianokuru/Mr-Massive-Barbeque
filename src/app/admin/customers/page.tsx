import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Pill } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { listCustomers } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Customers" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Customers({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = await listCustomers(q);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[36px] leading-none md:text-heading-lg">Customers</h1>
      <form action="/admin/customers"><input name="q" defaultValue={q} placeholder="Search name or email" className="h-11 w-full max-w-sm rounded-full border border-line bg-white px-4" /></form>
      {rows.length ? (
        <div className="overflow-x-auto rounded-card bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-muted-foreground"><tr><th className="p-3">Customer</th><th className="p-3">Joined</th><th className="p-3 text-right">Paid orders</th><th className="p-3 text-right">Spent</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="p-3"><Link href={`/admin/customers/${c.id}`} className="font-bold hover:underline">{c.name}</Link> {!c.verified ? <Pill tone="warn">unverified</Pill> : null}<span className="block text-muted-foreground">{c.email}</span></td>
                  <td className="p-3">{formatDate(c.createdAt)}</td>
                  <td className="p-3 text-right">{c.orders}</td>
                  <td className="p-3 text-right font-bold">{formatNaira(c.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No customers found" />
      )}
    </div>
  );
}
