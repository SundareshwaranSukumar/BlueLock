import { useStadiumStore } from "@/state/useStadiumStore";
import type { Gate } from "@/domain/types";

function statusColor(load: number) {
  if (load >= 80) return "var(--color-crit)";
  if (load >= 60) return "var(--color-warn)";
  return "var(--color-ok)";
}

export function IsoStadium() {
  const gates = useStadiumStore((s) => s.gates);
  const ticket = useStadiumStore((s) => s.ticket);

  const gateMap: Record<string, Gate> = Object.fromEntries(gates.map((g) => [g.id, g]));

  return (
    <div className="relative w-full aspect-[16/10] hex-frame rounded-md overflow-hidden gpu">
      <div className="absolute inset-0 scanline" />
      <svg viewBox="0 0 800 500" className="w-full h-full">
        <defs>
          <radialGradient id="pitch" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="oklch(0.45 0.15 145)" />
            <stop offset="100%" stopColor="oklch(0.3 0.1 145)" />
          </radialGradient>
          <linearGradient id="stand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.25 0.06 260)" />
            <stop offset="100%" stopColor="oklch(0.15 0.05 260)" />
          </linearGradient>
        </defs>

        {/* Outer ring */}
        <ellipse cx="400" cy="260" rx="360" ry="200" fill="url(#stand)" stroke="oklch(0.85 0.18 220 / 0.3)" strokeWidth="1" />
        <ellipse cx="400" cy="260" rx="300" ry="160" fill="oklch(0.18 0.05 260)" stroke="oklch(0.85 0.18 220 / 0.2)" />

        {/* Sectors */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const x1 = 400 + Math.cos(a) * 300;
          const y1 = 260 + Math.sin(a) * 160;
          const x2 = 400 + Math.cos(a) * 360;
          const y2 = 260 + Math.sin(a) * 200;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.85 0.18 220 / 0.25)" strokeWidth="1" />;
        })}

        {/* Pitch */}
        <ellipse cx="400" cy="260" rx="240" ry="120" fill="url(#pitch)" />
        <rect x="370" y="240" width="60" height="40" fill="oklch(0.85 0.7 90 / 0.18)" stroke="oklch(0.98 0.005 240)" strokeOpacity="0.4" />
        <circle cx="400" cy="260" r="6" fill="oklch(0.98 0.005 240)" opacity="0.6" />

        {/* Stand labels */}
        <text x="400" y="55"  textAnchor="middle" className="fill-foreground" style={{ fontFamily: "Orbitron", fontSize: 11, letterSpacing: 3 }}>NORTH BLOCK</text>
        <text x="770" y="265" textAnchor="end"    className="fill-foreground" style={{ fontFamily: "Orbitron", fontSize: 11, letterSpacing: 3 }}>EAST LOUNGE</text>
        <text x="400" y="475" textAnchor="middle" className="fill-foreground" style={{ fontFamily: "Orbitron", fontSize: 11, letterSpacing: 3 }}>SOUTH BLOCK</text>
        <text x="30"  y="265"                       className="fill-foreground" style={{ fontFamily: "Orbitron", fontSize: 11, letterSpacing: 3 }}>WEST TERRACE</text>

        {/* Gate halos */}
        <GateHalo gate={gateMap.A} cx={400} cy={60}  />
        <GateHalo gate={gateMap.B} cx={740} cy={260} />
        <GateHalo gate={gateMap.C} cx={60}  cy={260} />
        <GateHalo gate={gateMap.D} cx={400} cy={460} />

        {/* User node */}
        {ticket && <UserNode />}
      </svg>

      {ticket && (
        <div className="absolute top-3 left-3 hex-frame rounded-sm px-3 py-1.5 font-hud text-[10px] tracking-[0.2em] text-cyan">
          YOU · {ticket.stand.toUpperCase()} · GATE {ticket.assignedGate}
        </div>
      )}
    </div>
  );
}

function GateHalo({ gate, cx, cy }: { gate: Gate; cx: number; cy: number }) {
  const c = statusColor(gate.load);
  return (
    <g>
      <circle cx={cx} cy={cy} r="22" fill={c} opacity="0.18">
        <animate attributeName="r" values="22;28;22" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <polygon
        points={hexPoints(cx, cy, 14)}
        fill={c}
        stroke="oklch(0.98 0.005 240)"
        strokeWidth="1"
      />
      <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontFamily: "Orbitron", fontSize: 11, fontWeight: 700 }} fill="oklch(0.13 0.04 260)">{gate.id}</text>
    </g>
  );
}
function hexPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}
function UserNode() {
  return (
    <g>
      <circle cx="400" cy="120" r="14" fill="oklch(0.88 0.18 215)" opacity="0.3">
        <animate attributeName="r" values="14;22;14" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="400" cy="120" r="5" fill="oklch(0.88 0.18 215)" />
    </g>
  );
}
