import { useStadiumStore } from "@/state/useStadiumStore";
import { useTelemetryStream } from "@/hooks/useTelemetryStream";
import { ViewNav } from "@/components/shell/ViewNav";
import { EgoistGate } from "@/components/landing/EgoistGate";
import { BookingCommuteForm } from "@/components/ticketing/BookingCommuteForm";
import { StadiumSeatMap } from "@/components/ticketing/StadiumSeatMap";
import { BookingConfirmation } from "@/components/ticketing/BookingConfirmation";
import { ConciergeDrawer } from "@/components/ticketing/ConciergeDrawer";
import { IsoStadium } from "@/components/stadium/IsoStadium";
import { Jumbotron } from "@/components/stadium/Jumbotron";
import { StatsHub } from "@/components/stats/StatsHub";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import { VENUE_LABEL } from "@/domain/fixtures";

export function AppShell() {
  useTelemetryStream();
  const view = useStadiumStore((s) => s.activeView);
  const ticket = useStadiumStore((s) => s.ticket);

  return (
    <div className="min-h-screen">
      {view > 1 && <ViewNav />}

      <main className={view === 1 ? "" : "pt-20 pb-12"}>
        {view === 1 && <EgoistGate />}
        {view === 2 && (
          <div className="max-w-3xl mx-auto px-4 space-y-4">
            <header className="text-center">
              <p className="font-hud text-[11px] tracking-[0.4em] text-cyan">
                // BOOKING · COMMUTE
              </p>
              <h2 className="font-display text-2xl font-bold mt-1">LSG vs PBKS · {VENUE_LABEL}</h2>
            </header>
            <BookingCommuteForm />
          </div>
        )}
        {view === 3 && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-4">
            <Jumbotron />
            <div className="grid lg:grid-cols-2 gap-4">
              <IsoStadium />
              {ticket ? (
                <BookingConfirmation
                  onBookAnother={() => useStadiumStore.getState().clearTicket()}
                />
              ) : (
                <StadiumSeatMap onBooked={() => {}} />
              )}
            </div>
          </div>
        )}
        {view === 4 && (
          <div className="max-w-5xl mx-auto px-4 space-y-4">
            <Jumbotron />
            <StatsHub />
          </div>
        )}
        {view === 5 && <AdminDashboard />}
      </main>

      {(view === 2 || view === 3) && <ConciergeDrawer />}
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
