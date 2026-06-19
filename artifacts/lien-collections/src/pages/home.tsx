import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Screen } from "@/components/primitives/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LienStream {
  id: string;
  workStream: string;
  status: string;
}

interface Project {
  id: string;
  hubspotProjectId: string;
  cachedProjectName: string | null;
  cachedHubspotStatus: string | null;
  lienWorkflowType: string;
  contractorTier: string;
  county: string | null;
  legalPropertyAddress: string | null;
  contractStartDate: string | null;
  completionChecklistComplete: boolean;
  streams: LienStream[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
}

const WORKFLOW_LABELS: Record<string, string> = {
  commercial_sub: "Commercial Sub",
  residential_sub: "Residential Sub",
  public_bond: "Public / Bond",
  none: "No Lien Tracking",
};

const WORKFLOW_COLORS: Record<string, string> = {
  commercial_sub: "bg-blue-100 text-blue-800",
  residential_sub: "bg-green-100 text-green-800",
  public_bond: "bg-purple-100 text-purple-800",
  none: "bg-gray-100 text-gray-600",
};

const STREAM_STATUS_RISK: Record<string, "high" | "medium" | "low" | "ok"> = {
  at_risk: "high",
  filing: "high",
  lapsed: "high",
  notice_active: "medium",
  filed: "medium",
  open: "low",
  released: "ok",
  closed: "ok",
};

function highestRisk(streams: LienStream[]): "high" | "medium" | "low" | "ok" | "none" {
  if (!streams.length) return "none";
  const order = ["high", "medium", "low", "ok"];
  for (const level of order) {
    if (streams.some((s) => STREAM_STATUS_RISK[s.status] === level)) return level as "high" | "medium" | "low" | "ok";
  }
  return "none";
}

function RiskBadge({ risk }: { risk: ReturnType<typeof highestRisk> }) {
  if (risk === "none") {
    return <span className="text-xs text-muted-foreground">No streams</span>;
  }
  const styles: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-blue-100 text-blue-800",
    ok: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    high: "At Risk",
    medium: "Active",
    low: "Open",
    ok: "Closed",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[risk],
      )}
    >
      {labels[risk]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Project row
// ---------------------------------------------------------------------------

function ProjectRow({ project }: { project: Project }) {
  const risk = highestRisk(project.streams);

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer border-b last:border-b-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {project.cachedProjectName ?? project.hubspotProjectId}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
                WORKFLOW_COLORS[project.lienWorkflowType] ?? "bg-gray-100 text-gray-600",
              )}
            >
              {WORKFLOW_LABELS[project.lienWorkflowType] ?? project.lienWorkflowType}
            </span>
            {project.contractorTier === "second_tier" && (
              <Badge variant="outline" className="text-xs shrink-0">
                2nd Tier
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {project.county && (
              <span className="text-xs text-muted-foreground">{project.county} Co.</span>
            )}
            {project.cachedHubspotStatus && (
              <span className="text-xs text-muted-foreground capitalize">
                Stage: {project.cachedHubspotStatus}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RiskBadge risk={risk} />
          {project.completionChecklistComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Setup complete" />
          ) : (
            <XCircle className="h-4 w-4 text-amber-500" aria-label="Setup incomplete" />
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [search, setSearch] = React.useState("");
  const [filterWorkflow, setFilterWorkflow] = React.useState("all");
  const [filterIncomplete, setFilterIncomplete] = React.useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<{ projects: Project[] }>("/projects"),
    retry: false,
  });

  const projects = data?.projects ?? [];

  const filtered = projects.filter((p) => {
    const name = (p.cachedProjectName ?? p.hubspotProjectId).toLowerCase();
    const county = (p.county ?? "").toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !county.includes(search.toLowerCase())) {
      return false;
    }
    if (filterWorkflow !== "all" && p.lienWorkflowType !== filterWorkflow) return false;
    if (filterIncomplete && p.completionChecklistComplete) return false;
    return true;
  });

  const incompleteCount = projects.filter((p) => !p.completionChecklistComplete).length;
  const atRiskCount = projects.filter((p) => {
    const r = highestRisk(p.streams);
    return r === "high" || r === "medium";
  }).length;

  return (
    <Screen>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage lien rights for all active fire protection projects.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              label: "Total Projects",
              value: isLoading ? "—" : String(projects.length),
              sub: "in lien tracking",
              icon: Clock,
              color: "text-primary",
            },
            {
              label: "Incomplete Setup",
              value: isLoading ? "—" : String(incompleteCount),
              sub: "missing required fields",
              icon: XCircle,
              color: incompleteCount > 0 ? "text-amber-500" : "text-green-600",
            },
            {
              label: "At Risk",
              value: isLoading ? "—" : String(atRiskCount),
              sub: "active or risk streams",
              icon: AlertTriangle,
              color: atRiskCount > 0 ? "text-destructive" : "text-green-600",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={cn("h-4 w-4", card.color)} />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
              </div>
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search projects or county…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterWorkflow} onValueChange={setFilterWorkflow}>
            <SelectTrigger className="h-9 text-sm w-44">
              <SelectValue placeholder="All workflow types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflow Types</SelectItem>
              <SelectItem value="commercial_sub">Commercial Sub</SelectItem>
              <SelectItem value="residential_sub">Residential Sub</SelectItem>
              <SelectItem value="public_bond">Public / Bond</SelectItem>
              <SelectItem value="none">No Lien Tracking</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={filterIncomplete ? "default" : "outline"}
            className="h-9 text-sm"
            onClick={() => setFilterIncomplete((v) => !v)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Incomplete Only
          </Button>
        </div>

        {/* Project list */}
        {isLoading ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading projects…
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            {(error as Error)?.message?.includes("401")
              ? "Not authenticated — visit /api/dev/session to establish a dev session."
              : `Failed to load projects: ${(error as Error)?.message}`}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            {projects.length === 0
              ? "No projects yet. Create one to get started."
              : "No projects match the current filters."}
          </div>
        ) : (
          <div className="rounded-lg border bg-card divide-y overflow-hidden">
            {filtered.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
