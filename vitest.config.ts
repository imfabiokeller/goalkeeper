import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "usecase/tools/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    testTimeout: 30_000,
  },
});
