import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { money } from "@/lib/utils";

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then((r) => r.json());
}

function apiPost(path: string, body?: unknown) {
  return fetch(`/api${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());
}

// ── Types ──────────────────────────────────────────────────────────────────

interface NoticeRow {
  id: string;
  type: string;
  status: string;
  claimAmount: string;
}

interface ReportRow {
  deadlineId: string;
  projectId: string;
  projectName: string;
  streamId: string;
  workStream: string;
  contractorTier: string;
  lienWorkflowType: string;
  workMonthId: string;
  workMonth: string;
  derivedOverdue: boolean;
  clearedFlag: boolean;
  noticeDeadline: string;
  supplierRisk: boolean;
  streamStatus: string;
  notice: NoticeRow | null;
}

interface ReportData {
  month: string;
  rows: ReportRow[];
}

interface SupplierRisk {
  id: string;
  projectName: string;
  streamId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

function fmtMonth(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MonthlyReportPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<ReportData>({
    queryKey: ["monthly-report"],
    queryFn: () => apiFetch<ReportData>("/monthly/report"),
    retry: false,
    staleTime: 30_000,
  });

  const runMutation = useMutation({
    mutationFn: () => apiPost("/monthly/run"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly-report"] }),
  });

  const rows = data?.rows ?? [];
  const supplierRisks: SupplierRisk[] = rows
    .filter((r) => r.supplierRisk)
    .map((r) => ({ id: r.streamId, projectName: r.projectName, streamId: r.streamId }));

  useRightPanel(
    <Panel
      title="Supplier Risk"
      accent="#f59f0a"
      count={supplierRisks.length}
    >
      <QueueList
        items={
          supplierRisks.length > 0
            ? supplierRisks.map((r) => ({
                id: r.streamId,
                title: r.projectName,
                sub: "Supplier deadline ≤ Beacon deadline",
              }))
            : [{ id: "none", title: "No supplier risk flags", sub: "All sub-subs current" }]
        }
      />
    </Panel>,
    [supplierRisks.length],
  );

  // ── Table columns ────────────────────────────────────────────────────────

  const columns = [
    {
      key: "projectName",
      header: "Client / Project",
      render: (r: ReportRow) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold" style={{ color: "var(--text-base)" }}>
            {r.projectName}
          </div>
          <div className="truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>
            {r.workStream} stream
          </div>
        </div>
      ),
    },
    {
      key: "contractorTier",
      header: "Tier",
      render: (r: ReportRow) => (
        <span className="font-mono text-[11px]" style={{ color: "var(--text-dim)" }}>
          {r.contractorTier === "second_tier" ? "T2" : "T1"}
        </span>
      ),
    },
    {
      key: "claimAmount",
      header: "Amount",
      align: "right" as const,
      render: (r: ReportRow) => (
        <span className="font-mono text-[13px]" style={{ color: "var(--text-base)" }}>
          {r.notice ? money(Number(r.notice.claimAmount)) : "—"}
        </span>
      ),
    },
    {
      key: "noticeDeadline",
      header: "Notice deadline",
      render: (r: ReportRow) => (
        <div className="flex items-center gap-1.5">
          <DeadlineCountdown days={daysUntil(r.noticeDeadline)} />
          {r.supplierRisk && <AlertTriangle className="h-3.5 w-3.5 text-[#f59f0a]" />}
        </div>
      ),
    },
    {
      key: "streamStatus",
      header: "Status",
      align: "right" as const,
      render: (r: ReportRow) => (
        <StatusBadge status={r.notice?.status ?? r.streamStatus} />
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div
        className="rounded-lg border px-4 py-8 text-center text-[12px]"
        style={{
          background: "var(--surface)",
          borderColor: "var(--helm-border)",
          color: "var(--text-muted-color)",
        }}
      >
        Unable to load monthly report. Visit{" "}
        <a href="/api/dev/session" className="underline">
          /api/dev/session
        </a>{" "}
        first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="text-[13px]" style={{ color: "var(--text-dim)" }}>
          {data?.month ? (
            <>
              Notice deadlines for{" "}
              <span style={{ color: "var(--text-base)" }}>{fmtMonth(data.month + "-01")}</span>
            </>
          ) : isLoading ? (
            "Loading…"
          ) : (
            "No active notice deadlines this month"
          )}
        </div>
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--helm-border)",
            color: "var(--text-base)",
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${runMutation.isPending ? "animate-spin" : ""}`} />
          Run monthly engine
        </button>
      </div>

      {/* Run result */}
      {runMutation.data && (
        <div
          className="rounded-md border px-4 py-2.5 text-[12px]"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--helm-border)",
            color: "var(--text-dim)",
          }}
        >
          Month {runMutation.data.month}: {runMutation.data.created} notices created,{" "}
          {runMutation.data.skipped} skipped, {runMutation.data.supplierRisksFlagged} supplier
          risks flagged.
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div
          className="rounded-lg border px-4 py-10 text-center text-[12px]"
          style={{
            background: "var(--surface)",
            borderColor: "var(--helm-border)",
            color: "var(--text-muted-color)",
          }}
        >
          Loading monthly report…
        </div>
      ) : rows.length === 0 ? (
        <div
          className="rounded-lg border px-4 py-8 text-center text-[12px]"
          style={{
            background: "var(--surface)",
            borderColor: "var(--helm-border)",
            color: "var(--text-muted-color)",
          }}
        >
          No notice deadlines this month. Click "Run monthly engine" to check for at-risk projects.
        </div>
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={rows}
          gridTemplate="1.4fr .5fr .9fr 1fr .9fr"
          onRowClick={(r: ReportRow) => {
            window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/projects/${r.projectId}`;
          }}
        />
      )}
    </div>
  );
}
