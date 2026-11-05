import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Forwards /api calls to the FastAPI backend, so no CORS setup is needed in dev.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8000" } },
});
