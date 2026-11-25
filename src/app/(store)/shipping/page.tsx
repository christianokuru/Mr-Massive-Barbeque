import type { Metadata } from "next";
import { InfoPage } from "@/components/store/info-page";
import { formatNaira } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { getZones } from "@/server/catalogue";

export const metadata: Metadata = {
  title: "Delivery areas & fees in Lagos",
  description: "Massive Barbeque delivery zones, fees, free-delivery thresholds and delivery times across Lagos. Free pickup available.",
  alternates: { canonical: "/shipping" },
};

export default async function Shipping() {
  const zones = await getZones();
  return (
    <InfoPage eyebrow="Delivery" title="Delivery across Lagos" intro="Hot delivery by area, or free pickup. Everything is grilled when you pay, so times include the grill.">
      <div className="overflow-x-auto rounded-card bg-white">
        <table className="w-full min-w-[520px] text-left text-base">
          <thead className="border-b border-line text-sm text-muted-foreground"><tr><th className="p-4">Zone</th><th className="p-4">Fee</th><th className="p-4">Free over</th><th className="p-4">Time</th></tr></thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-b border-line last:border-0">
                <td className="p-4"><span className="block font-bold text-char">{z.name}</span><span className="text-sm text-muted-foreground">{z.areas}</span></td>
                <td className="p-4">{formatNaira(z.feeKobo)}</td>
                <td className="p-4">{z.freeOverKobo ? formatNaira(z.freeOverKobo) : "—"}</td>
                <td className="p-4 whitespace-nowrap">{z.etaText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Pickup</h2>
      <p>Choose Pickup at checkout. It&apos;s free. Collect from <strong>{siteConfig.pickup.full}</strong>; we&apos;ll let you know when your order is ready.</p>
      <h2>Your area isn&apos;t listed?</h2>
      <p>Message us on WhatsApp before ordering and we&apos;ll tell you if we can reach you.</p>
    </InfoPage>
  );
}
