import { createFileRoute } from "@tanstack/react-router";
import { corsOptions, proxyPostToBackend, shouldProxyToBackend } from "@/lib/backend-proxy";
import { z } from "zod";

const Schema = z.object({
  congestedGateId: z.enum(["A", "B", "C", "D"]),
  targetDiversionGateId: z.enum(["A", "B", "C", "D"]),
  staffDirectiveText: z.string().trim().min(1).max(500),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/v1/admin/bypass-route")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      POST: async ({ request }) => {
        if (shouldProxyToBackend()) {
          return proxyPostToBackend(request, "/api/v1/admin/bypass-route");
        }
        try {
          const parsed = Schema.safeParse(await request.json());
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "Invalid payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }
          const clientsNotifiedCount = 800 + Math.floor(Math.random() * 1200);
          return new Response(JSON.stringify({ status: "DISPATCHED", clientsNotifiedCount }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...cors },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Dispatch failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
      },
    },
  },
});
