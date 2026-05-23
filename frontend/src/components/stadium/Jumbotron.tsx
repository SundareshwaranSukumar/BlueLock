import { useStadiumStore } from "@/state/useStadiumStore";
import { AGENT_REACTIONS } from "@/domain/fixtures";
import { useMemo } from "react";

export function Jumbotron() {
  const match = useStadiumStore((s) => s.match);
  const directives = useStadiumStore((s) => s.directives);
  const agentReaction = useStadiumStore((s) => s.agentReaction);

  const reel = useMemo(() => {
    const dyn = directives.slice(0, 2).map((d) => `★ ${d.text}`);
    return [`▶ ${agentReaction}`, ...dyn, ...AGENT_REACTIONS].join("   //   ");
  }, [directives, agentReaction]);

  return (
    <div className="hex-frame rounded-md overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border">
        <Cell label="CSK" value={`${match.runs}/${match.wickets}`} hud accent="csk" />
        <Cell label="OVERS" value={match.overs} hud />
        <Cell label="RR" value={(match.runs / Math.max(1, parseFloat(match.overs))).toFixed(2)} hud />
        <Cell label="WIN PROB" value={match.winProbability} hud />
        <Cell label="MI" value="BOWLING" hud accent="mi" />
      </div>
      <div className="relative overflow-hidden bg-background/80 border-t border-border">
        <div className="whitespace-nowrap font-hud text-xs tracking-[0.2em] py-2 animate-marquee gpu">
          <span className="px-6 text-cyan">{reel}</span>
          <span className="px-6 text-cyan">{reel}</span>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, hud, accent }: { label: string; value: string; hud?: boolean; accent?: "csk" | "mi" }) {
  const color = accent === "csk" ? "var(--color-csk)" : accent === "mi" ? "var(--color-mi)" : undefined;
  return (
    <div className="bg-card/80 px-4 py-3">
      <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className={hud ? "font-hud text-2xl font-bold mt-0.5" : "mt-0.5"} style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}
