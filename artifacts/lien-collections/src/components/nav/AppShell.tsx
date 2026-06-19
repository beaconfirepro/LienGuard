import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import { useAuth } from "@workspace/replit-auth-web";
import {
  LayoutGrid, Landmark, DollarSign, Lock, Settings,
  ChevronLeft, Bell, Menu, X, Search,
  Sun, Moon, PanelRightClose, PanelRightOpen,
  PanelLeftClose, PanelLeftOpen, FileSignature, Gavel, LogOut,
  ChevronDown,
} from "lucide-react";

/* ─── Panel context (inner left + right) ─────────────────────────────────── */
const PanelCtx = React.createContext<{
  setRight: (n: React.ReactNode) => void;
  setLeft: (n: React.ReactNode) => void;
} | null>(null);

export function useRightPanel(node: React.ReactNode, deps: React.DependencyList = []) {
  const ctx = React.useContext(PanelCtx);
  React.useEffect(() => {
    ctx?.setRight(node);
    return () => ctx?.setRight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useLeftPanel(node: React.ReactNode, deps: React.DependencyList = []) {
  const ctx = React.useContext(PanelCtx);
  React.useEffect(() => {
    ctx?.setLeft(node);
    return () => ctx?.setLeft(null);
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

/* ─── Collapsible card (tablet panel surface) ────────────────────────────── */
function CollapsibleCard({
  label, Icon, defaultOpen = false, children,
}: {
  label: string; Icon: React.ComponentType<{ className?: string }>; defaultOpen?: boolean; children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors"
        aria-expanded={open}
        style={{ color: "var(--text-base)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-[13.5px] font-semibold">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t" style={{ borderColor: "var(--helm-border)" }}>
          {children}
        </div>
      )}
    </section>
  );
}

/* ─── Navigation config ──────────────────────────────────────────────────── */
const MODULE_NAV = [
  { key: "dashboard", label: "Dashboard", to: "/", Icon: LayoutGrid },
  { key: "liens", label: "Projects", to: "/liens", Icon: Landmark },
  { key: "filings", label: "Filings", to: "/filing", Icon: Gavel },
  { key: "waivers", label: "Waivers", to: "/waivers", Icon: FileSignature },
  { key: "collections", label: "Collections", to: "/collections", Icon: DollarSign },
  { key: "holds", label: "Vendor Holds", to: "/holds", Icon: Lock },
];

const TITLES: [RegExp, string][] = [
  [/^\/settings$/, "Company Settings"],
  [/^\/liens$/, "Projects"],
  [/^\/send-queue$/, "Ready-to-Send Queue"],
  [/^\/projects\//, "Project Lien Detail"],
  [/^\/waivers$/, "Waiver Workspace"],
  [/^\/filing$/, "Filings"],
  [/^\/filing\//, "Filing Workspace"],
  [/^\/holds$/, "Vendor Bill Holds"],
  [/^\/collections\/.+/, "Account Detail"],
  [/^\/collections$/, "Collections Pipeline"],
  [/^\/$/, "Dashboard"],
];

function getTitle(path: string) {
  return TITLES.find(([re]) => re.test(path))?.[1] ?? "LienGuard";
}

/* ─── Main AppShell ──────────────────────────────────────────────────────── */
function userInitials(user: { firstName: string | null; lastName: string | null; email: string | null }): string {
  const f = user.firstName?.trim()?.[0] ?? "";
  const l = user.lastName?.trim()?.[0] ?? "";
  const initials = `${f}${l}`.toUpperCase();
  if (initials) return initials;
  return (user.email?.trim()?.[0] ?? "?").toUpperCase();
}

function userDisplayName(user: { firstName: string | null; lastName: string | null; email: string | null }): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "Account";
}

/* ─── Login gate (unauthenticated) ───────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 dark" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-sm rounded-xl border p-8 text-center shadow-xl"
        style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: "var(--surface-3)" }}>
          <Landmark className="h-7 w-7 text-amber-500" />
        </div>
        <div className="text-[18px] font-bold tracking-tight" style={{ color: "var(--text-base)" }}>
          LienGuard
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text-muted-color)" }}>
          by HELM
        </div>
        <p className="mt-5 text-[13.5px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
          Please log in to access the workspace.
        </p>
        <button
          onClick={onLogin}
          className="mt-6 w-full rounded-md py-2.5 text-[14px] font-semibold text-[#1a1205] transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
        >
          Log in
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDesktop, isTablet, isMobile, width } = useResponsive();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");
  const [drawer, setDrawer] = React.useState(false);
  const [right, setRight] = React.useState<React.ReactNode>(null);
  const [left, setLeft] = React.useState<React.ReactNode>(null);
  const [rightOpen, setRightOpen] = React.useState(true);
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [mobilePanel, setMobilePanel] = React.useState<null | "left" | "right">(null);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  /* Close the mobile panel overlay when leaving phone width or when the
     corresponding panel content unregisters. */
  React.useEffect(() => {
    if (!isMobile) setMobilePanel(null);
  }, [isMobile]);
  React.useEffect(() => {
    if (mobilePanel === "left" && !left) setMobilePanel(null);
    if (mobilePanel === "right" && !right) setMobilePanel(null);
  }, [mobilePanel, left, right]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark" style={{ background: "var(--bg)", color: "var(--text-dim)" }}>
        <span className="text-[13.5px]">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  const title = getTitle(location);

  const isLiensSection =
    location === "/liens" ||
    location.startsWith("/projects") ||
    location.startsWith("/send-queue");

  /* Inner left panel (DD-UI: LP · content · RP) is now page-registered via
     useLeftPanel — pages decide its content. */
  const hasLeftPanel = !!left;
  const hasRightPanel = !!right;

  /* Desktop: side columns (left fixed column, right column or stacked). */
  const sidebarW = isDesktop ? (collapsed ? 70 : 236) : 0;
  const leftCol = hasLeftPanel && leftOpen && isDesktop;
  const leftW = leftCol ? 208 : 0;
  const avail = width - sidebarW - leftW;
  const rightFits = avail - 314 >= 470;
  const rightCol = hasRightPanel && rightOpen && isDesktop && rightFits;
  const rightStacked = hasRightPanel && rightOpen && isDesktop && !rightFits;

  /* Tablet: inline collapsible cards (left above content, right below). */
  const leftCard = hasLeftPanel && isTablet;
  const rightCard = hasRightPanel && isTablet;

  const ctx = { setRight, setLeft };

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
                  <div className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text-base)" }}>LienGuard</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--text-muted-color)" }}>by HELM</div>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              {MODULE_NAV.map((m) => {
                const active =
                  m.to === "/" ? location === "/" :
                  m.key === "liens" ? (location.startsWith(m.to) || isLiensSection) :
                  location.startsWith(m.to);
                return (
                  <div key={m.key}>
                    <Link href={m.to}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-md py-2.5 text-[13.5px] cursor-pointer",
                          collapsed ? "justify-center px-2.5" : "px-3",
                        )}
                        style={active
                          ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                          : { color: "var(--text-dim)", fontWeight: 500 }}
                      >
                        <m.Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="whitespace-nowrap">{m.label}</span>}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="flex flex-col gap-1 border-t p-3" style={{ borderColor: "var(--helm-border)" }}>
              <Link href="/settings">
                <div
                  className={cn("flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium cursor-pointer", collapsed ? "justify-center px-2.5" : "px-3")}
                  style={location === "/settings"
                    ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                    : { color: "var(--text-dim)" }}
                  onMouseEnter={(e) => { if (location !== "/settings") e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { if (location !== "/settings") e.currentTarget.style.background = "transparent"; }}
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Company Settings</span>}
                </div>
              </Link>
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
            <div className="min-w-0 flex-1" />
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
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border"
              style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-dim)" }}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <div className="flex shrink-0 items-center gap-2.5">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={userDisplayName(user)}
                  className="h-[38px] w-[38px] shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#1a1205]" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}>
                  {user ? userInitials(user) : "?"}
                </div>
              )}
              {user && (
                <span className="hidden text-[13px] font-medium lg:block" style={{ color: "var(--text-base)" }}>
                  {userDisplayName(user)}
                </span>
              )}
              <button
                onClick={logout}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border"
                style={{ background: "var(--surface-2)", borderColor: "var(--helm-border)", color: "var(--text-dim)" }}
                title="Log out"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </header>

          {/* Sub-header */}
          <div
            className="sticky top-16 z-20 flex items-center gap-3 border-b px-4 py-2.5 md:px-6"
            style={{ background: "var(--bg)", borderColor: "var(--helm-border)" }}
          >
            {!!left && isDesktop && (
              <button
                onClick={() => setLeftOpen((o) => !o)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors"
                style={{
                  background: leftOpen ? "var(--surface-3)" : "var(--surface-2)",
                  borderColor: "var(--helm-border)",
                  color: leftOpen ? "var(--text-base)" : "var(--text-dim)",
                }}
                title={leftOpen ? "Collapse panel" : "Expand panel"}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = leftOpen ? "var(--surface-3)" : "var(--surface-2)")}
              >
                {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-semibold" style={{ color: "var(--text-base)" }}>{title}</div>
            </div>
            {!!right && isDesktop && (
              <button
                onClick={() => setRightOpen((o) => !o)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors"
                style={{
                  background: rightOpen ? "var(--surface-3)" : "var(--surface-2)",
                  borderColor: "var(--helm-border)",
                  color: rightOpen ? "var(--text-base)" : "var(--text-dim)",
                }}
                title={rightOpen ? "Collapse panel" : "Expand panel"}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = rightOpen ? "var(--surface-3)" : "var(--surface-2)")}
              >
                {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Body — inner left tab · content · right panel (DD-UI: LP · content · RP) */}
          <div
            className="grid flex-1 items-start gap-4 p-4 md:gap-[18px] md:p-[18px]"
            style={{
              gridTemplateColumns: [
                leftCol ? "208px" : null,
                "minmax(0,1fr)",
                rightCol ? "296px" : null,
              ].filter(Boolean).join(" "),
              paddingBottom: isMobile ? 80 : undefined,
            }}
          >
            {leftCol && (
              <aside
                className="sticky top-[120px] overflow-hidden rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
              >
                {left}
              </aside>
            )}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Tablet: left panel as collapsible card above content */}
              {leftCard && (
                <CollapsibleCard label="Filters & Navigation" Icon={PanelLeftOpen}>
                  {left}
                </CollapsibleCard>
              )}
              {children}
              {/* Tablet: right panel as collapsible card below content */}
              {rightCard && (
                <CollapsibleCard label="Details & Context" Icon={PanelRightOpen}>
                  {right}
                </CollapsibleCard>
              )}
            </div>
            {(rightCol || rightStacked) && (
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
            <span>© 2026 HELM Fire Protection · LienGuard v1.0</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#14eba3]" />
              Status: Operational
            </span>
          </footer>
        </main>

        {/* ─── Phone floating panel buttons ──────────────────────────── */}
        {isMobile && hasLeftPanel && (
          <button
            onClick={() => setMobilePanel("left")}
            className="fixed left-3 z-40 flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 shadow-lg"
            style={{ bottom: 74, background: "var(--surface-3)", borderColor: "var(--helm-border)", color: "var(--text-base)" }}
          >
            <PanelLeftOpen className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Filters</span>
          </button>
        )}
        {isMobile && hasRightPanel && (
          <button
            onClick={() => setMobilePanel("right")}
            className="fixed right-3 z-40 flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 shadow-lg"
            style={{ bottom: 74, background: "var(--surface-3)", borderColor: "var(--helm-border)", color: "var(--text-base)" }}
          >
            <PanelRightOpen className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Details</span>
          </button>
        )}

        {/* ─── Phone panel overlay (bottom sheet) ─────────────────────── */}
        {isMobile && mobilePanel && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobilePanel(null)}>
            <div
              className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl border-t"
              style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--helm-border)" }}>
                <span className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text-base)" }}>
                  {mobilePanel === "left" ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelRightOpen className="h-[18px] w-[18px]" />}
                  {mobilePanel === "left" ? "Filters & Navigation" : "Details & Context"}
                </span>
                <button onClick={() => setMobilePanel(null)} style={{ color: "var(--text-dim)" }}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto overscroll-contain">
                {mobilePanel === "left" ? left : right}
              </div>
            </div>
          </div>
        )}

        {/* ─── Mobile bottom tab bar ─────────────────────────────────── */}
        {isMobile && (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] border-t" style={{ background: "var(--surface)", borderColor: "var(--helm-border)" }}>
            {[
              { label: "Dashboard", to: "/", Icon: LayoutGrid },
              { label: "Projects", to: "/liens", Icon: Landmark },
              { label: "Waivers", to: "/waivers", Icon: FileSignature },
              { label: "Collections", to: "/collections", Icon: DollarSign },
              { label: "Settings", to: "/settings", Icon: Settings },
            ].map(({ label, to, Icon }) => {
              const active =
                to === "/" ? location === to :
                to === "/liens" ? isLiensSection :
                location.startsWith(to);
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
                <span className="text-[15px] font-bold leading-tight" style={{ color: "var(--text-base)" }}>
                  LienGuard
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text-muted-color)" }}>By HELM</span>
                </span>
                <button onClick={() => setDrawer(false)} style={{ color: "var(--text-dim)" }}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-3">
                {MODULE_NAV.map((m) => {
                  const active =
                    m.to === "/" ? location === "/" :
                    m.key === "liens" ? (location.startsWith(m.to) || isLiensSection) :
                    location.startsWith(m.to);
                  return (
                    <div key={m.key}>
                      <Link href={m.to}>
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
                    </div>
                  );
                })}
                <Link href="/settings">
                  <div
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm cursor-pointer"
                    style={location === "/settings"
                      ? { background: "var(--surface-3)", color: "var(--text-base)", fontWeight: 600 }
                      : { color: "var(--text-dim)", fontWeight: 500 }}
                    onClick={() => setDrawer(false)}
                  >
                    <Settings className="h-4 w-4 shrink-0" />Company Settings
                  </div>
                </Link>
              </nav>
            </div>
          </div>
        )}
      </div>
    </PanelCtx.Provider>
  );
}
