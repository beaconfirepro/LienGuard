import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import {
  FolderOpen,
  DollarSign,
  AlertTriangle,
  Settings,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Projects", href: "/", icon: FolderOpen },
  { label: "Collections", href: "/collections", icon: DollarSign },
  { label: "Holds", href: "/holds", icon: AlertTriangle },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

function NavIcon({
  icon: Icon,
  label,
  href,
  active,
  collapsed,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SideRail() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-full">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
        <span className="text-base font-semibold leading-tight">
          Lien &amp; Collections
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavIcon
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={
              item.href === "/"
                ? location === "/"
                : location.startsWith(item.href)
            }
          />
        ))}
      </nav>
    </aside>
  );
}

function BottomTabBar() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex h-14 border-t border-sidebar-border bg-sidebar">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? location === "/"
            : location.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
              active
                ? "text-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * AppShell — wraps all pages with the responsive navigation chrome.
 *
 * Layout:
 * - Desktop (≥768 px): fixed left side-rail + scrollable main area
 * - Mobile (<768 px): full-width content + fixed bottom tab bar
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isMobile } = useResponsive();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <SideRail />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {children}
      </div>
      {isMobile && <BottomTabBar />}
    </div>
  );
}
