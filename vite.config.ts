import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6971,
    proxy: {
      "/api": "http://localhost:6970",
    },
  },
  build: {
    outDir: "dist",
  },
});
