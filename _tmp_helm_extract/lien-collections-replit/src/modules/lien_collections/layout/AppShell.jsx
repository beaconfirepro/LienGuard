import { createContext, useContext, useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid, FolderKanban, CalendarDays, Share2, Landmark, Sun, Moon,
  ChevronLeft, Search, Bell, PanelRight, Menu, X, DollarSign, Settings, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResponsive } from "../hooks/useResponsive";

/* ---- Right-panel context (DD-UI-4): pages register their queue panel ---- */
const PanelCtx = createContext(null);
export function useRightPanel(node, deps = []) {
  const ctx = useContext(PanelCtx);
  useEffect(() => {
    ctx?.setRight(node);
    return () => ctx?.setRight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const CORE_NAV = [
  { label: "Dashboard", Icon: LayoutGrid },
  { label: "Projects", Icon: FolderKanban },
  { label: "Scheduling", Icon: CalendarDays },
  { label: "Partner Network", Icon: Share2 },
];

// Module side-nav (Dashboard + sections). Liens carries page children.
const MODULE_NAV = [
  { key: "dashboard", label: "Dashboard", to: "/lien-collections", Icon: LayoutGrid },
  {
    key: "liens", label: "Liens", to: "/lien-collections/liens", Icon: Landmark,
    pages: [
      { label: "Monthly Report", to: "/lien-collections/monthly" },
      { label: "Send Queue", to: "/lien-collections/send-queue" },
      { label: "Waivers", to: "/lien-collections/waivers" },
      { label: "Filing", to: "/lien-collections/filing/p1" },
    ],
  },
  { key: "collections", label: "Collections", to: "/lien-collections/collections", Icon: DollarSign },
  { key: "holds", label: "Vendor Holds", to: "/lien-collections/holds", Icon: Lock },
  { key: "config", label: "Settings", to: "/lien-collections/config", Icon: Settings },
];
const LIENS_PATHS = ["/liens", "/monthly", "/send-queue", "/waivers", "/filing", "/projects"];

const TITLES = [
  [/\/config$/, "Tenant Config"],
  [/\/liens$/, "Liens — Projects"],
  [/\/monthly$/, "Monthly Lien Report"],
  [/\/send-queue$/, "Ready-to-Send Queue"],
  [/\/projects\//, "Project Lien Detail"],
  [/\/waivers$/, "Waiver Workspace"],
  [/\/filing\//, "Filing Workspace"],
  [/\/holds$/, "Vendor Bill Holds"],
  [/\/collections\/.+/, "Account Detail"],
  [/\/collections$/, "Collections Pipeline"],
  [/\/lien-collections$/, "Dashboard"],
];

export default function AppShell() {
  const { isDesktop, isPhone, width } = useResponsive();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [right, setRight] = useState(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const path = location.pathname;
  const section = path.includes("/collections") ? "collections" : path.includes("/config") ? "config" : "liens";
  const title = (TITLES.find(([re]) => re.test(path)) || [null, "Lien & Collections"])[1];

  // Capacity-aware columns: stack the right panel when there isn't room for 3.
  const sidebarW = isDesktop ? (collapsed ? 70 : 236) : 0;
  const avail = width - sidebarW;
  const showLeft = false;
  const afterLeft = avail;
  const rightFits = afterLeft - 314 >= 470;
  const hasRight = !!right && rightOpen && !isPhone;
  const rightCol = hasRight && rightFits && isDesktop;
  const rightStacked = hasRight && !rightCol;
  const cols = ["minmax(0,1fr)", rightCol ? "296px" : null].filter(Boolean).join(" ");

  const ctx = { setRight, leftOpen, rightOpen };

  return (
    <PanelCtx.Provider value={ctx}>
      <div className="flex min-h-screen">
        {/* ---- Helm core sidebar (col 1) ---- */}
        {isDesktop && (
          <aside
            className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200"
            style={{ width: collapsed ? 70 : 236 }}
          >
            <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-border", collapsed ? "justify-center" : "px-[18px]")}>
              <Landmark className="h-6 w-6 text-accent" />
              {!collapsed && (
                <div className="leading-none">
                  <div className="text-lg font-bold tracking-tight text-text">Helm</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-muted">by Beacon</div>
                </div>
              )}
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {CORE_NAV.map(({ label, Icon }) => (
                <button key={label} title={label} className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium text-text-dim hover:bg-surface-2", collapsed ? "justify-center px-2.5" : "px-3")}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </button>
              ))}
              <div className="mx-1.5 my-2 h-px bg-border" />
              <div className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-semibold text-text", collapsed ? "justify-center px-2.5" : "px-3")}>
                <Landmark className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">Lien &amp; Collections</span>}
              </div>
              {!collapsed && (
                <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2.5">
                  {MODULE_NAV.map((m) => {
                    const active = m.to === "/lien-collections" ? path === "/lien-collections" : (path.startsWith(m.to) || (m.key === "liens" && LIENS_PATHS.some((p) => path.includes(p))));
                    return (
                      <div key={m.key}>
                        <button onClick={() => navigate(m.to)} className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]", active ? "bg-surface-3 font-semibold text-text" : "font-medium text-text-dim hover:bg-surface-2")}>
                          <m.Icon className="h-4 w-4 shrink-0" />{m.label}
                        </button>
                        {m.pages && active && (
                          <div className="ml-2 flex flex-col gap-0.5 border-l border-border py-0.5 pl-2.5">
                            {m.pages.map((p) => {
                              const pa = path === p.to || (p.to.includes("/filing") && path.includes("/filing"));
                              return (
                                <button key={p.to} onClick={() => navigate(p.to)} className={cn("rounded-md px-2.5 py-1.5 text-left text-[12.5px]", pa ? "bg-surface-3 font-semibold text-text" : "font-medium text-text-dim hover:bg-surface-2")}>{p.label}</button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </nav>
            <div className="flex flex-col gap-1 border-t border-border p-3">
              <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium text-text-dim hover:bg-surface-2", collapsed ? "justify-center px-2.5" : "px-3")}>
                {theme === "dark" ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
                {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
              </button>
              <button onClick={() => setCollapsed((c) => !c)} className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium text-text-dim hover:bg-surface-2", collapsed ? "justify-center px-2.5" : "px-3")}>
                <ChevronLeft className={cn("h-5 w-5 shrink-0 transition-transform", collapsed && "rotate-180")} />
                {!collapsed && <span>Collapse</span>}
              </button>
            </div>
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {/* ---- Header (row 1) ---- */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg px-4 md:px-6">
            {isPhone && (
              <button onClick={() => setDrawer(true)} className="-ml-1 p-1.5 text-text">
                <Menu className="h-6 w-6" />
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Landmark className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <div className="text-[17px] font-bold leading-tight tracking-tight text-text">Lien &amp; Collections</div>
                <div className="truncate text-[12px] text-text-dim">Texas · Module 22 · protecting Beacon's right to payment</div>
              </div>
            </div>
            <div className="relative hidden w-56 lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search projects, accounts…" className="w-full rounded-md border border-border bg-surface-2 py-2 pl-9 pr-3 text-[13px] text-text outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1.5 font-mono text-[10.5px] font-semibold tracking-wide text-success sm:flex" style={{ background: "rgba(20,235,163,.12)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-success" />PROD
            </span>
            <button className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-text-dim">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full border-2 border-surface bg-error" />
            </button>
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#1a1205]" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>DB</div>
          </header>

          {/* ---- Sub-header (row 2) ---- */}
          <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-bg px-4 py-2.5 md:px-6">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-semibold text-text">{title}</div>
              <div className="truncate font-mono text-[11.5px] text-text-muted">{path}</div>
            </div>
            {hasRight && isDesktop && (
              <button onClick={() => setRightOpen((v) => !v)} title="Toggle right panel" className={cn("flex h-[34px] w-[34px] items-center justify-center rounded-md border border-border", rightOpen ? "bg-surface-3 text-accent" : "text-text-dim")}>
                <PanelRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ---- Body (LP · content · RP) ---- */}
          <div className="grid flex-1 items-start gap-4 p-4 md:gap-[18px] md:p-[18px]" style={{ gridTemplateColumns: isDesktop ? cols : "1fr", paddingBottom: isPhone ? 80 : undefined }}>
            <div className="flex min-w-0 flex-col gap-4">
              <Outlet />
            </div>
            {hasRight && (
              <div className={cn(rightStacked && "col-span-full", "overflow-hidden rounded-lg border border-border bg-surface", rightCol && "sticky top-[120px]")}>
                {right}
              </div>
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-3 text-[11px] text-text-muted" style={{ marginBottom: isPhone ? 62 : 0 }}>
            <span>© 2026 Beacon Fire Protection · Lien &amp; Collections v1.0</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" />Status: Operational</span>
          </footer>
        </main>

        {/* ---- Mobile bottom tab bar ---- */}
        {isPhone && (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] border-t border-border bg-surface">
            {[
              { label: "Dashboard", to: "/lien-collections", Icon: LayoutGrid },
              { label: "Liens", to: "/lien-collections/liens", Icon: Landmark },
              { label: "Collections", to: "/lien-collections/collections", Icon: DollarSign },
              { label: "Holds", to: "/lien-collections/holds", Icon: Lock },
              { label: "Settings", to: "/lien-collections/config", Icon: Settings },
            ].map(({ label, to, Icon }) => {
              const active = to === "/lien-collections" ? path === to : path.startsWith(to);
              return (
                <button key={label} onClick={() => navigate(to)} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", active ? "text-accent" : "text-text-muted")}>
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              );
            })}
          </nav>
        )}

        {/* ---- Mobile drawer ---- */}
        {drawer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)}>
            <div className="absolute inset-y-0 left-0 flex w-[250px] flex-col border-r border-border bg-surface" onClick={(e) => e.stopPropagation()}>
              <div className="flex h-16 items-center justify-between border-b border-border px-[18px]">
                <span className="text-[17px] font-bold text-text">Helm</span>
                <button onClick={() => setDrawer(false)} className="text-text-dim"><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-3">
                {[...CORE_NAV.map((c) => c.label), "Lien & Collections"].map((label) => (
                  <div key={label} className={cn("rounded-md px-3 py-2.5 text-sm", label === "Lien & Collections" ? "bg-surface-3 font-semibold text-text" : "font-medium text-text-dim")}>{label}</div>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </PanelCtx.Provider>
  );
}
