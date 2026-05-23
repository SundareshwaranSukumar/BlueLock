import { useStadiumStore } from "@/state/useStadiumStore";
import { useEffect, useState } from "react";

const CSK_LINES = [
  "Whistle podu! That cover drive was clinical.",
  "Dhoni reading the field — pure cold calculation.",
  "Gate A is clear, take the inner concourse on the way out.",
];
const MI_LINES = [
  "Bumrah's wrist position — unreal.",
  "If we get a wicket here, the powerplay flips.",
  "Director just rerouted Gate D crowd. Smart call.",
];

function useRotating(lines: string[], interval = 5200) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), interval);
    return () => clearInterval(t);
  }, [lines, interval]);
  return lines[i];
}

export function Companions() {
  const team = useStadiumStore((s) => s.selectedTeam);
  const setTeam = useStadiumStore((s) => s.setTeam);
  const cskLine = useRotating(CSK_LINES);
  const miLine = useRotating(MI_LINES, 6100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-hud text-xs tracking-[0.3em] text-cyan">// COMPANION NODE</h3>
        <div className="hex-frame rounded-full p-0.5 flex text-[10px] font-hud tracking-[0.2em]">
          {(["CSK", "MI"] as const).map((t) => (
            <button key={t} onClick={() => setTeam(t)}
              className="px-3 py-1 rounded-full transition"
              style={team === t
                ? { background: t === "CSK" ? "var(--color-csk)" : "var(--color-mi)", color: "var(--color-background)" }
                : undefined}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Companion name="Aarav" team="CSK" line={cskLine} />
      <Companion name="Ishita" team="MI" line={miLine} />
    </div>
  );
}

function Companion({ name, team, line }: { name: string; team: "CSK" | "MI"; line: string }) {
  const color = team === "CSK" ? "var(--color-csk)" : "var(--color-mi)";
  return (
    <div className="flex items-start gap-3">
      <div className="relative w-12 h-12 shrink-0 hex-clip flex items-center justify-center font-hud text-sm font-bold"
        style={{ background: color, color: "var(--color-background)" }}>
        {name[0]}
      </div>
      <div className="hex-frame rounded-md px-3 py-2 flex-1 relative">
        <p className="font-hud text-[10px] tracking-[0.25em]" style={{ color }}>{name.toUpperCase()} · {team}</p>
        <p className="text-sm mt-0.5">{line}</p>
      </div>
    </div>
  );
}
