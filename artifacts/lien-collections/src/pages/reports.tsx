/**
 * reports.tsx — Exposure Dashboard + Lien Timeline + Lapsed Rights (Phase 6, P7).
 *
 * Routes:
 *   /reports          — Exposure Dashboard + Lapsed Rights
 *   /reports/:projectId/timeline — per-project lien timeline
 */

import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  FileText,
  ChevronRight,
  Clock,
} from "lucide-react";
import { alpha, money } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface ExposureRow {
  streamId: string;
  lienProjectId: string;
  projectName: string | null;
  county: string | null;
  workStream: string;
  streamStatus: string;
  openedAt: string;
  overdueMonths: number;
  grossExposure: number;
  waivedAmount: number;
  netExposure: number;
  filing: {
    id?: string;
    status: string;
    filingDate?: string | null;
    postFilingNoticeDeadline?: string | null;
    enforcementDeadline?: string | null;
  } | null;
}

interface LapsedRow {
  streamId: string;
  lienProjectId: string | null;
  projectName: string | null;
  county: string | null;
  workStream: string | null;
  streamStatus: string;
  earliestMissedDeadline: string | null;
  missedDeadlineCount: number;
}

interface TimelineEvent {
  eventType: string;
  date: string;
  label: string;
  streamId?: string;
  workStream?: string;
  entityId: string;
  meta?: Record<string, unknown>;
}

// ── API helpers ────────────────────────────────────────────────────────────

function apiFetch<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include" }).then((r) => r.json());
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(d: string | null | undefined): string {
  if (!d) return "";
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d past`;
  if (diff === 0) return "today";
  return `${diff}d`;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  stream_opened: "#5c6070",
  work_month: "#3b82f6",
  deadline_notice: "#f59e0b",
  deadline_filing: "#eb143f",
  deadline_enforcement: "#eb143f",
  deadline_post_filing_notice: "#f59e0b",
  deadline_retainage: "#8b5cf6",
  notice_sent: "#14eba3",
  notice_delivered: "#14eba3",
  notice_draft: "#5c6070",
  notice_approved: "#3b82f6",
  waiver_approved: "#14eba3",
  waiver_pending_pm: "#f59e0b",
  filing_filed: "#14eba3",
  filing_affidavit_draft: "#3b82f6",
  release_signed: "#14eba3",
  release_filed: "#14eba3",
};

function eventColor(eventType: string): string {
  for (const [prefix, color] of Object.entries(EVENT_TYPE_COLORS)) {
    if (eventType.startsWith(prefix)) return color;
  }
  return "#5c6070";
}

// ── Timeline view ──────────────────────────────────────────────────────────

function TimelinePage() {
  const [, params] = useRoute("/reports/:projectId/timeline");
  const projectId = params?.projectId ?? "";

  useRightPanel(null, []);

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", projectId],
    queryFn: () =>
      apiFetch<{
        project: {
          id: string;
          cachedProjectName: string | null;
          county: string | null;
          legalPropertyAddress: string | null;
        };
        streams: Array<{ id: string; workStream: string; status: string }>;
        events: TimelineEvent[];
      }>(`/reports/timeline/${projectId}`),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px]" style={{ color: "var(--text-dim)" }}>
        Loading timeline…
      </div>
    );
  }

  if (!data?.project) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px]" style={{ color: "var(--text-dim)" }}>
        Project not found.
      </div>
    );
  }

  const { project, streams, events } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold" style={{ color: "var(--text-base)" }}>
              {project.cachedProjectName ?? "Unknown Project"} — Full Lien Timeline
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-dim)" }}>
              {project.legalPropertyAddress}
              {project.county ? ` · ${project.county} County` : ""}
            </div>
          </div>
          <Link href="/reports">
            <a className="text-[12px] font-medium" style={{ color: "var(--text-dim)" }}>
              ← Back to reports
            </a>
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {streams.map((s) => (
            <StatusBadge key={s.id} status={`${s.workStream}: ${s.status}`} />
          ))}
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[13px]" style={{ color: "var(--text-dim)" }}>
          No timeline events found.
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {events.map((ev, i) => {
            const color = eventColor(ev.eventType);
            return (
              <div key={`${ev.entityId}-${i}`} className="flex gap-3 py-2">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full mt-1"
                    style={{ background: color }}
                  />
                  {i < events.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ background: "var(--helm-border)", minHeight: 16 }}
                    />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[10.5px] font-mono"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {fmtDate(ev.date)}
                    </span>
                    {ev.workStream && (
                      <span
                        className="rounded-sm px-1.5 py-0 text-[10px] font-semibold"
                        style={{ background: alpha("#5c6070", 0.15), color: "#5c6070" }}
                      >
                        {ev.workStream}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px]" style={{ color: "var(--text-base)" }}>
                    {ev.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Exposure Dashboard ─────────────────────────────────────────────────────

export default function ReportsPage() {
  const [, timelineMatch] = useRoute("/reports/:projectId/timeline");

  // Delegate to timeline sub-view if route matches
  if (timelineMatch) {
    return <TimelinePage />;
  }

  return <ExposureDashboard />;
}

function ExposureDashboard() {
  const [activeTab, setActiveTab] = useState<"exposure" | "lapsed">("exposure");

  const exposureQ = useQuery({
    queryKey: ["reports-exposure"],
    queryFn: () => apiFetch<{ rows: ExposureRow[] }>("/reports/exposure"),
  });

  const lapsedQ = useQuery({
    queryKey: ["reports-lapsed"],
    queryFn: () => apiFetch<{ rows: LapsedRow[] }>("/reports/lapsed"),
  });

  const exposureRows = exposureQ.data?.rows ?? [];
  const lapsedRows = lapsedQ.data?.rows ?? [];

  const totalNet = exposureRows.reduce((s, r) => s + r.netExposure, 0);
  const totalGross = exposureRows.reduce((s, r) => s + r.grossExposure, 0);
  const filedCount = exposureRows.filter((r) => r.filing?.status === "filed" || r.filing?.status === "post_filing_notice_sent").length;

  useRightPanel(
    <Panel title="Exposure Summary" accent="#eb143f" count={exposureRows.length}>
      <QueueList
        items={exposureRows.slice(0, 8).map((r) => ({
          id: r.streamId,
          title: r.projectName ?? r.streamId.slice(0, 8),
          sub: `Net: ${money(r.netExposure)} · ${r.streamStatus.replace(/_/g, " ")}`,
        }))}
      />
    </Panel>,
    [exposureRows.length],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open streams", value: exposureRows.length.toString(), accent: "#3b82f6" },
          { label: "Gross exposure", value: money(totalGross), accent: "#f59e0b" },
          { label: "Net exposure", value: money(totalNet), accent: "#eb143f" },
          { label: "Filed liens", value: filedCount.toString(), accent: "#14eba3" },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 rounded-lg border p-3"
            style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
          >
            <div
              className="text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              {label}
            </div>
            <div
              className="text-[18px] font-bold"
              style={{ color: accent }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        {(["exposure", "lapsed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-md py-2 text-[12.5px] font-semibold transition-colors"
            style={{
              background: activeTab === tab ? "var(--surface-raised)" : "transparent",
              color: activeTab === tab ? "var(--text-base)" : "var(--text-dim)",
            }}
          >
            {tab === "exposure" ? "Open Exposure" : `Lapsed Rights${lapsedRows.length > 0 ? ` (${lapsedRows.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* Exposure table */}
      {activeTab === "exposure" && (
        <div className="flex flex-col gap-3">
          {exposureQ.isLoading && (
            <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-dim)" }}>
              Loading exposure data…
            </div>
          )}
          {exposureRows.length === 0 && !exposureQ.isLoading && (
            <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-dim)" }}>
              No open lien exposure found.
            </div>
          )}
          {exposureRows.map((row) => (
            <div
              key={row.streamId}
              className="rounded-lg border p-4"
              style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[13.5px] font-semibold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {row.projectName ?? "Unknown Project"}
                    </span>
                    <StatusBadge status={row.workStream} />
                    <StatusBadge status={row.streamStatus} />
                  </div>
                  <div className="mt-0.5 text-[12px]" style={{ color: "var(--text-dim)" }}>
                    {row.county ? `${row.county} County` : "—"}
                    {row.overdueMonths > 0
                      ? ` · ${row.overdueMonths} overdue month${row.overdueMonths !== 1 ? "s" : ""}`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div
                      className="text-[10.5px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Net exposure
                    </div>
                    <div
                      className="text-[15px] font-bold"
                      style={{ color: row.netExposure > 0 ? "#eb143f" : "#14eba3" }}
                    >
                      {money(row.netExposure)}
                    </div>
                  </div>
                  <Link href={`/reports/${row.lienProjectId}/timeline`}>
                    <a className="rounded-md p-1.5" style={{ color: "var(--text-dim)" }}>
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </Link>
                </div>
              </div>

              {/* Filing deadlines if filed */}
              {row.filing && (
                <div
                  className="mt-3 flex flex-wrap gap-3 rounded-md border px-3 py-2"
                  style={{
                    background: alpha("#14eba3", 0.05),
                    borderColor: alpha("#14eba3", 0.2),
                  }}
                >
                  <div className="text-[11.5px]" style={{ color: "var(--text-dim)" }}>
                    Filing:{" "}
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {row.filing.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {row.filing.postFilingNoticeDeadline && (
                    <div className="text-[11.5px]" style={{ color: "var(--text-dim)" }}>
                      Post-notice:{" "}
                      <span style={{ color: "#f59e0b" }}>
                        {fmtDate(row.filing.postFilingNoticeDeadline)}{" "}
                        ({daysUntil(row.filing.postFilingNoticeDeadline)})
                      </span>
                    </div>
                  )}
                  {row.filing.enforcementDeadline && (
                    <div className="text-[11.5px]" style={{ color: "var(--text-dim)" }}>
                      Enforcement:{" "}
                      <span style={{ color: "#eb143f" }}>
                        {fmtDate(row.filing.enforcementDeadline)}{" "}
                        ({daysUntil(row.filing.enforcementDeadline)})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline link */}
              <div className="mt-2 flex justify-end">
                <Link href={`/reports/${row.lienProjectId}/timeline`}>
                  <a
                    className="text-[11.5px] font-medium"
                    style={{ color: "var(--text-dim)" }}
                  >
                    View full timeline →
                  </a>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lapsed rights table */}
      {activeTab === "lapsed" && (
        <div className="flex flex-col gap-3">
          {lapsedQ.isLoading && (
            <div className="py-10 text-center text-[13px]" style={{ color: "var(--text-dim)" }}>
              Loading lapsed-rights data…
            </div>
          )}
          {lapsedRows.length === 0 && !lapsedQ.isLoading && (
            <div
              className="flex items-center gap-3 rounded-lg border px-4 py-5"
              style={{
                background: alpha("#14eba3", 0.05),
                borderColor: alpha("#14eba3", 0.2),
              }}
            >
              <ShieldAlert className="h-5 w-5 shrink-0" style={{ color: "#14eba3" }} />
              <div className="text-[13px]" style={{ color: "var(--text-dim)" }}>
                No lapsed lien rights detected. All statutory deadlines appear to have been met.
              </div>
            </div>
          )}
          {lapsedRows.map((row) => (
            <div
              key={row.streamId}
              className="rounded-lg border p-4"
              style={{
                background: "var(--surface)",
                borderColor: alpha("#eb143f", 0.4),
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="h-5 w-5 shrink-0 mt-0.5"
                  style={{ color: "#eb143f" }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[13.5px] font-semibold"
                      style={{ color: "var(--text-base)" }}
                    >
                      {row.projectName ?? "Unknown Project"}
                    </span>
                    {row.workStream && <StatusBadge status={row.workStream} />}
                  </div>
                  <div
                    className="mt-0.5 text-[12px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {row.county ? `${row.county} County` : "—"}
                    {row.earliestMissedDeadline
                      ? ` · Filing deadline missed ${fmtDate(row.earliestMissedDeadline)}`
                      : ""}
                    {row.missedDeadlineCount > 1
                      ? ` · ${row.missedDeadlineCount} missed deadlines`
                      : ""}
                  </div>
                  <div
                    className="mt-2 inline-flex rounded-sm px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: alpha("#eb143f", 0.12), color: "#eb143f" }}
                  >
                    LIEN RIGHTS FORFEITED
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
