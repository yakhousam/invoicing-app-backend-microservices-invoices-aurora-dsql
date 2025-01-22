import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // ... Specify options here.
    env: {
      TABLE_NAME: "test-table-name",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
