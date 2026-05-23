import type { Gate, ParkingLot, Player, Seat, SeatTier, TeamRow } from "./types";

/** Today's anchor fixture — LSG vs PBKS at Ekana */
export const MATCH_HOME = "LSG" as const;
export const MATCH_AWAY = "PBKS" as const;
export const VENUE_LABEL = "Ekana Cricket Stadium · Lucknow";

export const INITIAL_GATES: Gate[] = [
  {
    id: "A",
    name: "Gate A — North Block",
    load: 42,
    flowRate: 90,
    status: "NORMAL",
    capacity: 100,
    corridor: "North",
    bypassActive: false,
  },
  {
    id: "B",
    name: "Gate B — South Block",
    load: 58,
    flowRate: 70,
    status: "WARNING",
    capacity: 100,
    corridor: "South",
    bypassActive: false,
  },
  {
    id: "C",
    name: "Gate C — East Lounge",
    load: 28,
    flowRate: 30,
    status: "NORMAL",
    capacity: 100,
    corridor: "East",
    bypassActive: false,
  },
  {
    id: "D",
    name: "Gate D — West Terrace",
    load: 71,
    flowRate: 110,
    status: "WARNING",
    capacity: 100,
    corridor: "West",
    bypassActive: false,
  },
];

export const EKANA_STANDS = ["North Block", "South Block", "East Lounge", "West Terrace"] as const;

export const STANDS = [
  {
    name: "North Block",
    side: "north",
    gateId: "A" as const,
    transit: "Metro Red · Ekana North (350m)",
    parking: "P-N — North Lot",
  },
  {
    name: "South Block",
    side: "south",
    gateId: "B" as const,
    transit: "Metro Red · Ekana South (420m)",
    parking: "P-S — South Lot",
  },
  {
    name: "East Lounge",
    side: "east",
    gateId: "C" as const,
    transit: "Bus Hub · Gomti Nagar (480m)",
    parking: "P-E — East Lot",
  },
  {
    name: "West Terrace",
    side: "west",
    gateId: "D" as const,
    transit: "Ride Pool · West Plaza (290m)",
    parking: "P-W — West Lot",
  },
];

const ROWS_FOR_TIER: Record<SeatTier, string[]> = {
  PREMIUM: ["A", "B"],
  GOLD: ["C", "D", "E"],
  SILVER: ["F", "G", "H"],
};
const PRICE_FOR_TIER: Record<SeatTier, number> = { PREMIUM: 8500, GOLD: 4500, SILVER: 1800 };

/** Fallback matrix when seat API unavailable */
export function buildSeatMatrix(): Seat[] {
  const seats: Seat[] = [];
  const prefix: Record<string, string> = {
    "North Block": "N",
    "South Block": "S",
    "East Lounge": "E",
    "West Terrace": "W",
  };
  for (const stand of STANDS) {
    const pfx = prefix[stand.name] ?? "N";
    let n = 0;
    (Object.keys(ROWS_FOR_TIER) as SeatTier[]).forEach((tier) => {
      for (const r of ROWS_FOR_TIER[tier]) {
        for (let c = 1; c <= 8; c++) {
          n += 1;
          if (n > 30) return;
          seats.push({
            id: `${pfx}-${String(n).padStart(2, "0")}`,
            row: r,
            col: c,
            stand: stand.name,
            occupied: false,
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
  { id: "P-N", name: "North Lot", capacity: 400, filled: 280, gate: "A" },
  { id: "P-S", name: "South Lot", capacity: 350, filled: 190, gate: "B" },
  { id: "P-E", name: "East Lot", capacity: 300, filled: 120, gate: "C" },
  { id: "P-W", name: "West Lot", capacity: 420, filled: 360, gate: "D" },
];

export const TEAMS: TeamRow[] = [
  {
    team: "Lucknow Super Giants",
    short: "LSG",
    played: 12,
    won: 7,
    lost: 5,
    nrr: 0.42,
    points: 14,
  },
  { team: "Punjab Kings", short: "PBKS", played: 12, won: 6, lost: 6, nrr: -0.08, points: 12 },
  { team: "Chennai Super Kings", short: "CSK", played: 12, won: 9, lost: 3, nrr: 1.21, points: 18 },
  { team: "Mumbai Indians", short: "MI", played: 12, won: 8, lost: 4, nrr: 0.84, points: 16 },
];

export const PLAYERS: Player[] = [
  {
    id: "p1",
    name: "Nicholas Pooran",
    team: "LSG",
    role: "WK",
    attrs: { strike: 88, control: 90, power: 92, consistency: 85, fielding: 80 },
    phases: { powerplay: 145, middle: 128, death: 165 },
  },
  {
    id: "p2",
    name: "Rishabh Pant",
    team: "LSG",
    role: "WK",
    attrs: { strike: 86, control: 88, power: 90, consistency: 82, fielding: 78 },
    phases: { powerplay: 138, middle: 122, death: 158 },
  },
  {
    id: "p3",
    name: "Shreyas Iyer",
    team: "PBKS",
    role: "BAT",
    attrs: { strike: 82, control: 88, power: 84, consistency: 86, fielding: 74 },
    phases: { powerplay: 132, middle: 118, death: 102 },
  },
  {
    id: "p4",
    name: "Arshdeep Singh",
    team: "PBKS",
    role: "BOWL",
    attrs: { strike: 90, control: 92, power: 72, consistency: 88, fielding: 76 },
    phases: { powerplay: 7.2, middle: 8.1, death: 9.4 },
  },
];

export const SCHEDULE = [
  { id: "m0", date: "May 23", home: "LSG", away: "PBKS", venue: "Ekana", time: "19:30" },
  { id: "m1", date: "May 26", home: "CSK", away: "MI", venue: "Chepauk", time: "19:30" },
  { id: "m2", date: "May 28", home: "RCB", away: "KKR", venue: "Chinnaswamy", time: "15:30" },
];

export const AGENT_REACTIONS = [
  "Powerplay — LSG building momentum at Ekana.",
  "Arshdeep marking his run. Gate D density rising.",
  "FOUR! Driven through extra cover — North Block erupts.",
  "Director sync: gate flow nominal across Ekana concourses.",
  "Metro pulse: South corridor moderate. Reroute advisory ready.",
];
