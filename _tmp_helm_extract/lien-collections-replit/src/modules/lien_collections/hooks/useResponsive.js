import { useState, useEffect } from "react";
import { LAYOUT } from "@/config/designSystem";

/**
 * useResponsive (C-13) — phone / tablet / desktop flags (DD-UI-3).
 * Helm ships an equivalent hook; kept API-identical for clean integration.
 */
export function useResponsive() {
  const get = () => (typeof window === "undefined" ? 1366 : window.innerWidth);
  const [width, setWidth] = useState(get);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    width,
    isPhone: width < LAYOUT.mobileBreakpoint,
    isTablet: width >= LAYOUT.mobileBreakpoint && width < LAYOUT.tabletBreakpoint,
    isDesktop: width >= LAYOUT.tabletBreakpoint,
  };
}
