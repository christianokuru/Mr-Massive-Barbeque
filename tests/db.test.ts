import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";

describe("database", () => {
  afterAll(async () => {
    await db.$client.end();
  });

  it("connects through the WebSocket pool and supports transactions", async () => {
    const result = await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`select 1 as ok`);
      return rows.rows[0];
    });
    expect(result).toEqual({ ok: 1 });
  });
});
