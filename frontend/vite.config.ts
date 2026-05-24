/**
 * Simple Vite SPA config — no SSR, no Cloudflare Workers.
 * Uses standard Vite + React + Tailwind + TanStack Router (client-only).
 */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const backendTarget = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => {
  // Load VITE_* env vars from files, and merge with system process.env
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const env = { ...fileEnv };

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("VITE_") && value !== undefined) {
      env[key] = value;
    }
  }

  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define,
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
    ],
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/v1": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/health": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/api/v1/stadium/live-stream": {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
