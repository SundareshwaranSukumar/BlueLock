import { createFileRoute } from "@tanstack/react-router";
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
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const parsed = Schema.safeParse(await request.json());
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "Invalid payload" }), {
              status: 400, headers: { "Content-Type": "application/json", ...cors },
            });
          }
          // Mock dispatch — production would push to staff radios + push notifications.
          const clientsNotifiedCount = 800 + Math.floor(Math.random() * 1200);
          return new Response(JSON.stringify({ status: "DISPATCHED", clientsNotifiedCount }), {
            status: 200, headers: { "Content-Type": "application/json", ...cors },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Dispatch failed" }), {
            status: 500, headers: { "Content-Type": "application/json", ...cors },
          });
        }
      },
    },
  },
});
