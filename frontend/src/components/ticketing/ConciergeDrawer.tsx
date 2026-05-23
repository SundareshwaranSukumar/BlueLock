import { useState } from "react";
import { useStadiumStore } from "@/state/useStadiumStore";
import { apiClient } from "@/services/api";
import { cn } from "@/lib/utils";

export function ConciergeDrawer() {
  const open = useStadiumStore((s) => s.chatOpen);
  const setOpen = useStadiumStore((s) => s.setChatOpen);
  const chat = useStadiumStore((s) => s.chat);
  const push = useStadiumStore((s) => s.pushChat);
  const ticket = useStadiumStore((s) => s.ticket);
  const userName = useStadiumStore((s) => s.userName);
  const setView = useStadiumStore((s) => s.setView);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(message?: string) {
    const text = (message ?? draft).trim();
    if (!text || busy) return;
    setDraft("");
    push({ id: `u-${Date.now()}`, role: "user", content: text });
    setBusy(true);
    try {
      const res = await apiClient.assistant({
        userId: userName || "fan",
        message: text,
        currentGate: ticket?.assignedGate,
        userLocationContext: ticket ? `${ticket.stand} stand · ${ticket.entryCorridor} corridor` : "outside facility",
      });
      push({
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.replyText,
        suggestedAction: res.suggestedAction,
        targetGate: res.targetGate,
      });
    } catch (err) {
      push({ id: `a-${Date.now()}`, role: "assistant", content: `Concierge unreachable: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 h-14 px-5 hex-frame rounded-full glow-cyan font-hud text-[11px] tracking-[0.25em] text-cyan flex items-center gap-2"
        aria-label="Open AI Concierge"
      >
        <BotIcon /> CONCIERGE
      </button>

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] hex-frame border-l border-border transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-hud text-[10px] tracking-[0.3em] text-cyan">// AI CONCIERGE</p>
            <p className="font-display font-bold mt-0.5">Stadium Assistant</p>
          </div>
          <button onClick={() => setOpen(false)} className="font-hud text-xs tracking-[0.25em] text-muted-foreground hover:text-foreground">CLOSE ✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chat.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-md px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-[color:var(--color-cyan)] text-background"
                    : "hex-frame text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === "assistant" && m.suggestedAction && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <ActionPill action={m.suggestedAction} />
                    {m.targetGate && (
                      <button
                        onClick={() => setView(3)}
                        className="px-2 py-0.5 rounded-full hex-frame font-hud text-[10px] tracking-[0.2em] text-cyan hover:glow-cyan"
                      >
                        → GATE {m.targetGate}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="hex-frame rounded-md px-3 py-2 text-sm font-hud tracking-[0.2em] text-cyan">…thinking</div>
            </div>
          )}
        </div>

        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {["Which gate is least busy?", "How do I reach Gate D?", "Where's the nearest metro?"].map((q) => (
            <button key={q} onClick={() => send(q)} disabled={busy}
              className="px-2 py-1 rounded-full hex-frame font-hud text-[10px] tracking-[0.15em] text-muted-foreground hover:text-cyan disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="p-3 border-t border-border flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder="Ask the concierge…"
            className="flex-1 bg-background/60 border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-cyan)]"
          />
          <button type="submit" disabled={busy || !draft.trim()}
            className="px-4 hex-frame rounded-sm font-hud text-[11px] tracking-[0.25em] text-cyan glow-cyan disabled:opacity-50">
            SEND
          </button>
        </form>
      </div>
    </>
  );
}

function ActionPill({ action }: { action: "REDIRECT" | "STAY" | "PROCEED" }) {
  const color =
    action === "REDIRECT" ? "var(--color-warn)" :
    action === "STAY" ? "var(--color-muted-foreground)" : "var(--color-ok)";
  return (
    <span
      className="px-2 py-0.5 rounded-full font-hud text-[10px] tracking-[0.25em]"
      style={{ background: color, color: "var(--color-background)" }}
    >
      [{action}]
    </span>
  );
}

function BotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" />
      <path d="M12 3v4" />
    </svg>
  );
}
