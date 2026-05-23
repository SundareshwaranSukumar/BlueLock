import { useStadiumStore, type ViewId } from "@/state/useStadiumStore";
import { cn } from "@/lib/utils";
import { HexIcon } from "@/components/branding/HexFrame";

const ITEMS: { id: ViewId; label: string }[] = [
  { id: 1, label: "Gate" },
  { id: 2, label: "Ticket" },
  { id: 3, label: "Stadium" },
  { id: 4, label: "Intel" },
  { id: 5, label: "Director" },
];

export function ViewNav() {
  const view = useStadiumStore((s) => s.activeView);
  const setView = useStadiumStore((s) => s.setView);
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="hex-frame px-2 py-1.5 rounded-full flex items-center gap-1">
        <span className="text-cyan px-2">
          <HexIcon size={16} />
        </span>
        <span className="font-hud text-[10px] tracking-[0.3em] text-cyan pr-3 hidden sm:inline">
          BLUELOCK
        </span>
        {ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className={cn(
              "font-hud text-[10px] sm:text-[11px] uppercase tracking-[0.2em] px-2.5 sm:px-3 py-1.5 rounded-full transition-colors",
              view === it.id
                ? "bg-cyan text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={
              view === it.id
                ? { background: "var(--color-cyan)", color: "var(--color-background)" }
                : undefined
            }
          >
            <span className="opacity-60 mr-1">{String(it.id).padStart(2, "0")}</span>
            {it.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
