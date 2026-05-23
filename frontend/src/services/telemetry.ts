/**
 * Telemetry service — single source of truth for the live-stream contract.
 *
 * Contract: `/v1/stadium/live-stream` → TelemetryPacket per tick.
 * - If VITE_TELEMETRY_WS_URL is set, opens a real WebSocket.
 * - Otherwise runs an in-process simulator emitting the exact same schema,
 *   so the UI is fully decoupled from transport.
 *
 * Consumers attach a single onPacket handler; they never own simulation state.
 */
import type { GateId, GateStatus, TelemetryPacket } from "@/domain/types";
import { AGENT_REACTIONS } from "@/domain/fixtures";

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
  return {
    liveScore: 142,
    wickets: 3,
    overs: 14.2,
    occ: { A: 42, B: 61, C: 28, D: 73 },
  };
}

function nextPacket(s: SimState): { state: SimState; packet: TelemetryPacket } {
  // ball advance
  const ballsThisOver = Math.round((s.overs - Math.floor(s.overs)) * 10);
  const o = Math.floor(s.overs);
  let no = o, nb = ballsThisOver + 1;
  if (nb >= 6) { nb = 0; no = o + 1; }
  const overs = parseFloat(`${no}.${nb}`);

  // event
  const r = Math.random();
  const isBoundary = r < 0.18;
  const isWicket = !isBoundary && r > 0.96;
  const runDelta = isBoundary ? (Math.random() < 0.35 ? 6 : 4) : Math.random() < 0.5 ? 1 : 0;
  const liveScore = s.liveScore + runDelta;
  const wickets = Math.min(10, s.wickets + (isWicket ? 1 : 0));

  // gate drift
  const occ: Record<GateId, number> = { ...s.occ };
  (Object.keys(occ) as GateId[]).forEach((id) => {
    const drift = (Math.random() - 0.45) * 6;
    occ[id] = Math.max(10, Math.min(98, occ[id] + drift));
  });

  // win prob — coarse model
  const ballsLeft = Math.max(1, (20 - no) * 6 - nb);
  const wp = Math.min(95, Math.max(5, Math.round(50 + (liveScore - 150) * 0.4 + (5 - wickets) * 3 - ballsLeft * 0.15)));

  const reaction = isWicket
    ? `WICKET! ${wickets}/10 down. Crowd surging at Gate ${pickHotGate(occ)}.`
    : isBoundary
      ? (runDelta === 6 ? "MAXIMUM! Core batter clears the roof! BlueLock grid stabilizing." : "FOUR! Crisp through the covers.")
      : AGENT_REACTIONS[Math.floor(Math.random() * AGENT_REACTIONS.length)];

  const packet: TelemetryPacket = {
    liveScore,
    wickets,
    overs,
    winProbability: `${wp}%`,
    agentReactionText: reaction,
    isWicket,
    isBoundary,
    gates: (Object.keys(occ) as GateId[]).map((id) => {
      const o = Math.round(occ[id]);
      return { gateId: id, occupancy: o, flowRate: Math.round(40 + o * 1.6), status: statusFor(o) };
    }),
  };

  return { state: { liveScore, wickets, overs, occ }, packet };
}

function pickHotGate(occ: Record<GateId, number>): GateId {
  return (Object.entries(occ) as [GateId, number][]).sort((a, b) => b[1] - a[1])[0][0];
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

  /** Allow command-side adjustments (director bypass) to influence the next packet. */
  applyBypass(from: GateId, to: GateId) {
    this.sim.occ[from] = Math.max(35, this.sim.occ[from] - 30);
    this.sim.occ[to] = Math.min(95, this.sim.occ[to] + 15);
  }

  private ensureStarted() {
    if (this.timer || this.ws) return;
    const url = typeof import.meta !== "undefined" ? (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env?.VITE_TELEMETRY_WS_URL : undefined;
    if (url) {
      try {
        this.ws = new WebSocket(url);
        this.ws.onmessage = (ev) => {
          try { this.emit(JSON.parse(ev.data) as TelemetryPacket); } catch { /* ignore */ }
        };
        this.ws.onclose = () => { this.ws = null; this.fallbackToSim(); };
        this.ws.onerror = () => { this.ws?.close(); };
        return;
      } catch { /* fall through */ }
    }
    this.fallbackToSim();
  }

  private fallbackToSim() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const { state, packet } = nextPacket(this.sim);
      this.sim = state;
      this.emit(packet);
    }, 2200);
  }

  private emit(p: TelemetryPacket) {
    for (const h of this.handlers) h(p);
  }

  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.ws) { this.ws.close(); this.ws = null; }
  }
}

export const telemetryService = new TelemetryService();
