import { HexPulseLogo } from "@/components/branding/HexPulseLogo";
import { HexFrame, HexIcon } from "@/components/branding/HexFrame";
import { useStadiumStore } from "@/state/useStadiumStore";

export function EgoistGate() {
  const setView = useStadiumStore((s) => s.setView);
  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 scanline" />
      </div>

      <p className="font-hud text-[11px] tracking-[0.5em] text-cyan mb-6 opacity-80">
        // AGENTIC PREMIER LEAGUE / SYSTEM v2.6
      </p>

      <h1 className="relative text-center text-5xl sm:text-7xl md:text-8xl font-bold leading-[0.95]">
        <span className="block">BLUELOCK</span>
        <span className="block text-cyan text-2xl sm:text-3xl md:text-4xl font-hud tracking-[0.3em] mt-3">
          SMART STADIUM GRID
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-center text-muted-foreground text-sm sm:text-base">
        Crowd dispersal, gate telemetry & agentic match intelligence — a single command surface
        for fans, operators and the director's chair.
      </p>

      <div className="my-10">
        <HexPulseLogo size={240} />
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        <HexFrame wide tone="cyan" className="w-72 h-20 cursor-pointer group" onClick={() => setView(2)}>
          <button className="w-full h-20 flex items-center justify-center gap-3 font-hud text-sm tracking-[0.25em] text-cyan">
            <HexIcon size={18} /> ENTER FACILITY
          </button>
        </HexFrame>
        <HexFrame wide className="w-72 h-20 cursor-pointer hover:glow-cyan transition" onClick={() => setView(5)}>
          <button className="w-full h-20 flex items-center justify-center gap-3 font-hud text-sm tracking-[0.25em]">
            <HexIcon size={18} /> LAUNCH CONTROL ROOM
          </button>
        </HexFrame>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex justify-between font-hud text-[10px] tracking-[0.3em] text-muted-foreground">
        <span>LAT 26.8150° N</span>
        <span className="hidden sm:inline">EKANA CRICKET STADIUM / NODE-07</span>
        <span>LON 81.0050° E</span>
      </div>
    </section>
  );
}
