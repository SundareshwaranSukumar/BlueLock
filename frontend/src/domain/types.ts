export type GateId = "A" | "B" | "C" | "D";
export type GateStatus = "NORMAL" | "WARNING" | "CRITICAL";
export type FlowStatus = "ok" | "warn" | "crit";
export type SeatTier = "PREMIUM" | "GOLD" | "SILVER";
export type UserRole = "none" | "fan" | "admin";
export type TeamCode = "LSG" | "PBKS" | "CSK" | "MI" | "RCB" | "KKR";

export interface Gate {
  id: GateId;
  name: string;
  load: number;
  flowRate: number;
  status: GateStatus;
  capacity: number;
  corridor: "North" | "South" | "East" | "West";
  bypassActive: boolean;
}

export interface Seat {
  id: string;
  row: string;
  col: number;
  stand: string;
  occupied: boolean;
  tier: SeatTier;
  price: number;
  apiStatus?: "Available" | "Locked" | "Booked";
}

export interface UserTicket {
  ticketId: string;
  seatId: string;
  stand: string;
  tier: SeatTier;
  price: number;
  entryCorridor: "North" | "South" | "East" | "West";
  assignedGate: GateId;
  metroLoad: FlowStatus;
  recommendedRoute: string;
  nearestTransit: string;
  nearestParking: string;
  qrCodeSvgBase64?: string;
  googleWalletLink?: string;
}

export interface Directive {
  id: string;
  timestamp: number;
  text: string;
  gate: GateId;
  notifiedCount?: number;
}

export interface Player {
  id: string;
  name: string;
  team: TeamCode;
  role: "BAT" | "BOWL" | "AR" | "WK";
  attrs: { strike: number; control: number; power: number; consistency: number; fielding: number };
  phases: { powerplay: number; middle: number; death: number };
}

export interface TeamRow {
  team: string;
  short: TeamCode;
  played: number;
  won: number;
  lost: number;
  nrr: number;
  points: number;
}

export interface MatchState {
  runs: number;
  wickets: number;
  overs: string;
  batting: TeamCode;
  bowling: TeamCode;
  winProbability: string;
  live: boolean;
  source: string;
}

export interface TelemetryPacket {
  liveScore: number;
  wickets: number;
  overs: number;
  winProbability: string;
  agentReactionText: string;
  isWicket: boolean;
  isBoundary: boolean;
  batting?: TeamCode;
  bowling?: TeamCode;
  matchLive?: boolean;
  matchSource?: string;
  gates: {
    gateId: GateId;
    occupancy: number;
    flowRate: number;
    status: GateStatus;
    scansPerMin?: number;
  }[];
  parking?: Record<string, { capacity: number; filled: number; free: number; pct: number }>;
  transit_feed?: { mode: string; line: string; status: string; eta: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  suggestedAction?: "REDIRECT" | "STAY" | "PROCEED";
  targetGate?: GateId;
}

export interface ParkingLot {
  id: string;
  name: string;
  capacity: number;
  filled: number;
  gate: GateId;
}
