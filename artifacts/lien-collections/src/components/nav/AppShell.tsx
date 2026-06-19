import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import {
  LayoutGrid, Landmark, DollarSign, Lock, Settings,
  ChevronLeft, Bell, Menu, X, Search,
  CalendarDays, Share2, FolderKanban, Sun, Moon,
} from "lucide-react";

/* ─── Right-panel context ────────────────────────────────────────────────── */
const PanelCtx = React.createContext<{ setRight: (n: React.ReactNode) => void } | null>(null);

export function useRightPanel(node: React.ReactNode, deps: React.DependencyList = []) {
  const ctx = React.useContext(PanelCtx);
  React.useEffect(() => {
    ctx?.setRight(node);
    return () => ctx?.setRight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ─── Panel helper used by pages ─────────────────────────────────────────── */
export function Panel({
  title, accent = "#6366f1", count, children,
}: {
  title: string; accent?: string; count?: number; children?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: "var(--helm-border)" }}>
        <div className="text-[13.5px] font-semibold" style={{ color: "var(--text-base)" }}>{title}</div>
        {count != null && (
          <span className="rounded-full px-2 py-0.5 font-mono text-[11.5px] font-semibold" style={{ color: accent, background: `${accent}22` }}>{count}</span>
        )}
      </div>
      {children}
    </>
  );
}

/* ─── Navigation config ──────────────────────────────────────────────────── */
const CORE_NAV = [
  { label: "Dashboard", Icon: LayoutGrid },
  { label: "Projects", Icon: FolderKanban },
  { label: "Scheduling", Icon: CalendarDays },
  { label: "Partner Network", Icon: Share2 },
];

const MODULE_NAV = [
  { key: "dashboard", label: "Dashboard", to: "/", Icon: LayoutGrid },
  {
    key: "liens", label: "Liens", to: "/liens", Icon: Landmark,
    sub: [
      { label: "Projects", to: "/liens" },
      { label: "Monthly Report", to: "/monthly" },
      { label: "Send Queue", to: "/send-queue" },
      { label: "Waivers", to: "/waivers" },
      { label: "Reports", to: "/reports" },
    ],
  },
  { key: "collections", label: "Collections", to: "/collections", Icon: DollarSign },
  { key: "holds", label: "Vendor Holds", to: "/holds", Icon: Lock },
  { key: "config", label: "Settings", to: "/settings", Icon: Settings },
];

const LIENS_PATHS = ["/liens", "/monthly", "/send-queue", "/waivers", "/projects", "/filing", "/reports"];

const TITLES: [RegExp, string][] = [
  [/^\/settings$/, "Settings"],
  [/^\/liens$/, "Liens — Projects"],
  [/^\/monthly$/, "Monthly Lien Report"],
  [/^\/send-queue$/, "Ready-to-Send Queue"],
  [/^\/projects\/new$/, "New Project"],
  [/^\/projects\//, "Project Lien Detail"],
  [/^\/waivers$/, "Waiver Workspace"],
  [/^\/filing\//, "Filing Workspace"],
  [/^\/reports\/.+\/timeline$/, "Lien Timeline"],
  [/^\/reports$/, "Exposure & Reports"],
  [/^\/holds$/, "Vendor Bill Holds"],
  [/^\/collections\/.+/, "Account Detail"],
  [/^\/collections$/, "Collections Pipeline"],
  [/^\/$/, "Dashboard"],
];

function getTitle(path: string) {
  return TITLES.find(([re]) => re.test(path))?.[1] ?? "Lien & Collections";
}

/* ─── Main AppShell ──────────────────────────────────────────────────────── */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDesktop, isMobile, width } = useResponsive();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");
  const [drawer, setDrawer] = React.useState(false);
  const [right, setRight] = React.useState<React.ReactNode>(null);
  const [rightOpen, setRightOpen] = React.useState(true);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const sidebarW = isDesktop ? (collapsed ? 70 : 236) : 0;
  const avail = width - sidebarW;
  const rightFits = avail - 314 >= 470;
  const hasRight = !!right && rightOpen && !isMobile;
  const rightCol = hasRight && rightFits && isDesktop;
  const rightStacked = hasRight && !rightCol;

  const title = getTitle(location);

  const isLiensSection = LIENS_PATHS.some((p) =>
    p === "/liens" ? location === p || location.startsWith("/projects") || location.startsWith("/filing") || location.startsWith("/monthly") || location.startsWith("/send-queue") || location.startsWith("/waivers") : location.startsWith(p)
  );

  const ctx = { setRight };

  return (
    <PanelCtx.Provider value={ctx}>
      <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>

        {/* ─── Desktop Sidebar ─────────────────────────────────────────── */}
        {isDesktop && (
          <aside
            className="sticky top-0 flex h-screen shrink-0 flex-col border-r transition-[width] duration-200"
            style={{
              width: collapsed ? 70 : 236,
              background: "var(--surface)",
              borderColor: "var(--helm-border)",
            }}
          >
            {/* Logo */}
            <div
              className={cn(
                "flex h-16 shrink-0 items-center gap-2.5 border-b",
                collapsed ? "justify-center" : "px-[18px]",
              )}
              style={{ borderColor: "var(--helm-border)" }}
            >
              <Landmark className="h-6 w-6 text-amber-500 shrink-0" />
              {!collapsed && (
                <div className="leading-none">
                  <div className="text-lg font-bold tracking-tight" style={{ color: "var(--text-base)" }}>Helm</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text-muted-color)" }}>by Beacon</div>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {CORE_NAV.map(({ label, Icon }) => (
                <button
                  key={label}
                  title={label}
                  className={cn(
                    "flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium transition-colors hover:opacity-80",
                    collapsed ? "justify-center px-2.5" : "px-3",
                  )}
                  style={{ color: "var(--text-dim)", background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </button>
              ))}

              <div className="mx-1.5 my-2 h-px" style={{ background: "var(--helm-border)" }} />

              {/* Active module label */}
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md py-2.5 text-[14px] font-semibold",
                  collapsed ? "justify-center px-2.5" : "px-3",
                )}
                style={{ color: "var(--text-base)" }}
              >
                <Landmark className="h-5 w-5 shrink-0 text-amber-500" />
                {!collapsed && <span className="whitespace-nowrap">Lien &amp; Collections</span>}
              </div>

              {/* Sub-nav */}
              {!collapsed && (
                <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-2.5" style={{ borderColor: "var(--helm-border)" }}>
                  {MODULE_NAV.map((m) => {
                    const active =
                      m.to === "/" ? location === "/" :
                      m.key === "liens" ? (location.startsWith(m.to) || isLiensSection) :
                      location.startsWith(m.to);
                    return (
                      <div key={m.key}>
                        <Link href={m.to}>
                          <div
                            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] cursor-pointer"
                            style={active
                              ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                              : { color: "var(--text-dim)", fontWeight: 500 }}
                          >
                            <m.Icon className="h-4 w-4 shrink-0" />{m.label}
                          </div>
                        </Link>
                        {m.sub && active && (
                          <div
                            className="ml-2 flex flex-col gap-0.5 border-l py-0.5 pl-2.5"
                            style={{ borderColor: "var(--helm-border)" }}
                          >
                            {m.sub.map((s) => {
                              const sa = location === s.to;
                              return (
                                <Link key={s.to} href={s.to}>
                                  <div
                                    className="rounded-md px-2.5 py-1.5 text-left text-[12.5px] cursor-pointer"
                                    style={sa
                                      ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                                      : { color: "var(--text-dim)", fontWeight: 500 }}
                                  >
                                    {s.label}
                                  </div>
                                </Link>
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

            {/* Footer */}
            <div className="flex flex-col gap-1 border-t p-3" style={{ borderColor: "var(--helm-border)" }}>
              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium", collapsed ? "justify-center px-2.5" : "px-3")}
                style={{ color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
                {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
              </button>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium", collapsed ? "justify-center px-2.5" : "px-3")}
                style={{ color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronLeft className={cn("h-5 w-5 shrink-0 transition-transform", collapsed && "rotate-180")} />
                {!collapsed && <span>Collapse</span>}
              </button>
            </div>
          </aside>
        )}

        {/* ─── Main column ─────────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col" style={{ background: "var(--bg)" }}>
          {/* Header */}
          <header
            className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 md:px-6"
            style={{ background: "var(--bg)", borderColor: "var(--helm-border)" }}
          >
            {isMobile && (
              <button onClick={() => setDrawer(true)} className="-ml-1 p-1.5" style={{ color: "var(--text-base)" }}>
                <Menu className="h-6 w-6" />
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Landmark className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <div className="text-[17px] font-bold leading-tight tracking-tight" style={{ color: "var(--text-base)" }}>
                  Lien &amp; Collections
                </div>
                <div className="truncate text-[12px]" style={{ color: "var(--text-dim)" }}>
                  Texas · Module 22 · protecting Beacon's right to payment
                </div>
              </div>
            </div>
            <div className="relative hidden w-56 lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted-color)" }} />
              <input
                placeholder="Search projects…"
                className="w-full rounded-md border py-2 pl-9 pr-3 text-[13px] outline-none"
                style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-base)" }}
              />
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10.5px] font-semibold tracking-wide sm:flex" style={{ background: "rgba(20,235,163,.12)", color: "#14eba3" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#14eba3]" />PROD
            </span>
            <button className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border" style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-dim)" }}>
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full border-2 bg-[#eb143f]" style={{ borderColor: "var(--surface)" }} />
            </button>
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#1a1205]" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
              DB
            </div>
          </header>

          {/* Sub-header */}
          <div
            className="sticky top-16 z-20 flex flex-wrap items-center gap-3 border-b px-4 py-2.5 md:px-6"
            style={{ background: "var(--bg)", borderColor: "var(--helm-border)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-semibold" style={{ color: "var(--text-base)" }}>{title}</div>
            </div>
          </div>

          {/* Body — content + optional right panel */}
          <div
            className="grid flex-1 items-start gap-4 p-4 md:gap-[18px] md:p-[18px]"
            style={{
              gridTemplateColumns: isDesktop && rightCol ? "minmax(0,1fr) 296px" : "1fr",
              paddingBottom: isMobile ? 80 : undefined,
            }}
          >
            <div className="flex min-w-0 flex-col gap-4">
              {children}
            </div>
            {hasRight && (
              <div
                className={cn(
                  "overflow-hidden rounded-lg border",
                  rightStacked && "col-span-full",
                  rightCol && "sticky top-[120px]",
                )}
                style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
              >
                {right}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer
            className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 text-[11px]"
            style={{ background: "var(--surface)", borderColor: "var(--helm-border)", color: "var(--text-muted-color)", marginBottom: isMobile ? 62 : 0 }}
          >
            <span>© 2026 Beacon Fire Protection · Lien &amp; Collections v1.0</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#14eba3]" />
              Status: Operational
            </span>
          </footer>
        </main>

        {/* ─── Mobile bottom tab bar ─────────────────────────────────── */}
        {isMobile && (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] border-t" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
            {[
              { label: "Dashboard", to: "/", Icon: LayoutGrid },
              { label: "Liens", to: "/liens", Icon: Landmark },
              { label: "Collections", to: "/collections", Icon: DollarSign },
              { label: "Holds", to: "/holds", Icon: Lock },
              { label: "Settings", to: "/settings", Icon: Settings },
            ].map(({ label, to, Icon }) => {
              const active = to === "/" ? location === to : location.startsWith(to);
              return (
                <Link key={label} href={to}>
                  <div
                    className="flex flex-1 w-16 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold cursor-pointer"
                    style={{ color: active ? "#f59e0b" : "var(--text-muted-color)" }}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </div>
                </Link>
              );
            })}
          </nav>
        )}

        {/* ─── Mobile drawer ──────────────────────────────────────────── */}
        {drawer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)}>
            <div
              className="absolute inset-y-0 left-0 flex w-[250px] flex-col border-r"
              style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 items-center justify-between border-b px-[18px]" style={{ borderColor: "var(--helm-border)" }}>
                <span className="text-[17px] font-bold" style={{ color: "var(--text-base)" }}>Helm</span>
                <button onClick={() => setDrawer(false)} style={{ color: "var(--text-dim)" }}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-3">
                {MODULE_NAV.map((m) => {
                  const active = m.to === "/" ? location === "/" : location.startsWith(m.to);
                  return (
                    <Link key={m.key} href={m.to}>
                      <div
                        className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm cursor-pointer"
                        style={active
                          ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                          : { color: "var(--text-dim)", fontWeight: 500 }}
                        onClick={() => setDrawer(false)}
                      >
                        <m.Icon className="h-4 w-4 shrink-0" />{m.label}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>
    </PanelCtx.Provider>
  );
}
