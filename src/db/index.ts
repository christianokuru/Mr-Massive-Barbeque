import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// WebSocket Pool gives real interactive transactions + SELECT ... FOR UPDATE.
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { mbPool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({ connectionString: url, max: 5 });
}

// Reuse one pool across hot reloads in dev.
const pool = globalForDb.mbPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.mbPool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
