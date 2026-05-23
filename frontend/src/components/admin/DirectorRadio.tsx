import { useStadiumStore } from "@/state/useStadiumStore";
import { useEffect, useRef } from "react";

export function DirectorRadio() {
  const directives = useStadiumStore((s) => s.directives);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [directives.length]);

  return (
    <div className="hex-frame rounded-md p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="font-hud text-xs tracking-[0.3em] text-cyan">// DIRECTOR RADIO · OPS TERMINAL</p>
        <span className="flex items-center gap-1.5 font-hud text-[10px] tracking-[0.25em] text-ok">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-ok)] animate-pulse" /> LIVE
        </span>
      </div>
      <div ref={ref} className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto bg-background/60 border border-border rounded-sm p-3 font-mono text-xs space-y-2">
        {directives.length === 0 && (
          <p className="text-muted-foreground">// Awaiting directive. Trigger a Bypass Order from any critical gate.</p>
        )}
        {directives.map((d) => (
          <div key={d.id} className="border-l-2 pl-3" style={{ borderColor: "var(--color-cyan)" }}>
            <p className="text-[10px] text-muted-foreground font-hud tracking-[0.2em]">
              {new Date(d.timestamp).toLocaleTimeString()} · GATE {d.gate}
            </p>
            <p className="text-cyan mt-0.5">{d.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 font-hud text-[9px] tracking-[0.25em] text-muted-foreground">
        Directives propagate instantly to fan tickets and reroute entry corridors.
      </p>
    </div>
  );
}
