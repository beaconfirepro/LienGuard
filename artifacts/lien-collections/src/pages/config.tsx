import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/primitives/Screen";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Plus, CheckCircle2, Clock, ShieldAlert, Building2, Layers, Layout, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Plain-language lien workflow type labels (L04)
// ---------------------------------------------------------------------------

const WORKFLOW_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  commercial_sub: {
    label: "Commercial Sub",
    description: "Beacon is sub-contractor on a commercial job — primary Beacon case",
  },
  residential_sub: {
    label: "Residential Sub",
    description: "Beacon is sub-contractor; GC has direct agreement with owner-occupant",
  },
  public_bond: {
    label: "Public / Bond",
    description: "Public project — handled outside the lien system via payment bond claims",
  },
  none: {
    label: "No Lien Tracking",
    description: "Lien tracking is not applicable for this type",
  },
};

const CLOCK_TRIGGER_LABELS: Record<string, { label: string; description: string }> = {
  none: { label: "None", description: "Stage does not start any lien clock" },
  design_start: { label: "Design Start", description: "Starts the design-stream lien clock" },
  field_work_start: {
    label: "Field Work Start",
    description: "Starts the construction-stream lien clock",
  },
};

const RULE_KIND_LABELS: Record<string, string> = {
  notice: "Pre-Lien Notice",
  filing: "Lien Filing",
  retainage: "Retainage Notice",
  post_filing_notice: "Post-Filing Notice",
  enforcement: "Enforcement",
  release: "Release",
};

// ---------------------------------------------------------------------------
// Fetch helpers (use session cookie — no auth header needed for web)
// ---------------------------------------------------------------------------

/**
 * Return the API server base URL.
 * The Replit proxy routes /api/* → API server (port 8080), stripping the /api prefix.
 */
function getApiBase(): string {
  return "/api";
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiBase = getApiBase().replace(/\/$/, "");
  const res = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubSystemType {
  id: string;
  name: string;
  systemTypeId: string;
  lienWorkflowType: string;
}

interface SystemType {
  id: string;
  name: string;
  departmentId: string;
  subSystemTypes: SubSystemType[];
}

interface Department {
  id: string;
  name: string;
  systemTypes: SystemType[];
}

interface StageTrigger {
  id: string;
  hubspotStageKey: string;
  label: string;
  lienClockTrigger: string;
}

interface LienRule {
  id: string;
  ruleKind: string;
  lienWorkflowType: string;
  workStream: string;
  anchor: string;
  offsetMonths?: number;
  offsetDayOfMonth?: number;
  offsetDays?: number;
  offsetIsBusinessDays: boolean;
  statuteCitation: string;
  description: string;
}

interface LienRuleSet {
  id: string;
  version: string;
  effectiveDate: string;
  statuteRef: string;
  legalReviewed: boolean;
  rules?: LienRule[];
}

interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  active: boolean;
  ruleSets: LienRuleSet[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorkflowTypeBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    commercial_sub: "bg-blue-100 text-blue-800",
    residential_sub: "bg-green-100 text-green-800",
    public_bond: "bg-purple-100 text-purple-800",
    none: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[value] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {WORKFLOW_TYPE_LABELS[value]?.label ?? value}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Reference Tree
// ---------------------------------------------------------------------------

function ReferenceTreeTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["config-departments"],
    queryFn: () => apiFetch<{ departments: Department[] }>("/config/departments"),
    retry: false,
  });

  const [newDeptName, setNewDeptName] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const addDept = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/config/departments", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-departments"] });
      setNewDeptName("");
      toast({ title: "Department added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading reference tree…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {(error as Error)?.message?.includes("401")
          ? "Not authenticated — visit /api/dev/session to establish a dev session."
          : `Failed to load reference tree: ${(error as Error)?.message}`}
      </div>
    );
  }

  const departments = data?.departments ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Building2}
        title="Department → System Type → Sub-System Type"
        subtitle="Each Sub-System Type must declare its lien workflow — this determines which statutory rules apply."
      />

      {departments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No departments configured. Add one below.
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <div key={dept.id} className="rounded-lg border bg-card">
              <button
                type="button"
                onClick={() => toggleExpand(dept.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{dept.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {dept.systemTypes.length} type{dept.systemTypes.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    expanded.has(dept.id) && "rotate-90",
                  )}
                />
              </button>

              {expanded.has(dept.id) && (
                <div className="border-t px-4 pb-3">
                  {dept.systemTypes.length === 0 ? (
                    <p className="py-2 text-xs text-muted-foreground">No system types yet.</p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {dept.systemTypes.map((st) => (
                        <div key={st.id} className="pl-4 border-l-2 border-muted">
                          <div className="flex items-center gap-2 py-1">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{st.name}</span>
                          </div>
                          {st.subSystemTypes.length > 0 && (
                            <div className="ml-4 mt-1 space-y-1">
                              {st.subSystemTypes.map((sst) => (
                                <div key={sst.id} className="flex items-center gap-2 py-0.5">
                                  <Layout className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-foreground">{sst.name}</span>
                                  <WorkflowTypeBadge value={sst.lienWorkflowType} />
                                  <span className="text-xs text-muted-foreground">
                                    — {WORKFLOW_TYPE_LABELS[sst.lienWorkflowType]?.description}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Add Department
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Fire Protection"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === "Enter" && newDeptName.trim() && addDept.mutate(newDeptName.trim())}
          />
          <Button
            size="sm"
            onClick={() => addDept.mutate(newDeptName.trim())}
            disabled={!newDeptName.trim() || addDept.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          System types and sub-system types can be added via the API or will be expanded in the UI in Phase 2.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Stage Triggers
// ---------------------------------------------------------------------------

function StageTriggersTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["config-stage-triggers"],
    queryFn: () => apiFetch<{ stageTriggers: StageTrigger[] }>("/config/stage-triggers"),
    retry: false,
  });

  const [form, setForm] = React.useState({ hubspotStageKey: "", label: "", lienClockTrigger: "" });

  const addTrigger = useMutation({
    mutationFn: (body: typeof form) =>
      apiFetch("/config/stage-triggers", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-stage-triggers"] });
      setForm({ hubspotStageKey: "", label: "", lienClockTrigger: "" });
      toast({ title: "Stage trigger added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const triggers = data?.stageTriggers ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={GitBranch}
        title="HubSpot Stage → Lien Clock Trigger"
        subtitle="Maps each HubSpot deal/project stage to the lien clock it starts. A stage with 'none' does not affect lien tracking."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Failed to load stage triggers — check session auth.
        </div>
      ) : triggers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No stage triggers configured.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">HubSpot Stage Key</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Label</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Lien Clock Trigger</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Effect</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((t, i) => (
                <tr key={t.id} className={cn("border-b last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="px-4 py-2.5 font-mono text-xs">{t.hubspotStageKey}</td>
                  <td className="px-4 py-2.5">{t.label}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        t.lienClockTrigger === "none"
                          ? "bg-gray-100 text-gray-600"
                          : t.lienClockTrigger === "field_work_start"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800",
                      )}
                    >
                      {CLOCK_TRIGGER_LABELS[t.lienClockTrigger]?.label ?? t.lienClockTrigger}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {CLOCK_TRIGGER_LABELS[t.lienClockTrigger]?.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Separator />

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Add Stage Trigger
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">HubSpot Stage Key</Label>
            <Input
              placeholder="e.g. install"
              value={form.hubspotStageKey}
              onChange={(e) => setForm((f) => ({ ...f, hubspotStageKey: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Display Label</Label>
            <Input
              placeholder="e.g. Field Work Start"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lien Clock Trigger</Label>
            <Select
              value={form.lienClockTrigger}
              onValueChange={(v) => setForm((f) => ({ ...f, lienClockTrigger: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trigger…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLOCK_TRIGGER_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => addTrigger.mutate(form)}
          disabled={
            !form.hubspotStageKey.trim() ||
            !form.label.trim() ||
            !form.lienClockTrigger ||
            addTrigger.isPending
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Trigger
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Jurisdiction Rules
// ---------------------------------------------------------------------------

function JurisdictionRulesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["config-jurisdictions"],
    retry: false,
    queryFn: async () => {
      const base = await apiFetch<{ jurisdictions: Jurisdiction[] }>("/config/jurisdictions");
      const jurisdictions = await Promise.all(
        base.jurisdictions.map(async (j) => {
          const ruleSets = await Promise.all(
            j.ruleSets.map(async (rs) => {
              const rulesData = await apiFetch<{ rules?: LienRule[] }>(
                `/config/rule-sets/${rs.id}/rules`,
              ).catch(() => ({ rules: [] }));
              return { ...rs, rules: rulesData.rules ?? [] };
            }),
          );
          return { ...j, ruleSets };
        }),
      );
      return { jurisdictions };
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (ruleSetId: string) =>
      apiFetch(`/config/rule-sets/${ruleSetId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ legalReviewed: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config-jurisdictions"] });
      toast({ title: "Rule set marked as legally reviewed" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const jurisdictions = data?.jurisdictions ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading jurisdiction data…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Failed to load jurisdiction rules — check session auth.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={ShieldAlert}
        title="Jurisdiction Rule Sets"
        subtitle="Statutory rules derived from Texas Property Code Ch. 53 (and future states). Read-only. Requires legal review before production use."
      />

      {jurisdictions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No jurisdictions configured.
        </div>
      ) : (
        jurisdictions.map((jur) => (
          <div key={jur.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">{jur.name}</h3>
              <Badge variant="outline" className="font-mono text-xs">
                {jur.code}
              </Badge>
              {jur.active ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>

            {jur.ruleSets.map((rs) => (
              <Card key={rs.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-sm font-semibold">{rs.version}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {rs.statuteRef} · Effective{" "}
                        {new Date(rs.effectiveDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {rs.legalReviewed ? (
                        <div className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Legally Reviewed
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                            <Clock className="h-4 w-4" />
                            Pending Review
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => reviewMutation.mutate(rs.id)}
                            disabled={reviewMutation.isPending}
                          >
                            Mark Reviewed
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {rs.rules && rs.rules.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rule</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Workflow</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Stream</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Deadline Expression</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Citation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rs.rules.map((rule, i) => {
                            const parts: string[] = [];
                            if (rule.offsetMonths != null)
                              parts.push(`+${rule.offsetMonths} mo`);
                            if (rule.offsetDayOfMonth != null)
                              parts.push(`day ${rule.offsetDayOfMonth}`);
                            if (rule.offsetDays != null)
                              parts.push(
                                `+${rule.offsetDays}${rule.offsetIsBusinessDays ? " biz" : ""} days`,
                              );
                            const expr = `From ${rule.anchor}: ${parts.join(", ") || "—"}`;

                            return (
                              <tr
                                key={rule.id}
                                className={cn(
                                  "border-b last:border-0",
                                  i % 2 === 0 ? "bg-background" : "bg-muted/20",
                                )}
                              >
                                <td className="px-3 py-2">
                                  <div className="font-medium text-foreground">
                                    {RULE_KIND_LABELS[rule.ruleKind] ?? rule.ruleKind}
                                  </div>
                                  <div className="text-muted-foreground">{rule.description}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <WorkflowTypeBadge value={rule.lienWorkflowType} />
                                </td>
                                <td className="px-3 py-2 capitalize">{rule.workStream}</td>
                                <td className="px-3 py-2 font-mono text-muted-foreground">{expr}</td>
                                <td className="px-3 py-2 font-mono">{rule.statuteCitation}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {!rs.legalReviewed && (
                      <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        This rule set has not been legally reviewed. Do not use in production until reviewed.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function ConfigPage() {
  return (
    <Screen>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reference tree, stage clock triggers, and jurisdiction rule sets for{" "}
            <span className="font-medium text-foreground">Beacon Fire Protection</span>.
          </p>
        </div>

        <Tabs defaultValue="reference">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="reference" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Reference Tree
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              Stage Triggers
            </TabsTrigger>
            <TabsTrigger value="jurisdictions" className="gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Jurisdiction Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reference" className="mt-6">
            <ReferenceTreeTab />
          </TabsContent>

          <TabsContent value="triggers" className="mt-6">
            <StageTriggersTab />
          </TabsContent>

          <TabsContent value="jurisdictions" className="mt-6">
            <JurisdictionRulesTab />
          </TabsContent>
        </Tabs>
      </div>
    </Screen>
  );
}
