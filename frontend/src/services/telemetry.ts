/**
 * Telemetry service — WebSocket to /api/v1/stadium/live-stream when backend enabled.
 */
import type { GateId, GateStatus, TelemetryPacket } from "@/domain/types";
import { AGENT_REACTIONS } from "@/domain/fixtures";
import { telemetryWsUrl } from "@/services/api";

export type Unsubscribe = () => void;
export type TelemetryHandler = (p: TelemetryPacket) => void;

function statusFor(occ: number): GateStatus {
  if (occ >= 80) return "CRITICAL";
  if (occ >= 60) return "WARNING";
  return "NORMAL";
}

interface SimState {
  liveScore: number;
  wickets: number;
  overs: number;
  occ: Record<GateId, number>;
}

function makeInitialSim(): SimState {
  return { liveScore: 0, wickets: 0, overs: 0, occ: { A: 42, B: 58, C: 28, D: 71 } };
}

function nextPacket(s: SimState): { state: SimState; packet: TelemetryPacket } {
  const ballsThisOver = Math.round((s.overs - Math.floor(s.overs)) * 10);
  const o = Math.floor(s.overs);
  let no = o,
    nb = ballsThisOver + 1;
  if (nb >= 6) {
    nb = 0;
    no = o + 1;
  }
  const overs = parseFloat(`${no}.${nb}`);
  const liveScore = s.liveScore;
  const wickets = s.wickets;
  const occ: Record<GateId, number> = { ...s.occ };
  (Object.keys(occ) as GateId[]).forEach((id) => {
    const drift = (Math.random() - 0.45) * 6;
    occ[id] = Math.max(10, Math.min(98, occ[id] + drift));
  });
  const wp = "—";
  const packet: TelemetryPacket = {
    liveScore,
    wickets,
    overs,
    winProbability: wp,
    agentReactionText: AGENT_REACTIONS[Math.floor(Math.random() * AGENT_REACTIONS.length)],
    isWicket: false,
    isBoundary: false,
    matchLive: false,
    matchSource: "simulator",
    gates: (Object.keys(occ) as GateId[]).map((id) => {
      const o2 = Math.round(occ[id]);
      return {
        gateId: id,
        occupancy: o2,
        flowRate: Math.round(40 + o2 * 1.6),
        status: statusFor(o2),
      };
    }),
  };
  return { state: { liveScore, wickets, overs, occ }, packet };
}

class TelemetryService {
  private handlers = new Set<TelemetryHandler>();
  private sim: SimState = makeInitialSim();
  private timer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;

  subscribe(fn: TelemetryHandler): Unsubscribe {
    this.handlers.add(fn);
    this.ensureStarted();
    return () => {
      this.handlers.delete(fn);
      if (this.handlers.size === 0) this.stop();
    };
  }

  applyBypass(from: GateId, to: GateId) {
    this.sim.occ[from] = Math.max(35, this.sim.occ[from] - 30);
    this.sim.occ[to] = Math.min(95, this.sim.occ[to] + 15);
  }

  private ensureStarted() {
    if (this.timer || this.ws) return;
    const url = telemetryWsUrl();
    if (url) {
      try {
        this.ws = new WebSocket(url);
        this.ws.onmessage = (ev) => {
          try {
            this.emit(JSON.parse(ev.data) as TelemetryPacket);
          } catch {
            /* ignore */
          }
        };
        this.ws.onclose = () => {
          this.ws = null;
          this.fallbackToSim();
        };
        this.ws.onerror = () => {
          this.ws?.close();
        };
        return;
      } catch {
        /* fall through */
      }
    }
    this.fallbackToSim();
  }

  private fallbackToSim() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const { state, packet } = nextPacket(this.sim);
      this.sim = state;
      this.emit(packet);
    }, 3000);
  }

  private emit(p: TelemetryPacket) {
    for (const h of this.handlers) h(p);
  }

  private stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const telemetryService = new TelemetryService();
