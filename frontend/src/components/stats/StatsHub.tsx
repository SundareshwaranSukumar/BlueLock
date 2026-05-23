import { useState } from "react";
import { TEAMS, PLAYERS, SCHEDULE } from "@/domain/fixtures";
import { RadarChart } from "./RadarChart";
import type { Player } from "@/domain/types";
import { HexFrame } from "@/components/branding/HexFrame";

const TABS = ["Points", "Schedule", "Players"] as const;
type Tab = typeof TABS[number];

export function StatsHub() {
  const [tab, setTab] = useState<Tab>("Points");
  const [open, setOpen] = useState<Player | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold">Tournament Intelligence</h2>
          <p className="text-muted-foreground text-sm">Macro view · IPL 2026 · Live data feed</p>
        </div>
        <div className="hex-frame rounded-full p-0.5 flex font-hud text-[10px] tracking-[0.25em]">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full transition"
              style={tab === t ? { background: "var(--color-cyan)", color: "var(--color-background)" } : undefined}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {tab === "Points" && (
        <div className="hex-frame rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/80">
              <tr className="font-hud text-[10px] tracking-[0.25em] text-muted-foreground text-left">
                <th className="p-3">#</th><th>TEAM</th><th>P</th><th>W</th><th>L</th><th>NRR</th><th className="pr-3 text-right">PTS</th>
              </tr>
            </thead>
            <tbody>
              {[...TEAMS].sort((a, b) => b.points - a.points).map((t, i) => (
                <tr key={t.short} className="border-t border-border hover:bg-card/40">
                  <td className="p-3 font-hud text-cyan">{String(i + 1).padStart(2, "0")}</td>
                  <td className="font-display font-semibold">{t.team}</td>
                  <td>{t.played}</td><td>{t.won}</td><td>{t.lost}</td>
                  <td className={t.nrr >= 0 ? "text-ok" : "text-crit"}>{t.nrr.toFixed(2)}</td>
                  <td className="pr-3 text-right font-hud text-base font-bold">{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Schedule" && (
        <div className="grid sm:grid-cols-3 gap-3">
          {SCHEDULE.map((m) => (
            <div key={m.id} className="hex-frame rounded-md p-4">
              <p className="font-hud text-[10px] tracking-[0.25em] text-cyan">{m.date.toUpperCase()} · {m.time}</p>
              <p className="font-display text-xl font-bold mt-2">{m.home} <span className="text-muted-foreground text-sm">vs</span> {m.away}</p>
              <p className="text-muted-foreground text-xs mt-1">{m.venue}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "Players" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLAYERS.map((p) => (
            <button key={p.id} onClick={() => setOpen(p)} className="hex-frame rounded-md p-4 text-left hover:glow-cyan transition">
              <p className="font-hud text-[10px] tracking-[0.25em] text-cyan">{p.team} · {p.role}</p>
              <p className="font-display text-lg font-bold mt-1">{p.name}</p>
              <p className="text-muted-foreground text-xs mt-1">Tap for analyst sheet →</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <HexFrame tone="cyan" className="w-[90%] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-card p-6 rounded-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-hud text-[10px] tracking-[0.3em] text-cyan">// ANALYST SHEET</p>
                  <h3 className="font-display text-3xl font-bold mt-1">{open.name}</h3>
                  <p className="text-muted-foreground">{open.team} · {open.role}</p>
                </div>
                <button onClick={() => setOpen(null)} className="font-hud text-xs tracking-[0.3em] text-muted-foreground hover:text-foreground">CLOSE ✕</button>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mt-5">
                <RadarChart player={open} />
                <div>
                  <p className="font-hud text-[10px] tracking-[0.3em] text-muted-foreground mb-2">PHASE-WISE PERFORMANCE</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(open.phases).map(([k, v]) => (
                      <div key={k} className="hex-frame rounded-sm p-3 text-center">
                        <p className="font-hud text-[9px] tracking-[0.25em] text-muted-foreground">{k.toUpperCase()}</p>
                        <p className="font-hud text-2xl font-bold mt-1 text-cyan">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </HexFrame>
        </div>
      )}
    </div>
  );
}
