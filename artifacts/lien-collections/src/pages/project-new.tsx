import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Screen } from "@/components/primitives/Screen";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";

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
}

interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  active: boolean;
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectNewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = React.useState({
    hubspotProjectId: "",
    subSystemTypeId: "",
    jurisdictionId: "",
    contractorTier: "first_tier",
  });

  const { data: sysTypesData } = useQuery({
    queryKey: ["config-system-types"],
    queryFn: () => apiFetch<{ systemTypes: SystemType[] }>("/config/system-types"),
    retry: false,
  });

  const { data: sstData } = useQuery({
    queryKey: ["config-sub-system-types"],
    queryFn: () => apiFetch<{ subSystemTypes: SubSystemType[] }>("/config/sub-system-types"),
    retry: false,
  });

  const { data: jurData } = useQuery({
    queryKey: ["config-jurisdictions"],
    queryFn: () => apiFetch<{ jurisdictions: Jurisdiction[] }>("/config/jurisdictions"),
    retry: false,
  });

  const subSystemTypes = sstData?.subSystemTypes ?? [];
  const jurisdictions = (jurData?.jurisdictions ?? []).filter((j) => j.active);

  const createProject = useMutation({
    mutationFn: (body: object) =>
      apiFetch<{ project: { id: string } }>("/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      toast({ title: "Project created" });
      setLocation(`/projects/${res.project.id}`);
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Find the selected SST to show its workflow type
  const selectedSst = subSystemTypes.find((s) => s.id === form.subSystemTypeId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hubspotProjectId.trim()) {
      toast({ title: "HubSpot Project ID is required", variant: "destructive" });
      return;
    }
    if (!form.subSystemTypeId) {
      toast({ title: "Sub-system type is required", variant: "destructive" });
      return;
    }
    const payload: Record<string, string> = {
      hubspotProjectId: form.hubspotProjectId.trim(),
      subSystemTypeId: form.subSystemTypeId,
      contractorTier: form.contractorTier,
    };
    if (form.jurisdictionId) {
      payload.jurisdictionId = form.jurisdictionId;
    }
    createProject.mutate(payload);
  }

  return (
    <Screen>
      <div className="max-w-lg space-y-6">
        {/* Back nav */}
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>

        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Lien Project</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a lien tracking project from a HubSpot project record.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* HubSpot Project ID */}
          <div className="space-y-1.5">
            <Label>HubSpot Project ID</Label>
            <Input
              placeholder="e.g. hs_proj_900"
              value={form.hubspotProjectId}
              onChange={(e) => setForm((f) => ({ ...f, hubspotProjectId: e.target.value }))}
              className="h-9 text-sm"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The Deal ID from HubSpot CRM. Project name and status will be pulled automatically.
            </p>
          </div>

          {/* Sub-system type */}
          <div className="space-y-1.5">
            <Label>Sub-system Type</Label>
            <Select
              value={form.subSystemTypeId}
              onValueChange={(v) => setForm((f) => ({ ...f, subSystemTypeId: v }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select sub-system type…" />
              </SelectTrigger>
              <SelectContent>
                {subSystemTypes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span>{s.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      — {WORKFLOW_LABELS[s.lienWorkflowType] ?? s.lienWorkflowType}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSst && (
              <p className="text-xs text-muted-foreground">
                Lien workflow:{" "}
                <strong>{WORKFLOW_LABELS[selectedSst.lienWorkflowType] ?? selectedSst.lienWorkflowType}</strong>
              </p>
            )}
          </div>

          {/* Contractor tier */}
          <div className="space-y-1.5">
            <Label>Contractor Tier</Label>
            <Select
              value={form.contractorTier}
              onValueChange={(v) => setForm((f) => ({ ...f, contractorTier: v }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_tier">1st Tier — contracted directly with GC</SelectItem>
                <SelectItem value="second_tier">2nd Tier — contracted with a sub</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jurisdiction (optional) */}
          <div className="space-y-1.5">
            <Label>
              Jurisdiction{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (optional — defaults to your org's primary jurisdiction)
              </span>
            </Label>
            <Select
              value={form.jurisdictionId}
              onValueChange={(v) => setForm((f) => ({ ...f, jurisdictionId: v }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Default jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Default jurisdiction</SelectItem>
                {jurisdictions.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name} ({j.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={createProject.isPending} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" />
            {createProject.isPending ? "Creating…" : "Create Project"}
          </Button>
        </form>
      </div>
    </Screen>
  );
}
