import { useEffect } from "react";
import { telemetryService } from "@/services/telemetry";
import { useStadiumStore } from "@/state/useStadiumStore";

/** Bridges the telemetry service to the global store. Mount once at app root. */
export function useTelemetryStream() {
  const applyTelemetry = useStadiumStore((s) => s.applyTelemetry);
  useEffect(() => telemetryService.subscribe(applyTelemetry), [applyTelemetry]);
}
