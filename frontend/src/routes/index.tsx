import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/")(  {
  component: Index,
});

function Index() {
  return <AppShell />;
}
