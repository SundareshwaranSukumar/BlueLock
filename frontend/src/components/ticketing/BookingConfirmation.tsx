import { useStadiumStore } from "@/state/useStadiumStore";

interface Props {
  onBookAnother: () => void;
}

export function BookingConfirmation({ onBookAnother }: Props) {
  const ticket = useStadiumStore((s) => s.ticket);
  const userName = useStadiumStore((s) => s.userName);
  const team = useStadiumStore((s) => s.selectedTeam);
  const clearTicket = useStadiumStore((s) => s.clearTicket);
  if (!ticket) return null;

  const loadColor =
    ticket.metroLoad === "crit"
      ? "var(--color-crit)"
      : ticket.metroLoad === "warn"
        ? "var(--color-warn)"
        : "var(--color-ok)";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <header className="text-center space-y-2">
        <p className="font-hud text-[11px] tracking-[0.4em] text-cyan">// BOOKING CONFIRMED</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold">
          You're in, {userName || "Fan"}.
        </h2>
        <p className="text-muted-foreground text-sm">
          CSK vs MI · M. Chinnaswamy Stadium · Tonight 19:30
        </p>
      </header>

      {/* Ticket card */}
      <div className="hex-frame rounded-md overflow-hidden glow-cyan">
        <div className="flex flex-col sm:flex-row">
          <div className="flex-1 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
                  TICKET ID
                </p>
                <p className="font-display text-lg font-bold">{ticket.ticketId}</p>
              </div>
              <span
                className="font-hud text-[10px] tracking-[0.3em] px-2.5 py-1 rounded-sm"
                style={{
                  background: team === "CSK" ? "var(--color-csk)" : "var(--color-mi)",
                  color: "var(--color-background)",
                }}
              >
                {team} SUPPORTER
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Cell label="SEAT" value={ticket.seatId} accent />
              <Cell label="STAND" value={ticket.stand} />
              <Cell label="TIER" value={ticket.tier} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Cell label="GATE" value={`Gate ${ticket.assignedGate}`} accent />
              <Cell label="CORRIDOR" value={`${ticket.entryCorridor} entry`} />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {ticket.recommendedRoute}
            </p>
          </div>

          <div className="sm:w-56 bg-card/70 border-l border-border p-5 flex flex-col items-center justify-center gap-3">
            <div className="hex-frame rounded-sm w-32 h-32 flex items-center justify-center">
              <div className="grid grid-cols-8 gap-[2px]">
                {Array.from({ length: 64 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-2 h-2"
                    style={{ background: (i * 37) % 3 ? "var(--color-foreground)" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
              SCAN AT GATE
            </p>
            <p className="font-hud text-2xl font-bold">₹{ticket.price.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Travel details */}
      <div className="grid sm:grid-cols-3 gap-3">
        <InfoCard
          title="Nearest Station"
          line1={ticket.nearestTransit}
          tag="METRO"
          tagColor={loadColor}
          hint={`Metro pulse: ${ticket.metroLoad.toUpperCase()}`}
        />
        <InfoCard
          title="Nearest Parking"
          line1={ticket.nearestParking}
          tag="PARK"
          tagColor="var(--color-cyan)"
          hint="Pre-book recommended · 2hr buffer"
        />
        <InfoCard
          title="Entry Gate"
          line1={`Gate ${ticket.assignedGate} · ${ticket.entryCorridor} side`}
          tag="GATE"
          tagColor="var(--color-warn)"
          hint="Doors open T-90 minutes"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => {
            clearTicket();
            onBookAnother();
          }}
          className="px-5 py-2.5 rounded-sm font-hud text-[11px] tracking-[0.3em] hex-frame hover:glow-cyan transition"
        >
          BOOK ANOTHER SEAT
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-sm font-hud text-[11px] tracking-[0.3em] bg-[color:var(--color-cyan)] text-background hover:brightness-110 transition"
        >
          DOWNLOAD TICKET
        </button>
      </div>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="hex-frame rounded-sm p-3">
      <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold mt-1 ${accent ? "text-cyan" : ""}`}>{value}</p>
    </div>
  );
}
function InfoCard({
  title,
  line1,
  tag,
  tagColor,
  hint,
}: {
  title: string;
  line1: string;
  tag: string;
  tagColor: string;
  hint: string;
}) {
  return (
    <div className="hex-frame rounded-md p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
          {title.toUpperCase()}
        </p>
        <span
          className="font-hud text-[9px] tracking-[0.3em] px-1.5 py-0.5 rounded-sm"
          style={{ background: tagColor, color: "var(--color-background)" }}
        >
          {tag}
        </span>
      </div>
      <p className="font-display font-semibold text-base leading-snug">{line1}</p>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}
