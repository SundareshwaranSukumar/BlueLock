import type { Player } from "@/domain/types";

export function RadarChart({ player }: { player: Player }) {
  const attrs = Object.entries(player.attrs);
  const N = attrs.length;
  const cx = 140, cy = 140, R = 110;
  const point = (i: number, v: number) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = (v / 100) * R;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const poly = attrs.map(([, v], i) => point(i, v).join(",")).join(" ");

  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-xs">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f}
          points={attrs.map((_, i) => {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            return `${cx + Math.cos(a) * R * f},${cy + Math.sin(a) * R * f}`;
          }).join(" ")}
          fill="none" stroke="oklch(0.85 0.18 220 / 0.15)" strokeWidth="1" />
      ))}
      {attrs.map(([k], i) => {
        const [x, y] = point(i, 110);
        return (
          <g key={k}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="oklch(0.85 0.18 220 / 0.15)" />
            <text x={x} y={y} textAnchor="middle" dy={i === 0 ? -8 : 14}
              style={{ fontFamily: "Orbitron", fontSize: 9, letterSpacing: 2 }}
              className="fill-muted-foreground">{k.toUpperCase()}</text>
          </g>
        );
      })}
      <polygon points={poly} fill="oklch(0.88 0.18 215 / 0.25)" stroke="oklch(0.88 0.18 215)" strokeWidth="2" />
      {attrs.map(([k, v], i) => {
        const [x, y] = point(i, v);
        return <circle key={k} cx={x} cy={y} r="3" fill="oklch(0.88 0.18 215)" />;
      })}
    </svg>
  );
}
