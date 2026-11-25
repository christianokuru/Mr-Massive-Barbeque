import { desc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { csvResponse } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { adminOrNull } from "@/server/session";

export async function GET() {
  if (!(await adminOrNull())) return new Response("Not found", { status: 404 });
  const rows = await db.select().from(s.subscriber).orderBy(desc(s.subscriber.createdAt));
  return csvResponse(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Email", "Source", "Joined (Lagos)"],
    ...rows.map((r) => [r.email, r.source, formatDateTime(r.createdAt)]),
  ]);
}
