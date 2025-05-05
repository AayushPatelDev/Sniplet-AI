import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /api/* → http://localhost:3001/api/*
      "/api": "http://localhost:3001",
    },
  },
});
