import type { Gate, ParkingLot, Player, Seat, SeatTier, TeamRow } from "./types";

export const INITIAL_GATES: Gate[] = [
  { id: "A", name: "Gate A — Raghavendra", load: 42, flowRate: 90,  status: "NORMAL",  capacity: 100, corridor: "North", bypassActive: false },
  { id: "B", name: "Gate B — Pavilion",    load: 61, flowRate: 70,  status: "WARNING", capacity: 100, corridor: "East",  bypassActive: false },
  { id: "C", name: "Gate C — Garden",      load: 28, flowRate: 30,  status: "NORMAL",  capacity: 100, corridor: "West",  bypassActive: false },
  { id: "D", name: "Gate D — Metro",       load: 73, flowRate: 110, status: "WARNING", capacity: 100, corridor: "South", bypassActive: false },
];

export const STANDS = [
  { name: "Pavilion", side: "north", gateId: "B" as const, transit: "Cubbon Park Metro (450m)", parking: "P1 — Cubbon Lot" },
  { name: "Garden",   side: "west",  gateId: "C" as const, transit: "MG Road Metro (650m)",     parking: "P3 — Garden Lot" },
  { name: "Raghavendra", side: "south", gateId: "A" as const, transit: "Trinity Metro (700m)",  parking: "P2 — Trinity Lot" },
  { name: "Metro",    side: "east",  gateId: "D" as const, transit: "Vidhana Soudha Metro (350m)", parking: "P4 — Metro Lot" },
];

const ROWS_FOR_TIER: Record<SeatTier, string[]> = {
  PREMIUM: ["A", "B"],
  GOLD: ["C", "D", "E"],
  SILVER: ["F", "G", "H", "I"],
};
const PRICE_FOR_TIER: Record<SeatTier, number> = { PREMIUM: 12000, GOLD: 6500, SILVER: 2200 };
const COLS = 18;

export function buildSeatMatrix(): Seat[] {
  const seats: Seat[] = [];
  for (const stand of STANDS) {
    (Object.keys(ROWS_FOR_TIER) as SeatTier[]).forEach((tier) => {
      for (const r of ROWS_FOR_TIER[tier]) {
        for (let c = 1; c <= COLS; c++) {
          // dead-center columns reserved for aisle
          if (c === 9 || c === 10) continue;
          seats.push({
            id: `${stand.name[0]}-${r}${c}`,
            row: r,
            col: c,
            stand: stand.name,
            occupied: Math.random() < (tier === "PREMIUM" ? 0.5 : tier === "GOLD" ? 0.38 : 0.25),
            tier,
            price: PRICE_FOR_TIER[tier],
          });
        }
      }
    });
  }
  return seats;
}

export const PARKING_LOTS: ParkingLot[] = [
  { id: "P1", name: "Cubbon Lot",   capacity: 420, filled: 312, gate: "B" },
  { id: "P2", name: "Trinity Lot",  capacity: 280, filled: 145, gate: "A" },
  { id: "P3", name: "Garden Lot",   capacity: 360, filled: 98,  gate: "C" },
  { id: "P4", name: "Metro Lot",    capacity: 510, filled: 467, gate: "D" },
];

export const TEAMS: TeamRow[] = [
  { team: "Chennai Super Kings", short: "CSK", played: 12, won: 9, lost: 3, nrr: 1.21, points: 18 },
  { team: "Mumbai Indians",       short: "MI",  played: 12, won: 8, lost: 4, nrr: 0.84, points: 16 },
  { team: "Royal Challengers",    short: "RCB", played: 12, won: 6, lost: 6, nrr: 0.12, points: 12 },
  { team: "Kolkata Knight Riders",short: "KKR", played: 12, won: 5, lost: 7, nrr: -0.32, points: 10 },
];

export const PLAYERS: Player[] = [
  { id: "p1", name: "M. S. Dhoni",    team: "CSK", role: "WK",
    attrs: { strike: 88, control: 95, power: 86, consistency: 92, fielding: 94 },
    phases: { powerplay: 62, middle: 71, death: 188 } },
  { id: "p2", name: "Ruturaj Gaikwad",team: "CSK", role: "BAT",
    attrs: { strike: 80, control: 90, power: 78, consistency: 88, fielding: 76 },
    phases: { powerplay: 142, middle: 128, death: 95 } },
  { id: "p3", name: "Rohit Sharma",   team: "MI",  role: "BAT",
    attrs: { strike: 82, control: 88, power: 84, consistency: 86, fielding: 74 },
    phases: { powerplay: 156, middle: 118, death: 102 } },
  { id: "p4", name: "Jasprit Bumrah", team: "MI",  role: "BOWL",
    attrs: { strike: 92, control: 96, power: 70, consistency: 95, fielding: 78 },
    phases: { powerplay: 6.1, middle: 7.8, death: 7.2 } },
];

export const SCHEDULE = [
  { id: "m1", date: "May 24", home: "CSK", away: "MI", venue: "Chepauk",  time: "19:30" },
  { id: "m2", date: "May 26", home: "RCB", away: "KKR", venue: "Chinnaswamy", time: "15:30" },
  { id: "m3", date: "May 28", home: "MI",  away: "RCB", venue: "Wankhede", time: "19:30" },
];

export const AGENT_REACTIONS = [
  "Powerplay control — CSK riding the cover drive.",
  "Bumrah marking his run. Crowd density rising at Gate D.",
  "FOUR! Drilled past mid-off — Raghavendra stand erupts.",
  "Director sync: gate flow nominal. Hold positions.",
  "Metro pulse: South corridor moderate. Reroute advisory ready.",
];
