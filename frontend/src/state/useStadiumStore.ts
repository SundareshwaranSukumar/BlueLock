import { create } from "zustand";
import type {
  ChatMessage,
  Directive,
  Gate,
  GateId,
  MatchState,
  ParkingLot,
  TelemetryPacket,
  UserRole,
  UserTicket,
} from "@/domain/types";
import {
  INITIAL_GATES,
  MATCH_AWAY,
  MATCH_HOME,
  PARKING_LOTS,
  buildSeatMatrix,
} from "@/domain/fixtures";

export type ViewId = 1 | 2 | 3 | 4 | 5;

interface StadiumState {
  activeView: ViewId;
  setView: (v: ViewId) => void;

  userRole: UserRole;
  setRole: (r: UserRole) => void;

  gates: Gate[];
  parkingLots: ParkingLot[];
  intelLog: string[];

  seats: ReturnType<typeof buildSeatMatrix>;
  setSeats: (seats: ReturnType<typeof buildSeatMatrix>) => void;
  ticket: UserTicket | null;
  setTicket: (t: UserTicket) => void;
  clearTicket: () => void;

  directives: Directive[];
  pushDirective: (d: Directive) => void;

  match: MatchState;
  agentReaction: string;

  selectedTeam: "LSG" | "PBKS";
  userName: string;
  startingLocation: string;
  transportMode: string;
  setTeam: (t: "LSG" | "PBKS") => void;
  setUserName: (n: string) => void;
  setStartingLocation: (s: string) => void;
  setTransportMode: (m: string) => void;

  chat: ChatMessage[];
  chatOpen: boolean;
  pushChat: (m: ChatMessage) => void;
  setChatOpen: (b: boolean) => void;

  applyTelemetry: (p: TelemetryPacket) => void;
  rerouteTicketIfAffected: (fromGate: GateId, toGate: GateId) => void;
}

function statusToFlow(s: Gate["status"]): "ok" | "warn" | "crit" {
  return s === "CRITICAL" ? "crit" : s === "WARNING" ? "warn" : "ok";
}

export const useStadiumStore = create<StadiumState>((set, get) => ({
  activeView: 1,
  setView: (v) => set({ activeView: v }),

  userRole: "none",
  setRole: (r) => set({ userRole: r }),

  gates: INITIAL_GATES.map((g) => ({ ...g })),
  parkingLots: PARKING_LOTS.map((p) => ({ ...p })),
  intelLog: [],

  seats: buildSeatMatrix(),
  setSeats: (seats) => set({ seats }),
  ticket: null,
  setTicket: (t) => set({ ticket: t }),
  clearTicket: () => set({ ticket: null }),

  directives: [],
  pushDirective: (d) => set((s) => ({ directives: [d, ...s.directives].slice(0, 30) })),

  match: {
    runs: 0,
    wickets: 0,
    overs: "0.0",
    batting: MATCH_HOME,
    bowling: MATCH_AWAY,
    winProbability: "—",
    live: false,
    source: "awaiting",
  },
  agentReaction: "Connecting to Ekana live feed…",

  selectedTeam: MATCH_HOME,
  userName: "",
  startingLocation: "Lucknow Junction",
  transportMode: "metro",
  setTeam: (t) => set({ selectedTeam: t }),
  setUserName: (n) => set({ userName: n }),
  setStartingLocation: (s) => set({ startingLocation: s }),
  setTransportMode: (m) => set({ transportMode: m }),

  chat: [
    { id: "sys", role: "assistant", content: "BlueLock Concierge online for Ekana · LSG vs PBKS." },
  ],
  chatOpen: false,
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  setChatOpen: (b) => set({ chatOpen: b }),

  applyTelemetry: (p) =>
    set((s) => {
      const oversInt = Math.floor(p.overs);
      const balls = Math.round((p.overs - oversInt) * 10);
      const parking = p.parking
        ? Object.entries(p.parking).map(([id, lot], i) => ({
            id,
            name: id.replace("P-", "") + " Lot",
            capacity: lot.capacity,
            filled: lot.filled,
            gate: (["A", "B", "C", "D"] as GateId[])[i % 4],
          }))
        : s.parkingLots;
      return {
        gates: s.gates.map((g) => {
          const u = p.gates.find((x) => x.gateId === g.id);
          if (!u) return g;
          return {
            ...g,
            load: u.occupancy,
            flowRate: u.flowRate ?? u.scansPerMin ?? g.flowRate,
            status: u.status,
          };
        }),
        parkingLots: parking,
        match: {
          ...s.match,
          runs: p.liveScore,
          wickets: p.wickets,
          overs: `${oversInt}.${balls}`,
          winProbability: p.winProbability,
          batting: p.batting ?? s.match.batting,
          bowling: p.bowling ?? s.match.bowling,
          live: p.matchLive ?? p.liveScore > 0,
          source: p.matchSource ?? s.match.source,
        },
        agentReaction: p.agentReactionText,
      };
    }),

  rerouteTicketIfAffected: (fromGate, toGate) =>
    set((s) => {
      if (!s.ticket || s.ticket.assignedGate !== fromGate) return s;
      const alt = s.gates.find((g) => g.id === toGate);
      if (!alt) return s;
      return {
        ticket: {
          ...s.ticket,
          assignedGate: toGate,
          entryCorridor: alt.corridor,
          metroLoad: statusToFlow(alt.status),
          recommendedRoute: `Diverted via ${alt.corridor} corridor → Gate ${toGate}.`,
        },
      };
    }),
}));
