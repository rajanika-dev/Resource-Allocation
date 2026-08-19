import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The repo keeps a single .env at the workspace root (see .env.example),
  // so point Vite there instead of apps/web.
  envDir: "../..",
  server: {
    port: 5173,
  },
});
