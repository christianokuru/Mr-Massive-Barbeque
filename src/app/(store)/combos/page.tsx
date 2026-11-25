import type { Metadata } from "next";
import { ComboCard } from "@/components/store/combo-card";
import { EmptyState } from "@/components/store/bits";
import { getCombos } from "@/server/catalogue";

export const metadata: Metadata = {
  title: "Combos & platters: grilled fish and chicken meals",
  description: "Save on Massive Barbeque combos: catfish feasts, date-night duos and family grill platters with sides. Delivered hot across Lagos.",
  alternates: { canonical: "/combos" },
};

export default async function CombosPage() {
  const combos = await getCombos();
  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow mb-3">Combos & platters</p>
      <h1 className="text-[48px] leading-[0.88] md:text-display">More grill, less money</h1>
      <p className="mt-4 max-w-2xl text-body-lg text-smoke">Our favourite pairings, priced below buying each item on its own. Perfect for two, the family, or the whole office.</p>
      <div className="mt-10">
        {combos.length ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((c) => <ComboCard key={c.id} c={c} />)}
          </div>
        ) : (
          <EmptyState title="No combos right now" body="Check back soon, or build your own from the menu." />
        )}
      </div>
    </div>
  );
}
