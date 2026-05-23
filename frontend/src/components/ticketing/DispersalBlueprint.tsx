import { HexFrame, HexIcon } from "@/components/branding/HexFrame";
import { useStadiumStore } from "@/state/useStadiumStore";

export function DispersalBlueprint() {
  const ticket = useStadiumStore((s) => s.ticket);
  const gates = useStadiumStore((s) => s.gates);
  const setView = useStadiumStore((s) => s.setView);

  if (!ticket) {
    return (
      <div className="hex-frame rounded-md p-6 text-center text-muted-foreground text-sm">
        Select a glowing seat to generate your Dispersal Blueprint.
      </div>
    );
  }

  const gate = gates.find((g) => g.id === ticket.assignedGate)!;
  const metroTone = ticket.metroLoad === "crit" ? "text-crit" : ticket.metroLoad === "warn" ? "text-warn" : "text-ok";

  return (
    <div className="space-y-4">
      <HexFrame tone="cyan" className="p-[2px]">
        <div className="bg-card/90 p-5 rounded-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-hud text-[10px] tracking-[0.3em] text-cyan">// DISPERSAL BLUEPRINT</p>
              <h3 className="font-display text-2xl font-bold mt-1">Seat {ticket.seatId}</h3>
              <p className="text-muted-foreground text-sm">{ticket.stand} · LSG vs PBKS · Ekana 19:30</p>
            </div>
            <HexIcon size={48} className="text-cyan" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <Stat label="ENTRY CORRIDOR" value={ticket.entryCorridor} />
            <Stat label="ASSIGNED GATE" value={`${gate.id}`} sub={`${Math.round(gate.load)}% load`} />
            <Stat label="METRO PULSE" value={ticket.metroLoad.toUpperCase()} valueClass={metroTone} />
          </div>

          <div className="mt-4 hex-frame rounded-sm p-3 space-y-1">
            <p className="font-hud text-[9px] tracking-[0.25em] text-muted-foreground">RECOMMENDED ROUTE</p>
            <p className="text-sm">{ticket.recommendedRoute}</p>
            <p className="text-[11px] text-cyan mt-1">{ticket.nearestTransit}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 font-hud text-[10px] tracking-[0.2em]">
            <Tag>QR · {ticket.ticketId}</Tag>
            <Tag>BIO-AUTH READY</Tag>
            <Tag>NAMMA METRO SYNC</Tag>
          </div>
        </div>
      </HexFrame>

      <button
        onClick={() => setView(3)}
        className="w-full h-14 rounded-full hex-frame glow-cyan font-hud text-xs tracking-[0.3em] flex items-center justify-center gap-3"
      >
        <PitchIcon /> GO LIVE: {ticket.stand.toUpperCase()} STAND →
      </button>
    </div>
  );
}

function Stat({ label, value, sub, valueClass = "" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="hex-frame rounded-sm p-3">
      <p className="font-hud text-[9px] tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold mt-1 ${valueClass}`}>{value}</p>
      {sub && <p className="font-hud text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="border border-border px-2 py-1 rounded-sm text-muted-foreground">{children}</span>;
}
function PitchIcon() {
  return (
    <svg width="22" height="14" viewBox="0 0 40 24">
      <polygon points="6,12 20,2 34,12 20,22" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
