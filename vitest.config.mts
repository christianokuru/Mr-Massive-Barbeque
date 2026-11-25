import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import "./test-db.ts";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; tests run in Node.
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests hit the real DB; run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
