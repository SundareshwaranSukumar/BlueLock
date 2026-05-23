import { useStadiumStore } from "@/state/useStadiumStore";
import { MATCH_AWAY, MATCH_HOME } from "@/domain/fixtures";

const TRANSPORTS = ["metro", "bus", "cab", "walk"] as const;

export function BookingCommuteForm() {
  const userName = useStadiumStore((s) => s.userName);
  const setUserName = useStadiumStore((s) => s.setUserName);
  const team = useStadiumStore((s) => s.selectedTeam);
  const setTeam = useStadiumStore((s) => s.setTeam);
  const startingLocation = useStadiumStore((s) => s.startingLocation);
  const setStartingLocation = useStadiumStore((s) => s.setStartingLocation);
  const transportMode = useStadiumStore((s) => s.transportMode);
  const setTransportMode = useStadiumStore((s) => s.setTransportMode);
  const setView = useStadiumStore((s) => s.setView);

  return (
    <div className="hex-frame rounded-md p-5 space-y-4">
      <label className="block">
        <span className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
          DISPLAY NAME
        </span>
        <input
          className="mt-1 w-full bg-background border border-border rounded-sm px-3 py-2"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
        />
      </label>
      <label className="block">
        <span className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
          STARTING LOCATION
        </span>
        <input
          className="mt-1 w-full bg-background border border-border rounded-sm px-3 py-2"
          value={startingLocation}
          onChange={(e) => setStartingLocation(e.target.value)}
          placeholder="e.g. Lucknow Junction"
        />
      </label>
      <div>
        <span className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
          TRANSPORT MODE
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TRANSPORTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTransportMode(t)}
              className="hex-frame px-3 py-1.5 font-hud text-[10px] tracking-[0.2em] uppercase"
              style={
                transportMode === t
                  ? { borderColor: "var(--color-cyan)", color: "var(--color-cyan)" }
                  : undefined
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
          TEAM ALLEGIANCE
        </span>
        <div className="mt-2 flex gap-3">
          {([MATCH_HOME, MATCH_AWAY] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              className="flex-1 hex-frame py-3 font-display font-bold"
              style={team === t ? { borderColor: "var(--color-cyan)" } : undefined}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={!userName.trim()}
        onClick={() => setView(3)}
        className="w-full h-12 hex-frame font-hud text-sm tracking-[0.3em] text-cyan hover:glow-cyan disabled:opacity-50"
      >
        CONTINUE TO SEAT MAP →
      </button>
    </div>
  );
}
