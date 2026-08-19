import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Tests drive the UI against a mocked API client, so they need no
    // database or running server.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
