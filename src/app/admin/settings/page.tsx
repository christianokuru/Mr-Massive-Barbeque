import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { SettingsForm } from "@/components/admin/admin-forms";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

// Auth-gated, per-request data: not expected to navigate instantly.
export const instant = false;

export default async function Settings() {
  await requireAdmin();
  const [row] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.id, 1));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[length:clamp(26px,7.5vw,36px)] leading-none md:text-heading-lg">Store settings</h1>
      <SettingsForm initial={{ whatsappNumber: row?.whatsappNumber ? `+${row.whatsappNumber}` : "", bannerDesktop: row?.bannerDesktop ?? "", bannerMobile: row?.bannerMobile ?? "" }} />
    </div>
  );
}
