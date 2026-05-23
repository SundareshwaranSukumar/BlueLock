import { create } from "zustand";
import type { ChatMessage, Directive, Gate, GateId, MatchState, TelemetryPacket, UserRole, UserTicket } from "@/domain/types";
import { INITIAL_GATES, buildSeatMatrix } from "@/domain/fixtures";

export type ViewId = 1 | 2 | 3 | 4 | 5;

interface StadiumState {
  activeView: ViewId;
  setView: (v: ViewId) => void;

  userRole: UserRole;
  setRole: (r: UserRole) => void;


  gates: Gate[];

  seats: ReturnType<typeof buildSeatMatrix>;
  ticket: UserTicket | null;
  setTicket: (t: UserTicket) => void;
  clearTicket: () => void;

  directives: Directive[];
  pushDirective: (d: Directive) => void;

  match: MatchState;
  agentReaction: string;

  selectedTeam: "CSK" | "MI";
  userName: string;
  setTeam: (t: "CSK" | "MI") => void;
  setUserName: (n: string) => void;

  // chat
  chat: ChatMessage[];
  chatOpen: boolean;
  pushChat: (m: ChatMessage) => void;
  setChatOpen: (b: boolean) => void;

  // telemetry sink (called by service layer; no UI logic)
  applyTelemetry: (p: TelemetryPacket) => void;
  /** Director rerouted user out of a congested gate — self-heal local ticket. */
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

  gates: INITIAL_GATES.map(g => ({ ...g })),

  seats: buildSeatMatrix(),
  ticket: null,
  setTicket: (t) => set({ ticket: t }),
  clearTicket: () => set({ ticket: null }),

  directives: [],
  pushDirective: (d) => set((s) => ({ directives: [d, ...s.directives].slice(0, 30) })),

  match: { runs: 142, wickets: 3, overs: "14.2", batting: "CSK", bowling: "MI", winProbability: "62%" },
  agentReaction: "Powerplay control — CSK riding the cover drive.",

  selectedTeam: "CSK",
  userName: "",
  setTeam: (t) => set({ selectedTeam: t }),
  setUserName: (n) => set({ userName: n }),

  chat: [
    { id: "sys", role: "assistant", content: "I'm your BlueLock Concierge. Ask me about gates, routes, or metro pulse." },
  ],
  chatOpen: false,
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  setChatOpen: (b) => set({ chatOpen: b }),

  applyTelemetry: (p) =>
    set((s) => {
      const oversInt = Math.floor(p.overs);
      const balls = Math.round((p.overs - oversInt) * 10);
      return {
        gates: s.gates.map((g) => {
          const u = p.gates.find((x) => x.gateId === g.id);
          if (!u) return g;
          return { ...g, load: u.occupancy, flowRate: u.flowRate, status: u.status };
        }),
        match: {
          ...s.match,
          runs: p.liveScore,
          wickets: p.wickets,
          overs: `${oversInt}.${balls}`,
          winProbability: p.winProbability,
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
