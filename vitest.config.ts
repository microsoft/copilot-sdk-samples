import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["shared/**/*.ts", "samples/**/*.ts"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/index.ts", "**/*.d.ts"],
      thresholds: {
        statements: 50,
        branches: 45,
        functions: 55,
        lines: 50,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "./shared"),
    },
  },
});
