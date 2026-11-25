import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { AddressManager } from "@/components/account/account-ui";
import { getZones } from "@/server/catalogue";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function AddressesPage() {
  const session = await requireUser("/account/addresses");
  const [rows, zones] = await Promise.all([
    db
      .select({ a: s.address, zoneName: s.shippingZone.name })
      .from(s.address)
      .leftJoin(s.shippingZone, eq(s.shippingZone.id, s.address.zoneId))
      .where(eq(s.address.userId, session.user.id))
      .orderBy(desc(s.address.isDefault), desc(s.address.createdAt)),
    getZones(),
  ]);
  return (
    <div>
      <h1 className="mb-8 text-[44px] leading-[0.9] md:text-heading-lg">Addresses</h1>
      <AddressManager
        addresses={rows.map(({ a, zoneName }) => ({ id: a.id, label: a.label, line1: a.line1, area: a.area, zoneName, phone: a.phone, isDefault: a.isDefault }))}
        zones={zones.map((z) => ({ id: z.id, name: z.name }))}
      />
    </div>
  );
}
