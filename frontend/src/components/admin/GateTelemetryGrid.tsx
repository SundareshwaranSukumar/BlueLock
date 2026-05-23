import { useState } from "react";
import { useStadiumStore } from "@/state/useStadiumStore";
import type { Gate } from "@/domain/types";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";
import { telemetryService } from "@/services/telemetry";
import { toast } from "sonner";

export function GateTelemetryGrid() {
  const gates = useStadiumStore((s) => s.gates);
  const pushDirective = useStadiumStore((s) => s.pushDirective);
  const rerouteTicket = useStadiumStore((s) => s.rerouteTicketIfAffected);
  const [pending, setPending] = useState<string | null>(null);

  function pickDiversion(from: Gate): Gate {
    const target = gates.filter((g) => g.id !== from.id).sort((a, b) => a.load - b.load)[0];
    return target;
  }

  async function issueBypass(g: Gate) {
    const target = pickDiversion(g);
    const directiveText = `[DIRECTOR TO STAFF]: Overcrowding alert at Gate ${g.id}. Security teams, deploy physical dividers immediately and divert arrivals toward the ${target.corridor} corridor (Gate ${target.id}).`;
    setPending(g.id);
    try {
      const res = await apiClient.bypassRoute({
        congestedGateId: g.id,
        targetDiversionGateId: target.id,
        staffDirectiveText: directiveText,
      });
      pushDirective({
        id: `d-${Date.now()}`,
        timestamp: Date.now(),
        gate: g.id,
        text: directiveText,
        notifiedCount: res.clientsNotifiedCount,
      });
      telemetryService.applyBypass(g.id, target.id);
      rerouteTicket(g.id, target.id);
      toast.success(
        `Directive dispatched — ${res.clientsNotifiedCount.toLocaleString()} clients notified.`,
      );
    } catch (err) {
      toast.error("Bypass dispatch failed", { description: (err as Error).message });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {gates.map((g) => (
        <GateCard key={g.id} gate={g} pending={pending === g.id} onBypass={() => issueBypass(g)} />
      ))}
    </div>
  );
}

function GateCard({
  gate,
  pending,
  onBypass,
}: {
  gate: Gate;
  pending: boolean;
  onBypass: () => void;
}) {
  const critical = gate.status === "CRITICAL" || gate.load >= 80;
  const warn = gate.status === "WARNING";
  const color = critical ? "var(--color-crit)" : warn ? "var(--color-warn)" : "var(--color-ok)";
  const label = gate.status;

  return (
    <div className={cn("hex-frame rounded-md p-4 relative", critical && "animate-crit")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
            GATE {gate.id} · {gate.corridor.toUpperCase()}
          </p>
          <p className="font-display text-lg font-bold mt-0.5">{gate.name}</p>
        </div>
        <span
          className="font-hud text-[10px] tracking-[0.25em] px-2 py-1 rounded-sm"
          style={{ background: color, color: "var(--color-background)" }}
        >
          {label}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between font-hud">
          <span className="text-3xl font-bold" style={{ color }}>
            {Math.round(gate.load)}%
          </span>
          <span className="text-[10px] tracking-[0.25em] text-muted-foreground">
            FLOW {gate.flowRate}/min
          </span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${gate.load}%`, background: color, boxShadow: `0 0 10px ${color}` }}
          />
        </div>
      </div>

      {critical && (
        <button
          onClick={onBypass}
          disabled={pending}
          className="mt-4 w-full h-10 hex-frame rounded-sm font-hud text-[11px] tracking-[0.3em] glow-crit transition hover:brightness-125 disabled:opacity-60"
          style={{ color: "var(--color-crit)" }}
        >
          {pending ? "⋯ DISPATCHING…" : "⚡ ISSUE DIRECT BYPASS ORDER"}
        </button>
      )}
      {!critical && gate.bypassActive && (
        <p className="mt-4 font-hud text-[10px] tracking-[0.25em] text-ok">
          ✓ BYPASS DIRECTIVE ACTIVE · FLOW NORMALIZING
        </p>
      )}
    </div>
  );
}
