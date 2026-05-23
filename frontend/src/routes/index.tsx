import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlueLock — Smart Stadium & Crowd Dispersal Command Grid" },
      { name: "description", content: "Agentic Premier League command surface: ticketing, AR stadium twin, live gate telemetry and the Director's Matrix." },
      { property: "og:title", content: "BlueLock — Smart Stadium Command Grid" },
      { property: "og:description", content: "Crowd dispersal, gate telemetry & agentic match intelligence for the Agentic Premier League." },
    ],
  }),
  component: Index,
});

function Index() {
  return <AppShell />;
}
