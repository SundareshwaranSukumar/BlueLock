/**
 * Thin transport client for /api/v1/* routes.
 * UI components depend on these typed wrappers, not on fetch.
 */
import type { GateId } from "@/domain/types";

export interface BookTicketReq {
  userName: string;
  gender: "Male" | "Female";
  teamAllegiance: "CSK" | "MI";
  seatId: string;
}
export interface BookTicketRes {
  ticketId: string;
  assignedGate: GateId;
  recommendedRoute: string;
  nearestTransit: string;
  entryCorridor: "North" | "South" | "East" | "West";
  metroLoad: "ok" | "warn" | "crit";
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
  const res = await fetch(path, {
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

export const apiClient = {
  bookTicket: (req: BookTicketReq) => postJSON<BookTicketReq, BookTicketRes>("/api/v1/tickets/book", req),
  bypassRoute: (req: BypassReq) => postJSON<BypassReq, BypassRes>("/api/v1/admin/bypass-route", req),
  assistant: (req: AssistantReq) => postJSON<AssistantReq, AssistantRes>("/api/v1/ai/stadium-assistant", req),
};
