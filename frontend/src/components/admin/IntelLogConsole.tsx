import { useEffect, useState } from "react";
import { apiClient } from "@/services/api";
import { useStadiumStore } from "@/state/useStadiumStore";

export function IntelLogConsole() {
  const agentReaction = useStadiumStore((s) => s.agentReaction);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const snap = await apiClient.stadiumSnapshot();
        const logs = (snap.intel_log as string[] | undefined) ?? [];
        if (logs.length) setLines(logs);
      } catch {
        setLines((prev) => [agentReaction, ...prev].slice(0, 30));
      }
    }, 4000);
    return () => clearInterval(id);
  }, [agentReaction]);

  const display = lines.length ? lines : [agentReaction];

  return (
    <div className="hex-frame rounded-md p-4 h-64 flex flex-col">
      <h3 className="font-hud text-xs tracking-[0.3em] text-cyan mb-2">
        // GEMINI INTEL · SCROLL LOG
      </h3>
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 text-muted-foreground">
        {display.map((line, i) => (
          <p key={`${i}-${line.slice(0, 12)}`} className={i === 0 ? "text-cyan" : undefined}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
