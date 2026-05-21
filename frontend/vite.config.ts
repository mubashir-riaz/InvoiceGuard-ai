// Vite configuration for React project.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all interfaces (needed for Docker)
    port: 5173,
  },
});
