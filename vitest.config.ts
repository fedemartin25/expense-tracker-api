
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
  },
});