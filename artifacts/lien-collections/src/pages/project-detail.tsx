import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Screen } from "@/components/primitives/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Users,
  XCircle,
  Building2,
  GitBranch,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LienStream {
  id: string;
  workStream: string;
  status: string;
  openedAt: string;
}

interface Party {
  id: string;
  partyRelationType: string;
  hubspotCompanyId: string;
  cachedLegalName: string;
  cachedMailingAddress: string | null;
}

interface SubSystemType {
  id: string;
  name: string;
  lienWorkflowType: string;
}

interface Project {
  id: string;
  hubspotProjectId: string;
  cachedProjectName: string | null;
  cachedHubspotStatus: string | null;
  lienWorkflowType: string;
  contractorTier: string;
  legalPropertyAddress: string | null;
  county: string | null;
  contractStartDate: string | null;
  completionChecklistComplete: boolean;
  jurisdictionId: string;
  subSystemTypeId: string;
}

interface ChecklistItem {
  field: string;
  label: string;
}

interface ProjectDetailResponse {
  project: Project;
  parties: Party[];
  streams: LienStream[];
  subSystemType: SubSystemType | null;
  checklist: { complete: boolean; missing: ChecklistItem[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  }).then(async (res) => {
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

const PARTY_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  original_contractor: "Original Contractor (GC)",
  hiring_party: "Hiring Party",
};

const STREAM_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  at_risk: "At Risk",
  notice_active: "Notice Active",
  filing: "Filing",
  filed: "Filed",
  released: "Released",
  closed: "Closed",
  lapsed: "Lapsed",
};

const STREAM_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  at_risk: "bg-red-100 text-red-800",
  notice_active: "bg-amber-100 text-amber-800",
  filing: "bg-orange-100 text-orange-800",
  filed: "bg-purple-100 text-purple-800",
  released: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  lapsed: "bg-red-200 text-red-900",
};

// ---------------------------------------------------------------------------
// Checklist panel
// ---------------------------------------------------------------------------

function ChecklistPanel({
  checklist,
  contractorTier,
}: {
  checklist: { complete: boolean; missing: ChecklistItem[] };
  contractorTier: string;
}) {
  if (checklist.complete) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium text-green-800">Setup complete — all required fields filled</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-sm font-medium text-amber-800">
          Setup incomplete — {checklist.missing.length} item{checklist.missing.length !== 1 ? "s" : ""} remaining
        </span>
      </div>
      <ul className="space-y-1 ml-6">
        {checklist.missing.map((item) => (
          <li key={item.field} className="text-xs text-amber-700 list-disc">
            {item.label}
          </li>
        ))}
      </ul>
      {contractorTier === "second_tier" && (
        <div className="flex items-start gap-1.5 mt-2">
          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            2nd-tier projects require both a hiring party and original contractor in the parties section below.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiFetch<ProjectDetailResponse>(`/projects/${id}`),
    retry: false,
    enabled: !!id,
  });

  // Lien setup form state
  const [setupForm, setSetupForm] = React.useState<{
    contractorTier: string;
    legalPropertyAddress: string;
    county: string;
    contractStartDate: string;
  } | null>(null);

  // Initialize form when data loads
  React.useEffect(() => {
    if (data?.project && setupForm === null) {
      const p = data.project;
      setSetupForm({
        contractorTier: p.contractorTier,
        legalPropertyAddress: p.legalPropertyAddress ?? "",
        county: p.county ?? "",
        contractStartDate: p.contractStartDate
          ? p.contractStartDate.slice(0, 10)
          : "",
      });
    }
  }, [data?.project, setupForm]);

  // Party add form state
  const [addParty, setAddParty] = React.useState({
    hubspotCompanyId: "",
    partyRelationType: "",
    cachedLegalName: "",
    cachedMailingAddress: "",
  });

  const patchProject = useMutation({
    mutationFn: (body: object) =>
      apiFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addPartyMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch(`/projects/${id}/parties`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res: { party: Party; warnings: string[] }) => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      if (res.warnings?.length) {
        toast({ title: "Party added", description: res.warnings.join(" | "), variant: "default" });
      } else {
        toast({ title: "Party added" });
      }
      setAddParty({ hubspotCompanyId: "", partyRelationType: "", cachedLegalName: "", cachedMailingAddress: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeParty = useMutation({
    mutationFn: (partyId: string) =>
      apiFetch(`/projects/${id}/parties/${partyId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      toast({ title: "Party removed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <Screen>
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Loading project…
        </div>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {(error as Error)?.message?.includes("401")
            ? "Not authenticated — visit /api/dev/session to establish a dev session."
            : `Failed to load project: ${(error as Error)?.message}`}
        </div>
      </Screen>
    );
  }

  const { project, parties, streams, subSystemType, checklist } = data;
  const form = setupForm ?? {
    contractorTier: project.contractorTier,
    legalPropertyAddress: project.legalPropertyAddress ?? "",
    county: project.county ?? "",
    contractStartDate: project.contractStartDate ? project.contractStartDate.slice(0, 10) : "",
  };

  function handleSaveSetup() {
    patchProject.mutate({
      contractorTier: form.contractorTier,
      legalPropertyAddress: form.legalPropertyAddress || null,
      county: form.county || null,
      contractStartDate: form.contractStartDate || null,
    });
  }

  return (
    <Screen>
      <div className="space-y-6 max-w-3xl">
        {/* Back nav */}
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {project.cachedProjectName ?? project.hubspotProjectId}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  WORKFLOW_COLORS[project.lienWorkflowType] ?? "bg-gray-100 text-gray-600",
                )}
              >
                {WORKFLOW_LABELS[project.lienWorkflowType] ?? project.lienWorkflowType}
              </span>
              {project.contractorTier === "second_tier" && (
                <Badge variant="outline" className="text-xs">2nd Tier</Badge>
              )}
              {project.cachedHubspotStatus && (
                <span className="text-xs text-muted-foreground capitalize">
                  HubSpot: {project.cachedHubspotStatus}
                </span>
              )}
              {subSystemType && (
                <span className="text-xs text-muted-foreground">
                  {subSystemType.name}
                </span>
              )}
            </div>
          </div>
          <div>
            {project.completionChecklistComplete ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Setup Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-medium">
                <XCircle className="h-3.5 w-3.5" />
                Incomplete Setup
              </span>
            )}
          </div>
        </div>

        {/* Checklist */}
        <ChecklistPanel checklist={checklist} contractorTier={project.contractorTier} />

        <Separator />

        {/* Lien Setup Form */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Lien Setup</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Contractor Tier</Label>
              <Select
                value={form.contractorTier}
                onValueChange={(v) => setSetupForm((f) => f ? { ...f, contractorTier: v } : f)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_tier">
                    <span className="font-medium">1st Tier</span>
                    <span className="ml-1 text-xs text-muted-foreground">— contracted directly with GC</span>
                  </SelectItem>
                  <SelectItem value="second_tier">
                    <span className="font-medium">2nd Tier</span>
                    <span className="ml-1 text-xs text-muted-foreground">— contracted with a sub</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">County</Label>
              <Input
                placeholder="e.g. Travis"
                className="h-9 text-sm"
                value={form.county}
                onChange={(e) => setSetupForm((f) => f ? { ...f, county: e.target.value } : f)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Legal Property Address</Label>
              <Input
                placeholder="e.g. 100 Main St, Austin, TX 78701"
                className="h-9 text-sm"
                value={form.legalPropertyAddress}
                onChange={(e) =>
                  setSetupForm((f) => f ? { ...f, legalPropertyAddress: e.target.value } : f)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Contract Start Date</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={form.contractStartDate}
                onChange={(e) =>
                  setSetupForm((f) => f ? { ...f, contractStartDate: e.target.value } : f)
                }
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSaveSetup}
            disabled={patchProject.isPending}
          >
            Save Setup
          </Button>
        </div>

        <Separator />

        {/* Lien Streams */}
        {streams.length > 0 && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Lien Streams</h2>
              </div>
              <div className="space-y-2">
                {streams.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium capitalize">{s.workStream}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Opened {new Date(s.openedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STREAM_STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600",
                      )}
                    >
                      {STREAM_STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Parties */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Parties</h2>
            {project.contractorTier === "second_tier" && (
              <span className="text-xs text-muted-foreground ml-1">
                — 2nd-tier requires hiring party + original contractor
              </span>
            )}
          </div>

          {parties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parties added yet.</p>
          ) : (
            <div className="space-y-2">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{party.cachedLegalName}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {PARTY_ROLE_LABELS[party.partyRelationType] ?? party.partyRelationType}
                      </Badge>
                    </div>
                    {party.cachedMailingAddress && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {party.cachedMailingAddress}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Remove party"
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                    onClick={() => removeParty.mutate(party.id)}
                    disabled={removeParty.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add party form */}
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Add Party
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={addParty.partyRelationType}
                  onValueChange={(v) => setAddParty((p) => ({ ...p, partyRelationType: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select role…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="original_contractor">Original Contractor (GC)</SelectItem>
                    <SelectItem value="hiring_party">Hiring Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">HubSpot Company ID</Label>
                <Input
                  placeholder="hs_co_…"
                  className="h-8 text-xs"
                  value={addParty.hubspotCompanyId}
                  onChange={(e) => setAddParty((p) => ({ ...p, hubspotCompanyId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Legal Name</Label>
                <Input
                  placeholder="Legal entity name"
                  className="h-8 text-xs"
                  value={addParty.cachedLegalName}
                  onChange={(e) => setAddParty((p) => ({ ...p, cachedLegalName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mailing Address (optional)</Label>
                <Input
                  placeholder="123 Main St, City, TX"
                  className="h-8 text-xs"
                  value={addParty.cachedMailingAddress}
                  onChange={(e) =>
                    setAddParty((p) => ({ ...p, cachedMailingAddress: e.target.value }))
                  }
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={
                !addParty.partyRelationType ||
                !addParty.hubspotCompanyId ||
                addPartyMutation.isPending
              }
              onClick={() => addPartyMutation.mutate(addParty)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Party
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
