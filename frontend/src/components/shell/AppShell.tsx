import { useState } from "react";
import { useStadiumStore } from "@/state/useStadiumStore";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { RoleChooser } from "@/components/landing/RoleChooser";
import { StadiumSeatMap } from "@/components/ticketing/StadiumSeatMap";
import { BookingConfirmation } from "@/components/ticketing/BookingConfirmation";
import { ConciergeDrawer } from "@/components/ticketing/ConciergeDrawer";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";

export function AppShell() {
  useTelemetryStream();
  const role = useStadiumStore((s) => s.userRole);
  const setRole = useStadiumStore((s) => s.setRole);
  const ticket = useStadiumStore((s) => s.ticket);
  const [seatMapKey, setSeatMapKey] = useState(0);

  return (
    <div className="min-h-screen">
      {role !== "none" && (
        <nav className="fixed top-3 left-3 z-50">
          <button
            onClick={() => setRole("none")}
            className="hex-frame rounded-full px-4 py-2 font-hud text-[10px] tracking-[0.3em] hover:glow-cyan transition flex items-center gap-2"
          >
            <span>←</span> EXIT {role.toUpperCase()}
          </button>
        </nav>
      )}

      <main className={role === "none" ? "" : "pt-16 pb-12"}>
        {role === "none" && <RoleChooser />}

        {role === "fan" && !ticket && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-4">
            <header className="text-center">
              <p className="font-hud text-[11px] tracking-[0.4em] text-cyan">// STAND PICKER · CSK vs MI</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">M. Chinnaswamy Stadium · Tonight 19:30</h2>
            </header>
            <StadiumSeatMap key={seatMapKey} onBooked={() => { /* ticket triggers confirmation */ }} />
          </div>
        )}

        {role === "fan" && ticket && (
          <div className="px-3 sm:px-6">
            <BookingConfirmation onBookAnother={() => setSeatMapKey((k) => k + 1)} />
          </div>
        )}

        {role === "admin" && <AdminDashboard />}
      </main>

      {role === "fan" && <ConciergeDrawer />}
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
