import type { Metadata } from "next";
import { CouponForm, CouponToggle } from "@/components/admin/admin-forms";
import { Pill } from "@/components/store/bits";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { couponsWithRevenue } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Coupons" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Coupons() {
  await requireAdmin();
  const rows = await couponsWithRevenue();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Coupons</h1>
      <CouponForm />
      <div className="overflow-x-auto rounded-card bg-white">
        <table className="w-full min-w-[820px] text-sm" data-testid="coupons-table">
          <thead className="border-b border-line text-left text-muted-foreground">
            <tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Rules</th><th className="p-3">Influencer</th><th className="p-3 text-right">Uses</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Revenue</th><th className="p-3">Active</th></tr>
          </thead>
          <tbody>
            {rows.map(({ c, orders, revenue }) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="p-3 font-bold">{c.code} {c.source === "welcome" ? <Pill tone="info">welcome</Pill> : c.ownerEmail ? <Pill>personal</Pill> : null}</td>
                <td className="p-3">{c.kind === "percent" ? `${c.value}%` : formatNaira(c.value)}</td>
                <td className="p-3 text-muted-foreground">{c.minSubtotalKobo ? `Min ${formatNaira(c.minSubtotalKobo)}` : "No minimum"} · once per email{c.endsAt ? ` · ends ${formatDate(c.endsAt)}` : ""}</td>
                <td className="p-3">{c.influencer ?? "—"}</td>
                <td className="p-3 text-right">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="p-3 text-right">{orders}</td>
                <td className="p-3 text-right font-bold">{formatNaira(revenue)}</td>
                <td className="p-3"><CouponToggle id={c.id} active={c.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
