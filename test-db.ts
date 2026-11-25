import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/**
 * Every test (Vitest + Playwright) runs on the "dev" Neon branch, never the live store.
 * Point DATABASE_URL at TEST_DATABASE_URL before anything connects; refuse to run without it.
 */
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL is not set. Tests only run on the "dev" database branch; see .env.example.');
if (process.env.LIVE_DATABASE_URL && url === process.env.LIVE_DATABASE_URL) throw new Error("TEST_DATABASE_URL points at the live database.");
process.env.DATABASE_URL = url;
