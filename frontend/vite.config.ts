import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: "all",
    proxy: {
      // Proxy API calls to the FastAPI backend during development.
      // ws: true upgrades the CRDT collaboration socket (/api/pads/:slug/ws).
      "/api": { target: "http://localhost:8000", ws: true },
      "/health": "http://localhost:8000",
    },
  },
});
