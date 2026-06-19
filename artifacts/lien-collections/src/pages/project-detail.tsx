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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  GitBranch,
  Info,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  Building2,
  XCircle,
  Receipt,
  Link as LinkIcon,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { Panel, useLeftPanel } from "@/components/nav/AppShell";

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
  completionDate: string | null;
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

interface Deadline {
  id: string;
  ruleId: string;
  ruleKind: string;
  computedDate: string;
  adjustedDate: string;
  satisfiedAt: string | null;
  sourceData: Record<string, unknown>;
  rule?: {
    statuteCitation: string;
    description: string;
    ruleKind: string;
  } | null;
}

interface WorkMonth {
  id: string;
  month: string;
  derivedOverdue: boolean;
  clearedFlag: boolean;
  invoiceLinkId: string | null;
  deadlines: Deadline[];
}

interface StreamWithWorkMonths {
  stream: LienStream;
  workMonths: WorkMonth[];
  summary?: { workMonthsProcessed: number; deadlinesComputed: number };
}

interface Invoice {
  id: string;
  qboInvoiceId: string | null;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  qboStatus: string;
  clearedFlag: boolean;
  clearedAt: string | null;
  isSupplierInvoice: boolean;
}

interface StreamNotice {
  id: string;
  status: "draft" | "approved" | "sent" | "delivered";
  noticeType: string;
  workMonthId: string | null;
  claimAmount: string;
  monthListed: string;
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
    if (res.status === 204) return undefined as unknown as T;
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

const RULE_KIND_LABELS: Record<string, string> = {
  notice: "Pre-Lien Notice",
  filing: "Lien Filing",
  retainage: "Retainage Notice",
  post_filing_notice: "Post-Filing Notice",
  enforcement: "Enforcement Deadline",
  release: "Release",
};

const RULE_KIND_COLORS: Record<string, string> = {
  notice: "bg-amber-50 border-amber-200 text-amber-800",
  filing: "bg-red-50 border-red-200 text-red-800",
  retainage: "bg-orange-50 border-orange-200 text-orange-700",
  post_filing_notice: "bg-purple-50 border-purple-200 text-purple-800",
  enforcement: "bg-red-100 border-red-300 text-red-900",
  release: "bg-green-50 border-green-200 text-green-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function deadlineUrgency(adjustedDate: string): "overdue" | "urgent" | "upcoming" | "future" {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dl = new Date(adjustedDate);
  dl.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "urgent";
  if (diffDays <= 30) return "upcoming";
  return "future";
}

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
// Notice status badge + countdown — inline per work month
// ---------------------------------------------------------------------------

const NOTICE_STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-700 border-gray-300",
  approved:  "bg-blue-100 text-blue-700 border-blue-300",
  sent:      "bg-amber-100 text-amber-700 border-amber-300",
  delivered: "bg-green-100 text-green-700 border-green-300",
};

const NOTICE_STATUS_LABELS: Record<string, string> = {
  draft:     "Draft",
  approved:  "Approved",
  sent:      "Sent",
  delivered: "Delivered",
};

function NoticeBadge({
  notice,
  onNavigate,
}: {
  notice: StreamNotice;
  onNavigate: () => void;
}) {
  const styleClass = NOTICE_STATUS_STYLES[notice.status] ?? "bg-gray-100 text-gray-700 border-gray-300";
  const label = NOTICE_STATUS_LABELS[notice.status] ?? notice.status;

  return (
    <button
      type="button"
      title="Open in Send Queue"
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer",
        styleClass,
      )}
    >
      <Bell className="h-3 w-3" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Deadline countdown helper — days until the earliest open notice deadline
// ---------------------------------------------------------------------------

function earliestNoticeDays(deadlines: Deadline[]): number | null {
  const open = deadlines
    .filter((dl) => !dl.satisfiedAt && (dl.ruleKind === "notice" || dl.ruleKind === "retainage"))
    .map((dl) => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const d = new Date(dl.adjustedDate);
      d.setUTCHours(0, 0, 0, 0);
      return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    });
  if (!open.length) return null;
  return Math.min(...open);
}

// ---------------------------------------------------------------------------
// Stream deadlines panel
// ---------------------------------------------------------------------------

function StreamDeadlinesPanel({
  streamId,
  projectId,
}: {
  streamId: string;
  projectId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stream-work-months", streamId],
    queryFn: () => apiFetch<StreamWithWorkMonths>(`/streams/${streamId}/work-months`),
  });

  const { data: noticesData } = useQuery({
    queryKey: ["stream-notices", streamId],
    queryFn: () => apiFetch<{ notices: StreamNotice[] }>(`/notices?streamId=${streamId}`),
    staleTime: 30_000,
  });
  const streamNotices = noticesData?.notices ?? [];

  const recompute = useMutation({
    mutationFn: () =>
      apiFetch<StreamWithWorkMonths>(`/streams/${streamId}/recompute`, { method: "POST" }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["stream-work-months", streamId] });
      toast({
        title: "Deadlines recomputed",
        description: `${result.summary?.workMonthsProcessed ?? 0} work months, ${result.summary?.deadlinesComputed ?? 0} deadlines.`,
      });
    },
    onError: (err: Error) =>
      toast({ title: "Recompute failed", description: err.message, variant: "destructive" }),
  });

  const clearInvoice = useMutation({
    mutationFn: (invoiceId: string) =>
      apiFetch(`/invoices/${invoiceId}/clear`, {
        method: "POST",
        body: JSON.stringify({ clearedFlag: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream-work-months", streamId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Invoice marked cleared" });
    },
    onError: (err: Error) =>
      toast({ title: "Clear failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="py-3 text-xs text-muted-foreground">Loading deadlines…</div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-2 text-xs text-destructive">Could not load deadline data.</div>
    );
  }

  const { workMonths } = data;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Work Months & Deadlines
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={recompute.isPending}
          onClick={() => recompute.mutate()}
        >
          <RefreshCw className={cn("h-3 w-3", recompute.isPending && "animate-spin")} />
          Recompute
        </Button>
      </div>

      {workMonths.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">
          No work months derived yet. Click Recompute to derive from timesheets.
        </p>
      ) : (
        <div className="space-y-3">
          {workMonths.map((wm) => {
            const wmNotices = streamNotices.filter((n) => n.workMonthId === wm.id);
            const noticeDays = earliestNoticeDays(wm.deadlines);

            return (
              <div key={wm.id} className="rounded-lg border bg-card p-3 space-y-2">
                {/* Work month header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatMonth(wm.month)}</span>
                    {wm.derivedOverdue && !wm.clearedFlag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </span>
                    )}
                    {wm.clearedFlag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Cleared
                      </span>
                    )}
                    {/* Notice badges */}
                    {wmNotices.map((notice) => (
                      <NoticeBadge
                        key={notice.id}
                        notice={notice}
                        onNavigate={() => navigate(`/send-queue?notice=${notice.id}`)}
                      />
                    ))}
                    {/* Countdown for open notice deadlines when no notice exists yet */}
                    {wmNotices.length === 0 && noticeDays !== null && (
                      <DeadlineCountdown days={noticeDays} />
                    )}
                  </div>
                  {wm.invoiceLinkId && !wm.clearedFlag && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 px-2"
                      disabled={clearInvoice.isPending}
                      onClick={() => clearInvoice.mutate(wm.invoiceLinkId!)}
                    >
                      Mark Cleared
                    </Button>
                  )}
                </div>

                {/* Deadlines */}
                {wm.deadlines.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-5">
                    No deadlines computed — run Recompute above.
                  </p>
                ) : (
                  <div className="space-y-1.5 pl-1">
                    {wm.deadlines.map((dl) => {
                      const urgency = deadlineUrgency(dl.adjustedDate);
                      const isSatisfied = !!dl.satisfiedAt;

                      return (
                        <div
                          key={dl.id}
                          className={cn(
                            "rounded border px-3 py-2 flex items-start justify-between gap-3",
                            isSatisfied
                              ? "bg-gray-50 border-gray-200 opacity-60"
                              : RULE_KIND_COLORS[dl.ruleKind] ?? "bg-gray-50 border-gray-200",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold">
                                {RULE_KIND_LABELS[dl.ruleKind] ?? dl.ruleKind}
                              </span>
                              {dl.rule?.statuteCitation && (
                                <span className="text-xs opacity-70 font-mono">
                                  {dl.rule.statuteCitation}
                                </span>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs text-xs font-mono p-2">
                                    <p className="font-semibold mb-1 text-foreground not-italic">Source data</p>
                                    {Object.entries(dl.sourceData ?? {}).map(([k, v]) => (
                                      <div key={k} className="flex gap-1">
                                        <span className="text-muted-foreground w-28 shrink-0">{k}:</span>
                                        <span className="break-all">
                                          {Array.isArray(v) ? v.join(", ") : String(v)}
                                        </span>
                                      </div>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {isSatisfied && (
                                <Badge variant="outline" className="text-xs h-4 px-1 text-green-700 border-green-300">
                                  Satisfied
                                </Badge>
                              )}
                            </div>
                            {dl.rule?.description && (
                              <p className="text-xs opacity-70 mt-0.5 truncate">{dl.rule.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={cn(
                                "text-xs font-semibold tabular-nums",
                                !isSatisfied && urgency === "overdue" && "text-red-700",
                                !isSatisfied && urgency === "urgent" && "text-orange-700",
                                !isSatisfied && urgency === "upcoming" && "text-amber-700",
                                (isSatisfied || urgency === "future") && "text-muted-foreground",
                              )}
                            >
                              {formatDate(dl.adjustedDate)}
                            </div>
                            {dl.computedDate !== dl.adjustedDate && (
                              <div className="text-xs text-muted-foreground line-through">
                                {formatDate(dl.computedDate)}
                              </div>
                            )}
                            {!isSatisfied && (
                              <div
                                className={cn(
                                  "text-xs mt-0.5",
                                  urgency === "overdue" && "text-red-600 font-medium",
                                  urgency === "urgent" && "text-orange-600",
                                  urgency === "upcoming" && "text-amber-600",
                                  urgency === "future" && "text-muted-foreground",
                                )}
                              >
                                {urgency === "overdue" && "Past due"}
                                {urgency === "urgent" && "≤7 days"}
                                {urgency === "upcoming" && "≤30 days"}
                                {urgency === "future" && "Upcoming"}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoices panel
// ---------------------------------------------------------------------------

function InvoicesPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(true);

  const { data: qboStatus } = useQuery({
    queryKey: ["qbo-status"],
    queryFn: () => apiFetch<{ connected: boolean }>("/config/qbo-status"),
    staleTime: 60_000,
  });
  const connected = qboStatus?.connected ?? false;

  const { data: invoiceData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", projectId],
    queryFn: () => apiFetch<{ invoices: Invoice[] }>(`/invoices?projectId=${projectId}`),
    enabled: !!projectId,
  });
  const invoices = invoiceData?.invoices ?? [];

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ synced: number; skipped: boolean; reason?: string }>("/invoices/sync", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invoices", projectId] });
      if (result.skipped) {
        toast({
          title: "Sync skipped",
          description: result.reason ?? "QBO credentials not configured",
          variant: "default",
        });
      } else {
        toast({
          title: "Invoices synced",
          description: `${result.synced} invoice${result.synced !== 1 ? "s" : ""} pulled from QuickBooks.`,
        });
      }
    },
    onError: (err: Error) =>
      toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: ({ id, flag }: { id: string; flag: boolean }) =>
      apiFetch(`/invoices/${id}/clear`, {
        method: "POST",
        body: JSON.stringify({ clearedFlag: flag }),
      }),
    onMutate: async ({ id, flag }) => {
      await qc.cancelQueries({ queryKey: ["invoices", projectId] });
      const prev = qc.getQueryData<{ invoices: Invoice[] }>(["invoices", projectId]);
      qc.setQueryData<{ invoices: Invoice[] }>(["invoices", projectId], (old) =>
        old
          ? { invoices: old.invoices.map((inv) => inv.id === id ? { ...inv, clearedFlag: flag } : inv) }
          : old,
      );
      return { prev };
    },
    onError: (err: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["invoices", projectId], ctx.prev);
      toast({ title: "Clear failed", description: err.message, variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["invoices", projectId] }),
  });

  function invoiceRowColor(inv: Invoice): string {
    if (inv.clearedFlag) return "bg-teal-50 border-teal-200";
    if (inv.qboStatus === "paid") return "bg-green-50 border-green-200";
    if (new Date(inv.dueDate) < new Date()) return "bg-red-50 border-red-200";
    return "bg-card border-border";
  }

  function qboStatusBadge(inv: Invoice) {
    if (inv.clearedFlag) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          Cleared
        </span>
      );
    }
    if (inv.qboStatus === "paid") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          Paid
        </span>
      );
    }
    if (new Date(inv.dueDate) < new Date()) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">
        <Clock className="h-3 w-3" />
        Open
      </span>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/10">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity"
        >
          <Receipt className="h-4 w-4 text-primary" />
          Invoices (QBO)
          {invoices.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {invoices.length}
            </Badge>
          )}
        </button>

        <div className="flex items-center gap-2">
          {connected ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw className={cn("h-3 w-3", syncMutation.isPending && "animate-spin")} />
              Sync QBO
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              Not connected —{" "}
              <a href="/config" className="underline hover:text-foreground">
                add credentials in Settings
              </a>
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          {invoicesLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No invoices on record.{" "}
              {connected
                ? "Click Sync QBO to pull from QuickBooks."
                : "Connect QBO credentials to enable sync."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Cleared</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={cn("border-b last:border-0", invoiceRowColor(inv))}
                    >
                      <td className="px-3 py-2 font-mono">
                        {inv.qboInvoiceId ? `#${inv.qboInvoiceId}` : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatDate(inv.dueDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        ${Number(inv.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">{qboStatusBadge(inv)}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={inv.clearedFlag}
                          disabled={clearMutation.isPending}
                          onChange={(e) =>
                            clearMutation.mutate({ id: inv.id, flag: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 accent-teal-600 cursor-pointer"
                          title={inv.clearedFlag ? "Mark as not cleared" : "Mark as cleared"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Last Time on Job panel
// ---------------------------------------------------------------------------

interface LastTimelogEntry {
  connecteamUserId: string;
  displayName: string;
  lastWorkDate: string | null;
}

function LastTimeOnJobPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["last-timelog", projectId],
    queryFn: () =>
      apiFetch<{ employees: LastTimelogEntry[] }>(`/projects/${projectId}/last-timelog`),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const employees = data?.employees ?? [];

  function daysSince(iso: string): number {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  function freshnessColor(iso: string): string {
    const days = daysSince(iso);
    if (days <= 7) return "text-green-700";
    if (days <= 30) return "text-amber-700";
    return "text-red-700";
  }

  return (
    <div className="rounded-lg border bg-muted/10">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity"
        >
          <Clock className="h-4 w-4 text-primary" />
          Last Time on Job
          {employees.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {employees.length}
            </Badge>
          )}
        </button>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading…</p>
          ) : employees.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No timesheets synced yet. Run Recompute on a lien stream to pull from Connecteam.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Last Clock-In</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Days Ago</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.connecteamUserId} className="border-b last:border-0 bg-card">
                      <td className="px-3 py-2 font-medium">{emp.displayName}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {emp.lastWorkDate ? formatDate(emp.lastWorkDate) : "—"}
                      </td>
                      <td className={cn("px-3 py-2 tabular-nums font-medium", emp.lastWorkDate ? freshnessColor(emp.lastWorkDate) : "text-muted-foreground")}>
                        {emp.lastWorkDate ? `${daysSince(emp.lastWorkDate)}d` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

  const { data: holdsData } = useQuery({
    queryKey: ["project-holds", id],
    queryFn: () =>
      apiFetch<{ holds: { id: string; holdType: string; reason: string; setAt: string }[] }>(
        `/holds?projectId=${id}`,
      ),
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

  // New stream form state
  const [newStream, setNewStream] = React.useState({ workStream: "" });

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

  const openStream = useMutation({
    mutationFn: (body: { lienProjectId: string; workStream: string }) =>
      apiFetch("/streams/open", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      toast({ title: "Stream opened" });
      setNewStream({ workStream: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  useLeftPanel(
    <Panel title="Project">
      {data ? (
        <div className="flex flex-col gap-3 p-3">
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--text-base)" }}>
              {data.project.cachedProjectName ?? data.project.hubspotProjectId}
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {[
                { label: "County", value: data.project.county ?? "—" },
                { label: "Tier", value: data.project.contractorTier.replace(/_/g, " ") },
                { label: "Workflow", value: data.project.lienWorkflowType.replace(/_/g, " ") },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: "var(--text-muted-color)" }}>{r.label}</span>
                  <span className="text-[11.5px] font-medium capitalize" style={{ color: "var(--text-dim)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div
              className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-muted-color)" }}
            >
              Lien Streams
            </div>
            {data.streams.length > 0 ? (
              <div className="flex flex-col gap-1">
                {data.streams.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setLocation(`/filing/${s.id}`)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left hover:opacity-80"
                    style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)" }}
                  >
                    <span className="truncate text-[12px] font-medium capitalize" style={{ color: "var(--text-base)" }}>
                      {s.workStream.replace(/_/g, " ")}
                    </span>
                    <span
                      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-muted-color)" }}
                    >
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>No lien streams</div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 text-[12px]" style={{ color: "var(--text-muted-color)" }}>Loading…</div>
      )}
    </Panel>,
    [data],
  );

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

  const activeHolds = holdsData?.holds ?? [];

  function handleSaveSetup() {
    patchProject.mutate({
      contractorTier: form.contractorTier,
      legalPropertyAddress: form.legalPropertyAddress || null,
      county: form.county || null,
      contractStartDate: form.contractStartDate || null,
    });
  }

  const existingStreamTypes = new Set(streams.map((s) => s.workStream));

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
          <div className="flex items-center gap-2 flex-wrap">
            {activeHolds.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-medium">
                <Shield className="h-3.5 w-3.5" />
                {activeHolds.length} Hold{activeHolds.length !== 1 ? "s" : ""}
              </span>
            )}
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

        {/* Active holds banner */}
        {activeHolds.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600 shrink-0" />
              <span className="text-sm font-medium text-red-800">Active Holds</span>
            </div>
            {activeHolds.map((hold) => (
              <div key={hold.id} className="flex items-center gap-2 ml-6">
                <span
                  className={cn(
                    "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                    hold.holdType === "schedule_hold"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700",
                  )}
                >
                  {hold.holdType === "schedule_hold" ? "Schedule Hold" : "Material Hold"}
                </span>
                <span className="text-xs text-red-700">{hold.reason}</span>
              </div>
            ))}
          </div>
        )}

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

        {/* Lien Streams + Deadlines */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Lien Streams</h2>
          </div>

          {streams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No streams opened yet.</p>
          ) : (
            <div className="space-y-4">
              {streams.map((s) => (
                <div key={s.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  {/* Stream header */}
                  <div className="flex items-center gap-3">
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

                  {/* Deadlines sub-panel */}
                  <StreamDeadlinesPanel streamId={s.id} projectId={id!} />
                </div>
              ))}
            </div>
          )}

          {/* Open new stream */}
          {(project.lienWorkflowType !== "none") && (
            <div className="rounded-lg border border-dashed bg-muted/10 p-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Open Stream
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={newStream.workStream}
                  onValueChange={(v) => setNewStream({ workStream: v })}
                >
                  <SelectTrigger className="h-8 text-xs w-44">
                    <SelectValue placeholder="Select stream…" />
                  </SelectTrigger>
                  <SelectContent>
                    {!existingStreamTypes.has("construction") && (
                      <SelectItem value="construction">Construction</SelectItem>
                    )}
                    {!existingStreamTypes.has("design") && (
                      <SelectItem value="design">Design</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={!newStream.workStream || openStream.isPending}
                  onClick={() =>
                    openStream.mutate({ lienProjectId: id!, workStream: newStream.workStream })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Open
                </Button>
              </div>
              {existingStreamTypes.size === 2 && (
                <p className="text-xs text-muted-foreground">Both streams are already open.</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Invoices (QBO) */}
        <div className="space-y-3">
          <InvoicesPanel projectId={id!} />
        </div>

        <Separator />

        {/* Last Time on Job */}
        <div className="space-y-3">
          <LastTimeOnJobPanel projectId={id!} />
        </div>

        <Separator />

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
