import { useMemo, useState } from "react";
import { useStadiumStore } from "@/state/useStadiumStore";
import { STANDS } from "@/domain/fixtures";
import { apiClient } from "@/services/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Seat, SeatTier } from "@/domain/types";

const TIER_COLOR: Record<SeatTier, string> = {
  PREMIUM: "var(--color-cyan)",
  GOLD: "var(--color-warn)",
  SILVER: "var(--color-muted-foreground)",
};
const TIER_LABEL: Record<SeatTier, string> = {
  PREMIUM: "Premium · Pitch-side",
  GOLD: "Gold · Best view",
  SILVER: "Silver · Standard",
};

interface Props {
  onBooked: () => void;
}

export function StadiumSeatMap({ onBooked }: Props) {
  const seats = useStadiumStore((s) => s.seats);
  const setTicket = useStadiumStore((s) => s.setTicket);
  const userName = useStadiumStore((s) => s.userName);
  const setUserName = useStadiumStore((s) => s.setUserName);
  const team = useStadiumStore((s) => s.selectedTeam);
  const setTeam = useStadiumStore((s) => s.setTeam);
  const [selected, setSelected] = useState<Seat | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const byStand = useMemo(() => {
    const m: Record<string, Seat[]> = {};
    for (const s of seats) (m[s.stand] ??= []).push(s);
    return m;
  }, [seats]);

  async function confirm() {
    if (!selected) return;
    if (!userName.trim()) {
      toast.error("Enter your name first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.bookTicket({
        userName: userName.trim(),
        gender: "Male",
        teamAllegiance: team,
        seatId: selected.id,
      });
      const standMeta = STANDS.find((s) => s.name === selected.stand)!;
      setTicket({
        ticketId: res.ticketId,
        seatId: selected.id,
        stand: selected.stand,
        tier: selected.tier,
        price: selected.price,
        assignedGate: res.assignedGate,
        entryCorridor: res.entryCorridor,
        metroLoad: res.metroLoad,
        recommendedRoute: res.recommendedRoute,
        nearestTransit: standMeta.transit,
        nearestParking: standMeta.parking,
      });
      toast.success(`Seat ${selected.id} confirmed`);
      onBooked();
    } catch (err) {
      toast.error("Booking failed", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Identity row */}
      <div className="hex-frame rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex-1 flex items-center gap-3">
          <span className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">FAN</span>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={80}
            placeholder="Your name"
            className="flex-1 bg-background/60 border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-cyan)]"
          />
        </label>
        <div className="hex-frame rounded-full inline-flex p-0.5">
          {(["CSK", "MI"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setTeam(o)}
              className="px-3 py-1.5 rounded-full font-hud text-[11px] tracking-[0.2em] transition"
              style={team === o ? { background: o === "CSK" ? "var(--color-csk)" : "var(--color-mi)", color: "var(--color-background)" } : undefined}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Stadium */}
      <div className="hex-frame rounded-md p-3 sm:p-5">
        <StadiumOval byStand={byStand} selected={selected} onSelect={setSelected} />
      </div>

      {/* Legend */}
      <div className="hex-frame rounded-md p-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-hud text-[10px] tracking-[0.25em]">
        {(Object.keys(TIER_COLOR) as SeatTier[]).map((t) => (
          <span key={t} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: TIER_COLOR[t] }} />
            <span>{TIER_LABEL[t].toUpperCase()}</span>
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[color:var(--color-crit)]/70" />
          <span>BOOKED</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm ring-2 ring-[color:var(--color-foreground)]" />
          <span>SELECTED</span>
        </span>
      </div>

      {/* Selection bar */}
      <div className="hex-frame rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-3 z-10">
        {selected ? (
          <>
            <div>
              <p className="font-hud text-[10px] tracking-[0.3em] text-cyan">SELECTED · {selected.stand.toUpperCase()} STAND</p>
              <p className="font-display text-xl font-bold mt-0.5">
                Seat {selected.id}
                <span className="text-muted-foreground text-sm font-normal ml-3">{TIER_LABEL[selected.tier]}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-hud text-2xl font-bold" style={{ color: TIER_COLOR[selected.tier] }}>
                ₹{selected.price.toLocaleString()}
              </p>
              <button
                onClick={confirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-sm font-hud text-[11px] tracking-[0.3em] bg-[color:var(--color-cyan)] text-background hover:brightness-110 transition disabled:opacity-60"
              >
                {submitting ? "BOOKING…" : "CONFIRM & BOOK"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Tap any seat to select. Premium pitch-side rows are highlighted.</p>
        )}
      </div>
    </div>
  );
}

/* ============= Oval stadium SVG with 4 curved seat stands ============= */

const W = 900;
const H = 760;
const CX = W / 2;
const CY = H / 2;

function StadiumOval({
  byStand, selected, onSelect,
}: {
  byStand: Record<string, Seat[]>;
  selected: Seat | null;
  onSelect: (s: Seat) => void;
}) {
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto block" style={{ maxHeight: "78vh" }}>

        {/* Outer field */}
        <ellipse cx={CX} cy={CY} rx={300} ry={230} fill="url(#turf)" stroke="var(--color-cyan)" strokeOpacity={0.25} strokeWidth={1.5} />
        <ellipse cx={CX} cy={CY} rx={290} ry={220} fill="none" stroke="var(--color-cyan)" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="4 6" />
        {/* Pitch */}
        <rect x={CX - 14} y={CY - 70} width={28} height={140} fill="oklch(0.65 0.05 80 / 0.45)" stroke="var(--color-warn)" strokeOpacity={0.4} />
        <circle cx={CX} cy={CY - 50} r={4} fill="var(--color-foreground)" opacity={0.6} />
        <circle cx={CX} cy={CY + 50} r={4} fill="var(--color-foreground)" opacity={0.6} />
        <circle cx={CX} cy={CY} r={28} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.2} />

        <defs>
          <radialGradient id="turf" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="oklch(0.38 0.13 145)" />
            <stop offset="100%" stopColor="oklch(0.22 0.08 145)" />
          </radialGradient>
        </defs>

        {/* Stand arcs + seats */}
        <StandArc stand="Pavilion"    side="N" seats={byStand["Pavilion"]    ?? []} selected={selected} onSelect={onSelect} />
        <StandArc stand="Raghavendra" side="S" seats={byStand["Raghavendra"] ?? []} selected={selected} onSelect={onSelect} />
        <StandArc stand="Metro"       side="E" seats={byStand["Metro"]       ?? []} selected={selected} onSelect={onSelect} />
        <StandArc stand="Garden"      side="W" seats={byStand["Garden"]      ?? []} selected={selected} onSelect={onSelect} />

        {/* Gate markers */}
        {STANDS.map((s) => {
          const sideKey = sideFromName(s.side);
          const p = sidePoint(sideKey, 0.5, 0);
          return (
            <g key={s.name}>
              <circle cx={p.x} cy={p.y} r={11} fill="var(--color-background)" stroke="var(--color-cyan)" strokeWidth={1.5} />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="10" fill="var(--color-cyan)" fontFamily="Orbitron, sans-serif">
                G{s.gateId}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type Side = "N" | "S" | "E" | "W";
function sideFromName(s: string): Side {
  const u = s.toUpperCase();
  return (u === "NORTH" ? "N" : u === "SOUTH" ? "S" : u === "EAST" ? "E" : "W");
}

/**
 * Lay out a stand as a curved bank of seats outside the field oval.
 * Rows are stacked outward; each row contains its seats arranged along the arc.
 */
function StandArc({
  stand, side, seats, selected, onSelect,
}: {
  stand: string;
  side: Side;
  seats: Seat[];
  selected: Seat | null;
  onSelect: (s: Seat) => void;
}) {
  if (!seats.length) return null;
  // group seats by row (preserving the tiered order: A,B,C,D,E,F,G,H,I)
  const rows: Record<string, Seat[]> = {};
  for (const s of seats) (rows[s.row] ??= []).push(s);
  const rowKeys = Object.keys(rows).sort();

  // base inner radius starts just outside field oval
  const baseRX = 310;
  const baseRY = 240;
  const rowGap = 14;
  const seatSize = 11;

  // arc span per side (radians)
  const spans: Record<Side, [number, number]> = {
    N: [-Math.PI * 0.85, -Math.PI * 0.15],
    S: [Math.PI * 0.15, Math.PI * 0.85],
    E: [-Math.PI * 0.35, Math.PI * 0.35],
    W: [Math.PI * 0.65, Math.PI * 1.35],
  };
  const [a0, a1] = spans[side];

  // stand label position
  const labelP = sidePoint(side, 0.5, rowKeys.length * rowGap + 28);

  return (
    <g>
      {rowKeys.map((rk, rowIdx) => {
        const rx = baseRX + rowIdx * rowGap;
        const ry = baseRY + rowIdx * rowGap;
        const rowSeats = rows[rk];
        return rowSeats.map((seat, i) => {
          const t = rowSeats.length === 1 ? 0.5 : i / (rowSeats.length - 1);
          const angle = a0 + (a1 - a0) * t;
          const x = CX + Math.cos(angle) * rx;
          const y = CY + Math.sin(angle) * ry;
          const isSel = selected?.id === seat.id;
          const fill = seat.occupied
            ? "oklch(0.55 0.22 27 / 0.55)"
            : TIER_COLOR[seat.tier];
          return (
            <g
              key={seat.id}
              style={{ cursor: seat.occupied ? "not-allowed" : "pointer" }}
              onClick={() => !seat.occupied && onSelect(seat)}
            >
              <rect
                x={x - seatSize / 2}
                y={y - seatSize / 2}
                width={seatSize}
                height={seatSize}
                rx={2}
                transform={`rotate(${(angle * 180) / Math.PI + 90} ${x} ${y})`}
                fill={fill}
                opacity={seat.occupied ? 0.7 : isSel ? 1 : 0.85}
                stroke={isSel ? "var(--color-foreground)" : "transparent"}
                strokeWidth={isSel ? 2 : 0}
              />
              <title>
                {seat.id} · {seat.stand} · {seat.tier} · {seat.occupied ? "Booked" : `₹${seat.price}`}
              </title>
            </g>
          );
        });
      })}
      <text
        x={labelP.x}
        y={labelP.y}
        textAnchor="middle"
        fontSize="12"
        fontFamily="Orbitron, sans-serif"
        fill="var(--color-cyan)"
        letterSpacing="3"
      >
        {stand.toUpperCase()} STAND
      </text>
    </g>
  );
}

function sidePoint(side: Side, t: number, outward: number) {
  const span: Record<Side, [number, number]> = {
    N: [-Math.PI * 0.85, -Math.PI * 0.15],
    S: [Math.PI * 0.15, Math.PI * 0.85],
    E: [-Math.PI * 0.35, Math.PI * 0.35],
    W: [Math.PI * 0.65, Math.PI * 1.35],
  };
  const [a0, a1] = span[side];
  const a = a0 + (a1 - a0) * t;
  const rx = 310 + outward;
  const ry = 240 + outward;
  return { x: CX + Math.cos(a) * rx, y: CY + Math.sin(a) * ry };
}
