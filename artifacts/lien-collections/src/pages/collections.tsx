import * as React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Phone, Plus, Check, X, RefreshCw, Filter } from "lucide-react";
import { Panel, useRightPanel } from "@/components/nav/AppShell";
import { QueueList } from "@/components/ui/queue-list";
import { AgingBuckets } from "@/components/ui/aging-buckets";
import { money, alpha } from "@/lib/utils";

function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  return fetch(`/api${path}`, { credentials: "include", ...opts }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<T>;
  });
}

interface CollectionAccount {
  id: string;
  status: string;
  escalationStage: string;
  totalOverdue: string;
  oldestOverdueDays: number;
  riskScore: number | null;
  cachedName: string | null;
  cachedEmail: string | null;
  hasOpenPromise: boolean;
  currentDunningStepId: string | null;
}

interface AgingData {
  buckets: { current: number; d1_30: number; d31_60: number; d61_90: number; d91plus: number };
  totalOverdue: number;
  invoiceCount: number;
  overdueCount: number;
}

const STAGE_LABELS: Record<string, string> = {
  none: "Current / Monitoring",
  soft_collections: "Soft Collections",
  pre_lien_notice: "Pre-Lien Notice",
  lien_filing: "Lien Filing",
  agency_attorney: "Agency / Attorney",
  write_off: "Write-Off",
};

const STAGE_COLOR: Record<string, string> = {
  none: "#14eba3",
  soft_collections: "#6366f1",
  pre_lien_notice: "#f59f0a",
  lien_filing: "#f97316",
  agency_attorney: "#eb143f",
  write_off: "#6b7280",
};

const STAGE_ORDER = [
  "lien_filing",
  "agency_attorney",
  "pre_lien_notice",
  "soft_collections",
  "none",
  "write_off",
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "current", label: "Current" },
  { value: "overdue", label: "Overdue" },
  { value: "in_collections", label: "In Collections" },
  { value: "promised", label: "Promised" },
  { value: "payment_plan", label: "Payment Plan" },
  { value: "escalated", label: "Escalated" },
  { value: "written_off", label: "Written Off" },
];

const STAGE_OPTIONS = [
  { value: "", label: "All stages" },
  { value: "none", label: "Monitoring" },
  { value: "soft_collections", label: "Soft Collections" },
  { value: "pre_lien_notice", label: "Pre-Lien Notice" },
  { value: "lien_filing", label: "Lien Filing" },
  { value: "agency_attorney", label: "Agency / Attorney" },
  { value: "write_off", label: "Write-Off" },
];

const riskColor = (r: number | null) => {
  if (r == null) return "#6b7280";
  return r >= 75 ? "#eb143f" : r >= 45 ? "#f59f0a" : "#14eba3";
};

export default function CollectionsPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [callIds, setCallIds] = React.useState<string[]>([]);
  const [closed, setClosed] = React.useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = React.useState("");
  const [filterStage, setFilterStage] = React.useState("");

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ["collections/accounts"],
    queryFn: () => apiFetch<{ accounts: CollectionAccount[] }>("/collections/accounts"),
    retry: false,
  });

  const { data: agingData } = useQuery({
    queryKey: ["collections/aging"],
    queryFn: () => apiFetch<AgingData>("/collections/aging"),
    retry: false,
  });

  const logActivityMut = useMutation({
    mutationFn: ({ accountId, method }: { accountId: string; method: string }) =>
      apiFetch(`/collections/accounts/${accountId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          activityDate: new Date().toISOString().slice(0, 10),
          notes: "Logged from call queue",
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections/accounts"] }),
  });

  const promiseMut = useMutation({
    mutationFn: ({ accountId }: { accountId: string }) =>
      apiFetch(`/collections/accounts/${accountId}/promise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 0,
          promisedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          notes: "Quick promise — update details on account page",
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections/accounts"] }),
  });

  const advanceMut = useMutation({
    mutationFn: ({ accountId }: { accountId: string }) =>
      apiFetch(`/collections/accounts/${accountId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections/accounts"] }),
  });

  const allAccounts = accountsData?.accounts ?? [];
  const aging = agingData?.buckets;

  // Apply filters
  const accounts = allAccounts.filter((a) => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterStage && a.escalationStage !== filterStage) return false;
    return true;
  });

  const agingValues = aging
    ? [aging.current, aging.d1_30, aging.d31_60, aging.d61_90, aging.d91plus]
    : [0, 0, 0, 0, 0];
  const agingTotal = agingValues.reduce((a, b) => a + b, 0);

  const toggleSection = (k: string) => setClosed((c) => ({ ...c, [k]: !c[k] }));
  const toggleCall = (id: string) =>
    setCallIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const callAccts = allAccounts
    .filter((a) => callIds.includes(a.id))
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));

  const activeFilterCount = (filterStatus ? 1 : 0) + (filterStage ? 1 : 0);

  useRightPanel(
    <Panel title="Call Queue" accent="#eb143f" count={callAccts.length}>
      <QueueList
        items={callAccts.slice(0, 4).map((a) => ({
          id: a.id,
          title: a.cachedName ?? a.id,
          sub: `Risk ${a.riskScore ?? "—"} · ${money(Number(a.totalOverdue))}`,
          action: "Log call",
          actionTone: "#6366f1",
        }))}
      />
    </Panel>,
    [callAccts.length],
  );

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--text-muted-color)" }}>
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading accounts…
      </div>
    );
  }

  return (
    <>
      {/* AR Aging */}
      <div className="rounded-lg border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[14.5px] font-semibold" style={{ color: "var(--text-base)" }}>
            Accounts receivable aging
          </div>
          <span className="font-mono text-[14px] font-semibold text-[#eb143f]">
            {money(agingTotal)}
          </span>
        </div>
        <AgingBuckets values={agingValues} variant="columns" />
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 shrink-0" style={{ color: "var(--text-dim)" }} />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-[12.5px]"
          style={{ background: "var(--surface)", borderColor: activeFilterCount > 0 && filterStatus ? "#6366f1" : "var(--helm-border)", color: "var(--text-base)" }}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-[12.5px]"
          style={{ background: "var(--surface)", borderColor: activeFilterCount > 0 && filterStage ? "#6366f1" : "var(--helm-border)", color: "var(--text-base)" }}
        >
          {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setFilterStatus(""); setFilterStage(""); }}
            className="text-[12px]"
            style={{ color: "var(--text-dim)" }}
          >
            Clear ({activeFilterCount})
          </button>
        )}
        <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted-color)" }}>
          {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Call list */}
      <Section
        open={!closed["__call"]}
        onToggle={() => toggleSection("__call")}
        header={
          <>
            <Phone className="h-[17px] w-[17px] shrink-0 text-[#14eba3]" />
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold" style={{ color: "var(--text-base)" }}>
                Call list
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted-color)" }}>
                Ranked by risk
              </div>
            </div>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-[#14eba3]"
              style={{ background: alpha("#14eba3", 0.14) }}
            >
              {callAccts.length}
            </span>
            <span className="font-mono text-[12.5px] font-semibold text-[#eb143f]">
              {money(callAccts.reduce((x, a) => x + Number(a.totalOverdue), 0))}
            </span>
          </>
        }
      >
        {callAccts.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs leading-relaxed" style={{ color: "var(--text-muted-color)" }}>
            Add accounts to the call list below.
          </div>
        ) : (
          callAccts.map((a) => (
            <div
              key={a.id}
              className="flex cursor-pointer items-center gap-3 border-b px-[18px] py-3 last:border-0"
              style={{ borderColor: "var(--helm-border)" }}
              onClick={() => navigate(`/collections/${a.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold" style={{ color: "var(--text-base)" }}>
                  {a.cachedName ?? a.id}
                </div>
                <div className="truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>
                  {STAGE_LABELS[a.escalationStage] ?? a.escalationStage} · {a.oldestOverdueDays}d oldest
                </div>
              </div>
              <RiskPill risk={a.riskScore} />
              <span className="w-[74px] shrink-0 text-right font-mono text-[13.5px] font-semibold text-[#eb143f]">
                {money(Number(a.totalOverdue))}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  logActivityMut.mutate({ accountId: a.id, method: "phone" });
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold text-[#14eba3]"
                style={{ background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) }}
              >
                <Phone className="h-3.5 w-3.5" />
                Log call
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCall(a.id);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                style={{ borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </Section>

      {/* Escalation stage buckets */}
      {STAGE_ORDER.map((stage) => {
        const list = accounts
          .filter((a) => a.escalationStage === stage && a.oldestOverdueDays > 0)
          .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
        if (!list.length) return null;
        const stageColor = STAGE_COLOR[stage] ?? "#6b7280";
        return (
          <Section
            key={stage}
            open={!closed[stage]}
            onToggle={() => toggleSection(stage)}
            header={
              <>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: stageColor }}
                />
                <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-base)" }}>
                  {STAGE_LABELS[stage] ?? stage}
                </span>
                <span
                  className="rounded-full border px-2 py-px font-mono text-[11px]"
                  style={{ borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}
                >
                  {list.length}
                </span>
                <span className="ml-auto font-mono text-[12.5px]" style={{ color: "var(--text-dim)" }}>
                  {money(list.reduce((x, a) => x + Number(a.totalOverdue), 0))}
                </span>
              </>
            }
          >
            {list.map((a) => {
              const on = callIds.includes(a.id);
              return (
                <div
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 border-b px-4 py-3 last:border-0"
                  style={{ borderColor: "var(--helm-border)" }}
                  onClick={() => navigate(`/collections/${a.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium" style={{ color: "var(--text-base)" }}>
                      {a.cachedName ?? a.id}
                    </div>
                    <div className="truncate text-[11.5px]" style={{ color: "var(--text-muted-color)" }}>
                      {a.oldestOverdueDays}d oldest · {a.status}
                      {a.hasOpenPromise && (
                        <span className="ml-1.5 text-[#6366f1]">· promise on file</span>
                      )}
                    </div>
                  </div>
                  <RiskPill risk={a.riskScore} />
                  <span className="w-[64px] shrink-0 text-right font-mono text-[13px] font-semibold text-[#eb143f]">
                    {money(Number(a.totalOverdue))}
                  </span>
                  {/* Per-row quick actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      logActivityMut.mutate({ accountId: a.id, method: "phone" });
                    }}
                    title="Log contact"
                    className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[11.5px] font-semibold"
                    style={{ color: "#14eba3", background: alpha("#14eba3", 0.1), borderColor: alpha("#14eba3", 0.25) }}
                  >
                    <Phone className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      promiseMut.mutate({ accountId: a.id });
                    }}
                    disabled={a.hasOpenPromise}
                    title={a.hasOpenPromise ? "Promise already on file" : "Record promise"}
                    className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[11.5px] font-semibold disabled:opacity-40"
                    style={{ color: "#6366f1", background: alpha("#6366f1", 0.1), borderColor: alpha("#6366f1", 0.25) }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      advanceMut.mutate({ accountId: a.id });
                    }}
                    disabled={a.hasOpenPromise || !a.currentDunningStepId}
                    title={a.hasOpenPromise ? "Suppressed — promise on file" : "Advance dunning"}
                    className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[11.5px] font-semibold disabled:opacity-40"
                    style={{ color: "#f59f0a", background: alpha("#f59f0a", 0.1), borderColor: alpha("#f59f0a", 0.25) }}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCall(a.id);
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold"
                    style={
                      on
                        ? { color: "#14eba3", background: alpha("#14eba3", 0.14), borderColor: alpha("#14eba3", 0.3) }
                        : { color: "var(--text-base)", background: "var(--surface-2)", borderColor: "var(--helm-border)" }
                    }
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </Section>
        );
      })}

      {accounts.length === 0 && (
        <div className="rounded-lg border px-6 py-10 text-center text-sm" style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)" }}>
          {activeFilterCount > 0
            ? "No accounts match the current filters."
            : "No collection accounts found."}
        </div>
      )}
    </>
  );
}

function Section({
  open,
  onToggle,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 border-b px-4 py-3 text-left"
        style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)" }}
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          style={{ color: "var(--text-dim)" }}
        />
        {header}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function RiskPill({ risk }: { risk: number | null }) {
  const c = riskColor(risk);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="font-mono text-[9.5px]" style={{ color: "var(--text-muted-color)" }}>
        RISK
      </span>
      <span
        className="rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold"
        style={{ color: c, background: alpha(c, 0.15) }}
      >
        {risk ?? "—"}
      </span>
    </div>
  );
}
