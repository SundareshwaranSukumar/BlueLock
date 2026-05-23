import { useStadiumStore } from "@/state/useStadiumStore";
import { STANDS, VENUE_LABEL } from "@/domain/fixtures";
import { GateTelemetryGrid } from "./GateTelemetryGrid";
import { DirectorRadio } from "./DirectorRadio";
import { IntelLogConsole } from "./IntelLogConsole";
import { TransitFeedPanel } from "./TransitFeedPanel";

/**
 * Admin command surface: heatmap, parking, logistics, gate telemetry.
 */
export function AdminDashboard() {
  const gates = useStadiumStore((s) => s.gates);
  const match = useStadiumStore((s) => s.match);
  const parkingLots = useStadiumStore((s) => s.parkingLots);

  const totalCapacity = gates.reduce((a, g) => a + g.capacity, 0);
  const totalLoad = gates.reduce((a, g) => a + g.load, 0);
  const stadiumFill = Math.round((totalLoad / totalCapacity) * 100);
  const totalFlow = gates.reduce((a, g) => a + g.flowRate, 0);
  const critCount = gates.filter((g) => g.status === "CRITICAL").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="font-hud text-[11px] tracking-[0.4em] text-cyan">
            // CONTROL ROOM · CLEARANCE Δ-1
          </p>
          <h2 className="font-display text-3xl font-bold mt-1">Ekana Director Matrix</h2>
          <p className="text-muted-foreground text-sm">{VENUE_LABEL}</p>
        </div>
        <p className="text-muted-foreground text-sm font-hud">{new Date().toLocaleString()}</p>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label="STADIUM FILL"
          value={`${stadiumFill}%`}
          accent="var(--color-cyan)"
          sub={`${totalLoad}/${totalCapacity} cap units`}
        />
        <Kpi
          label="INFLOW RATE"
          value={`${totalFlow}/min`}
          accent="var(--color-ok)"
          sub="Aggregate of all gates"
        />
        <Kpi
          label="CRITICAL GATES"
          value={String(critCount)}
          accent={critCount ? "var(--color-crit)" : "var(--color-ok)"}
          sub={critCount ? "Bypass required" : "All within bounds"}
        />
        <Kpi
          label="SCORE"
          value={`${match.runs}/${match.wickets}`}
          accent="var(--color-warn)"
          sub={`${match.overs} ov · WP ${match.winProbability}`}
        />
      </div>

      {/* Heatmap + Parking row */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <CrowdHeatmap />
        <ParkingPanel lots={parkingLots} />
      </div>

      <TransitFeedPanel />

      {/* Gate telemetry */}
      <div className="grid lg:grid-cols-[1.2fr_1fr_1fr] gap-5">
        <div className="space-y-3">
          <h3 className="font-hud text-xs tracking-[0.3em] text-cyan">// GATE TELEMETRY A–D</h3>
          <GateTelemetryGrid />
        </div>
        <div className="space-y-3">
          <h3 className="font-hud text-xs tracking-[0.3em] text-cyan">// DIRECTOR RADIO</h3>
          <DirectorRadio />
        </div>
        <IntelLogConsole />
      </div>
    </div>
  );
}

/* ============ KPI ============ */
function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="hex-frame rounded-md p-4">
      <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-bold mt-1" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-muted-foreground text-xs mt-1">{sub}</p>
    </div>
  );
}

/* ============ Heatmap ============ */
function CrowdHeatmap() {
  const gates = useStadiumStore((s) => s.gates);
  // 12x8 grid; intensity peaks near gate corridors
  const COLS = 18,
    ROWS = 12;
  const sources = [
    { x: COLS / 2, y: 1.5, gate: gates.find((g) => g.id === "B")! }, // N
    { x: COLS / 2, y: ROWS - 1.5, gate: gates.find((g) => g.id === "A")! }, // S
    { x: COLS - 1.5, y: ROWS / 2, gate: gates.find((g) => g.id === "D")! }, // E
    { x: 1.5, y: ROWS / 2, gate: gates.find((g) => g.id === "C")! }, // W
  ];

  function intensity(cx: number, cy: number) {
    let v = 0;
    for (const s of sources) {
      const d = Math.hypot(cx - s.x, cy - s.y);
      v += (s.gate.load / 100) * Math.max(0, 1 - d / 7);
    }
    return Math.min(1, v);
  }

  return (
    <div className="hex-frame rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-hud text-xs tracking-[0.3em] text-cyan">// CROWD HEATMAP · LIVE</h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            Aggregate fan density across concourses
          </p>
        </div>
        <div className="flex items-center gap-2 font-hud text-[9px] tracking-[0.25em]">
          <span>LOW</span>
          <span
            className="w-24 h-2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg,var(--color-ok),var(--color-warn),var(--color-crit))",
            }}
          />
          <span>HIGH</span>
        </div>
      </div>
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const v = intensity(c + 0.5, r + 0.5);
          const hue = 145 - v * 120; // green->red
          return (
            <div
              key={i}
              className="aspect-square rounded-[1px] transition-colors"
              style={{
                background: `oklch(${0.35 + v * 0.3} ${0.13 + v * 0.1} ${hue} / ${0.25 + v * 0.75})`,
              }}
              title={`Density ${(v * 100).toFixed(0)}%`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {STANDS.map((s) => {
          const g = gates.find((x) => x.id === s.gateId)!;
          return (
            <div key={s.name} className="text-center">
              <p className="font-hud text-[9px] tracking-[0.25em] text-muted-foreground">
                {s.name.toUpperCase()}
              </p>
              <p
                className="font-hud text-sm font-bold"
                style={{
                  color:
                    g.status === "CRITICAL"
                      ? "var(--color-crit)"
                      : g.status === "WARNING"
                        ? "var(--color-warn)"
                        : "var(--color-ok)",
                }}
              >
                {Math.round(g.load)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Parking ============ */
function ParkingPanel({ lots }: { lots: (typeof import("@/domain/types").ParkingLot)[] }) {
  const totalCap = lots.reduce((a, p) => a + p.capacity, 0);
  const totalFilled = lots.reduce((a, p) => a + p.filled, 0);
  const free = totalCap - totalFilled;

  return (
    <div className="hex-frame rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-hud text-xs tracking-[0.3em] text-cyan">// PARKING GRID</h3>
        <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
          {free.toLocaleString()} SPACES FREE
        </p>
      </div>

      <div className="space-y-2">
        {lots.map((p) => {
          const pct = Math.round((p.filled / p.capacity) * 100);
          const color =
            pct >= 90 ? "var(--color-crit)" : pct >= 70 ? "var(--color-warn)" : "var(--color-ok)";
          return (
            <div key={p.id} className="hex-frame rounded-sm p-3">
              <div className="flex items-center justify-between font-display">
                <span className="font-semibold">
                  {p.id} · {p.name}
                </span>
                <span className="font-hud text-xs" style={{ color }}>
                  {p.capacity - p.filled} FREE
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
                />
              </div>
              <div className="flex justify-between font-hud text-[10px] tracking-[0.25em] text-muted-foreground mt-1.5">
                <span>FEEDS GATE {p.gate}</span>
                <span>
                  {p.filled}/{p.capacity} · {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
