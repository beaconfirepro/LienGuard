import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Replit-friendly: bind 0.0.0.0 and allow the proxy host so the webview loads.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: { clientPort: 443 },
  },
});
