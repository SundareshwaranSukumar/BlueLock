import { useStadiumStore } from "@/state/useStadiumStore";
import { useMemo } from "react";

export function DirectorHUD() {
  const gates = useStadiumStore((s) => s.gates);
  const seats = useStadiumStore((s) => s.seats);

  const stats = useMemo(() => {
    const totalLoad = gates.reduce((a, g) => a + g.load, 0) / gates.length;
    const occupied = seats.filter((s) => s.occupied).length;
    const live = Math.round(totalLoad * 380 + occupied * 4);
    return {
      intake: Math.round(seats.length * 0.72),
      scans: Math.round(totalLoad * 42),
      live,
      avgLoad: Math.round(totalLoad),
    };
  }, [gates, seats]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <HUD label="BOOKING INTAKE" value={stats.intake.toLocaleString()} sub="last 6h" />
      <HUD label="SCAN TELEMETRY" value={`${stats.scans}/min`} sub="all gates" tone="cyan" />
      <HUD label="LIVE OCCUPANCY" value={stats.live.toLocaleString()} sub="real-time" />
      <HUD label="AVG GATE LOAD" value={`${stats.avgLoad}%`} sub="rolling 30s"
        tone={stats.avgLoad >= 75 ? "crit" : stats.avgLoad >= 60 ? "warn" : "ok"} />
    </div>
  );
}

function HUD({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "cyan" | "crit" | "warn" | "ok" }) {
  const color = tone === "crit" ? "var(--color-crit)" : tone === "warn" ? "var(--color-warn)" : tone === "ok" ? "var(--color-ok)" : tone === "cyan" ? "var(--color-cyan)" : undefined;
  return (
    <div className="hex-frame rounded-md p-4 relative overflow-hidden">
      <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="font-hud text-3xl font-bold mt-2" style={color ? { color } : undefined}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
