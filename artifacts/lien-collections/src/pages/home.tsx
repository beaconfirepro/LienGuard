import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/primitives/Screen";
import { Grid } from "@/components/primitives/Grid";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface HealthData {
  status: "ok" | "error";
  db: "ok" | "error";
  version: string;
}

function HealthBadge() {
  const BASE = import.meta.env.BASE_URL ?? "/";
  const apiBase = BASE.replace(/lien-collections\/?/, "api-server/api");

  const { data, isLoading, isError } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${apiBase.replace(/\/api$/, "")}/health`);
      if (!res.ok) throw new Error("health check failed");
      return res.json() as Promise<HealthData>;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5 animate-spin" />
        Checking…
      </span>
    );
  }

  if (isError || !data || data.status !== "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        API unavailable
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
      <CheckCircle className="h-3.5 w-3.5" />
      API online · v{data.version}
    </span>
  );
}

export default function HomePage() {
  return (
    <Screen>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage lien rights and collections for all active fire protection projects.
            </p>
          </div>
          <HealthBadge />
        </div>

        <Grid cols={3} gap="md">
          {[
            { label: "Active Projects", value: "3", sub: "lien tracking open" },
            { label: "Overdue Invoices", value: "$48,250", sub: "1 account in collections" },
            { label: "Upcoming Deadlines", value: "2", sub: "next: Jun 15 — Notice due" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-card-border bg-card p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
            </div>
          ))}
        </Grid>

        <div className="rounded-lg border border-card-border bg-card p-6 text-center text-muted-foreground text-sm">
          Project list coming in Phase 1 — foundation complete.
        </div>
      </div>
    </Screen>
  );
}
