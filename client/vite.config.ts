import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@crucible/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:2567",
        ws: true,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ws/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    target: "es2022",
  },
});
