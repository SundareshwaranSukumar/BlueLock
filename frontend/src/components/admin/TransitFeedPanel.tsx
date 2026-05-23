import { useStadiumStore } from "@/state/useStadiumStore";

const FALLBACK = [
  { mode: "Metro", line: "Red Line · Ekana", status: "moderate", eta: "6 min" },
  { mode: "Bus", line: "UPSRTC 340", status: "ok", eta: "14 min" },
  { mode: "Ride", line: "Last-mile pool", status: "busy", eta: "5 min" },
];

export function TransitFeedPanel() {
  const match = useStadiumStore((s) => s.match);
  const items = FALLBACK;

  return (
    <div className="space-y-3">
      <h3 className="font-hud text-xs tracking-[0.3em] text-cyan">// LAST-MILE TRANSIT FEED</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.line} className="hex-frame rounded-md p-4">
            <p className="font-hud text-[9px] tracking-[0.25em] text-muted-foreground">
              {it.mode.toUpperCase()}
            </p>
            <p className="font-display font-semibold mt-1">{it.line}</p>
            <p className="text-sm text-muted-foreground mt-1">ETA {it.eta}</p>
            <p
              className="font-hud text-[10px] mt-2"
              style={{
                color:
                  it.status === "heavy" || it.status === "busy"
                    ? "var(--color-warn)"
                    : "var(--color-ok)",
              }}
            >
              {it.status.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-hud">
        Match feed: {match.batting} {match.runs}/{match.wickets} ({match.overs} ov) · source:{" "}
        {match.source}
      </p>
    </div>
  );
}
