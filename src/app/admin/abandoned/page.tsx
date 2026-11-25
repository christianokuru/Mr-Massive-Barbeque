import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/store/bits";
import { formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { normalizeWhatsapp } from "@/lib/validation";
import { abandonedBags } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Abandoned bags" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Abandoned() {
  await requireAdmin();
  const rows = await abandonedBags();
  const total = rows.reduce((s, r) => s + (r.value_kobo ?? 0), 0);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Abandoned bags</h1>
      <p className="text-muted-foreground">{rows.length} bags · {formatNaira(total)} left on the table. Reminder emails go out automatically (max 2 per bag) when we have an email.</p>
      {rows.length ? (
        <div className="overflow-x-auto rounded-card bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-muted-foreground"><tr><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3 text-right">Value</th><th className="p-3">Last active</th><th className="p-3">Reminders</th><th className="p-3" /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const wa = r.phone ? normalizeWhatsapp(r.phone) : null;
                return (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="p-3"><span className="block font-bold">{r.name ?? "Guest"}</span><span className="text-muted-foreground">{r.email ?? "No email yet"}</span></td>
                    <td className="max-w-xs p-3">{r.summary}</td>
                    <td className="p-3 text-right font-bold">{formatNaira(r.value_kobo ?? 0)}</td>
                    <td className="p-3 whitespace-nowrap">{formatDateTime(r.last_active_at)}</td>
                    <td className="p-3">{r.reminders_sent} / 2</td>
                    <td className="p-3">{wa ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi! Your Massive Barbeque bag is still waiting. Need help finishing your order?")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"><MessageCircle className="size-3.5" /> WhatsApp</a> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No abandoned bags" body="Bags left for over an hour show up here." />
      )}
    </div>
  );
}
