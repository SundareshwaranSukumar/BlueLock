import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  userName: z.string().trim().min(1).max(80),
  gender: z.enum(["Male", "Female"]),
  teamAllegiance: z.enum(["CSK", "MI"]),
  seatId: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/),
});

type Gate = "A" | "B" | "C" | "D";

const STAND_PREF: Record<string, Gate> = { R: "A", P: "B", G: "C", M: "D" };
const CORRIDOR: Record<Gate, "North" | "South" | "East" | "West"> = {
  A: "North", B: "East", C: "West", D: "South",
};
const NEAREST_TRANSIT: Record<Gate, string> = {
  A: "Namma Metro · Cubbon Park (350m)",
  B: "BMTC Hub · MG Road (480m)",
  C: "Namma Metro · Vidhana Soudha (620m)",
  D: "Namma Metro · Trinity (210m)",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/v1/tickets/book")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = Schema.safeParse(body);
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.flatten() }), {
              status: 400, headers: { "Content-Type": "application/json", ...cors },
            });
          }
          const data = parsed.data;
          const standKey = (data.seatId[0] || "R").toUpperCase();
          const assignedGate: Gate = STAND_PREF[standKey] ?? "A";
          const corridor = CORRIDOR[assignedGate];

          const res = {
            ticketId: `BL-${data.seatId}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            assignedGate,
            recommendedRoute: `Enter via ${corridor} concourse → Gate ${assignedGate} → ${standKey === "R" ? "Raghavendra" : standKey === "P" ? "Pavilion" : standKey === "G" ? "Garden" : "Metro"} Stand.`,
            nearestTransit: NEAREST_TRANSIT[assignedGate],
            entryCorridor: corridor,
            metroLoad: assignedGate === "D" ? "warn" : "ok",
          };
          return new Response(JSON.stringify(res), {
            status: 200, headers: { "Content-Type": "application/json", ...cors },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: "Booking failed" }), {
            status: 500, headers: { "Content-Type": "application/json", ...cors },
          });
        }
      },
    },
  },
});
