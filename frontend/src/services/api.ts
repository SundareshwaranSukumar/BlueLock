/**
 * Thin transport client for /api/v1/* routes.
 */
import type { GateId } from "@/domain/types";
import { apiUrl } from "@/lib/api-base";

export type TeamAllegiance = "LSG" | "PBKS";

export interface BookTicketReq {
  userName: string;
  gender: "Male" | "Female";
  teamAllegiance: TeamAllegiance;
  seatId: string;
  startingLocation?: string;
  transportMode?: string;
}
export interface BookTicketRes {
  ticketId: string;
  assignedGate: GateId;
  recommendedRoute: string;
  nearestTransit: string;
  entryCorridor: "North" | "South" | "East" | "West";
  metroLoad: "ok" | "warn" | "crit";
  qrCodeSvgBase64?: string;
  googleWalletLink?: string;
  standName?: string;
}

export interface SeatStatusRes {
  standName: string;
  seats: { seatId: string; status: string; updatedAt: string }[];
}

export interface BypassReq {
  congestedGateId: GateId;
  targetDiversionGateId: GateId;
  staffDirectiveText: string;
}
export interface BypassRes {
  status: "DISPATCHED";
  clientsNotifiedCount: number;
}

export interface AssistantReq {
  userId: string;
  message: string;
  currentGate?: string;
  userLocationContext?: string;
}
export interface AssistantRes {
  replyText: string;
  suggestedAction: "REDIRECT" | "STAY" | "PROCEED";
  targetGate?: GateId;
}

async function postJSON<TIn, TOut>(path: string, body: TIn): Promise<TOut> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<TOut>;
}

async function getJSON<TOut>(path: string): Promise<TOut> {
  const res = await fetch(apiUrl(path));
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<TOut>;
}

export function telemetryWsUrl(): string | undefined {
  const explicit = import.meta.env.VITE_TELEMETRY_WS_URL as string | undefined;
  if (explicit?.trim()) return explicit.trim();
  if (import.meta.env.VITE_USE_BACKEND === "true" || import.meta.env.VITE_USE_BACKEND === "1") {
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    const host = typeof window !== "undefined" ? window.location.host : "127.0.0.1:5173";
    return `${proto}://${host}/api/v1/stadium/live-stream`;
  }
  return undefined;
}

export const apiClient = {
  bookTicket: (req: BookTicketReq) => postJSON<BookTicketReq, BookTicketRes>("/api/v1/tickets/book", req),
  lockSeat: (seatId: string) => postJSON<{ seatId: string }, { seatId: string; status: string }>("/api/v1/seats/lock", { seatId }),
  getSeatStatus: (standName: string) => getJSON<SeatStatusRes>(`/api/v1/seats/status/${encodeURIComponent(standName)}`),
  bypassRoute: (req: BypassReq) => postJSON<BypassReq, BypassRes>("/api/v1/admin/bypass-route", req),
  assistant: (req: AssistantReq) => postJSON<AssistantReq, AssistantRes>("/api/v1/ai/stadium-assistant", req),
  stadiumSnapshot: () => getJSON<Record<string, unknown>>("/api/v1/stadium/snapshot"),
};
