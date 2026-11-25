import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ZoneRow } from "@/components/admin/admin-forms";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Delivery zones" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Shipping() {
  await requireAdmin();
  const zones = await db.select().from(s.shippingZone).orderBy(asc(s.shippingZone.sort), asc(s.shippingZone.id));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Delivery zones</h1>
      <p className="text-muted-foreground">Fee, free-delivery threshold and ETA per Lagos area. Pickup is always free.</p>
      {zones.map((z) => (
        <ZoneRow key={z.id} zone={{ id: z.id, name: z.name, areas: z.areas, feeNaira: z.feeKobo / 100, freeOverNaira: z.freeOverKobo ? z.freeOverKobo / 100 : null, etaText: z.etaText, active: z.active }} />
      ))}
      <h2 className="mt-4 text-heading-sm">Add a zone</h2>
      <ZoneRow zone={{ name: "", areas: "", feeNaira: 2000, freeOverNaira: null, etaText: "", active: true }} />
    </div>
  );
}
