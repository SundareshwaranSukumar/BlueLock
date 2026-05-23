import { useStadiumStore } from "@/state/useStadiumStore";

export function RoleChooser() {
  const setRole = useStadiumStore((s) => s.setRole);

  return (
    <section className="min-h-[calc(100vh-6rem)] relative flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 scanline" />
      </div>

      <p className="font-hud text-[11px] tracking-[0.5em] text-cyan mb-4 opacity-80">
        // AGENTIC PREMIER LEAGUE / IDENTITY GATE
      </p>
      <h1 className="text-center text-4xl sm:text-6xl md:text-7xl font-bold leading-[0.95]">
        <span className="block">BLUELOCK</span>
        <span className="block text-cyan text-xl sm:text-2xl md:text-3xl font-hud tracking-[0.3em] mt-3">
          SMART STADIUM GRID
        </span>
      </h1>
      <p className="mt-5 max-w-xl text-center text-muted-foreground text-sm sm:text-base">
        Choose your access tier. Fans book seats and route through the safest corridor. Directors
        monitor the entire grid in real time.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl">
        <RoleCard
          tag="01 / FAN"
          title="Book Tickets"
          subtitle="Pick your seat, get your gate, station and parking"
          accent="var(--color-cyan)"
          onClick={() => setRole("fan")}
        />
        <RoleCard
          tag="02 / DIRECTOR"
          title="Admin Command"
          subtitle="Heatmaps, parking, gate telemetry, full grid control"
          accent="var(--color-warn)"
          onClick={() => setRole("admin")}
        />
      </div>
    </section>
  );
}

function RoleCard({
  tag,
  title,
  subtitle,
  accent,
  onClick,
}: {
  tag: string;
  title: string;
  subtitle: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative hex-frame rounded-md p-7 text-left transition hover:-translate-y-1 hover:glow-cyan gpu"
      style={{ borderColor: accent }}
    >
      <span className="font-hud text-[10px] tracking-[0.4em]" style={{ color: accent }}>
        {tag}
      </span>
      <h3 className="font-display text-3xl font-bold mt-3">{title}</h3>
      <p className="text-muted-foreground text-sm mt-2 max-w-sm">{subtitle}</p>
      <div
        className="mt-6 flex items-center gap-2 font-hud text-[11px] tracking-[0.3em]"
        style={{ color: accent }}
      >
        ENTER
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
      <div
        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition pointer-events-none"
        style={{ boxShadow: `inset 0 0 40px ${accent}40` }}
      />
    </button>
  );
}
