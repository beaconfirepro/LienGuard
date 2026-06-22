/**
 * designSystem.js — single source of truth for tokens (DD-UI-1).
 * Mirrors Helm's src/shared/config/designSystem.js. Components import
 * COLORS.status etc. from here; CSS variables in index.css carry surfaces.
 */

export const COLORS = {
  // Surfaces (also available as CSS vars --bg / --surface / ...)
  bg: "#0f1117",
  surface: "#181b24",
  surface2: "#1e222d",
  surface3: "#252a37",
  border: "#2a2f3d",
  text: "#e8eaf0",
  textDim: "#8b90a0",
  textMuted: "#5c6070",
  accent: "#f59e0b",

  // Brand scales (index.css). Tints sanctioned only for these per brand guide.
  goldenOrange: { 50: "#fef5e7", 500: "#f59f0a", 600: "#c47f08" },
  mintLeaf: { 50: "#e8fdf6", 500: "#14eba3", 600: "#10bc83" },
  watermelon: { 50: "#fde8ec", 500: "#eb143f", 600: "#bc1033" },
  brightIndigo: { 50: "#edebf9", 500: "#4e38c7", 600: "#3e2d9f" },

  // Semantic status (DD-UI-5: always paired with an icon + label)
  status: {
    success: "#14eba3", // cleared / paid
    warning: "#f59f0a", // at-risk / due soon
    error: "#eb143f",   // overdue / lapsed
    info: "#6366f1",    // active / scheduled
  },
};

export const LAYOUT = {
  headerHeight: 64, // h-16
  subHeaderHeight: 56, // h-14
  sidebarExpanded: 236, // w-[236px]
  sidebarCollapsed: 70, // w-[70px]
  leftPanelWidth: 208,
  rightPanelWidth: 296,
  contentPadding: 24, // p-6
  radius: 12,
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
  // Below this the right panel stacks under content instead of a 3rd column.
  threeColMin: 470,
};

export const ANIMATION = {
  duration: { instant: 100, fast: 200, normal: 300, smooth: 500, dramatic: 800 },
  easing: {
    smooth: "cubic-bezier(0.215, 0.61, 0.355, 1)",
    snap: "cubic-bezier(0.19, 1, 0.22, 1)",
    gentle: "cubic-bezier(0.45, 0, 0.55, 1)",
  },
};

export const SPACING = [4, 8, 12, 16, 20, 24, 32, 48, 64];

// Escalation stages (collections pipeline ordering).
export const ESCALATION_STAGES = [
  "Soft reminder",
  "Pre-lien notice",
  "Lien filing",
  "Agency / attorney",
  "Write-off",
];

export const STAGE_COLOR = {
  "Soft reminder": "#14eba3",
  "Pre-lien notice": "#f59f0a",
  "Lien filing": "#eb143f",
  "Agency / attorney": "#a855f7",
  "Write-off": "#5c6070",
};
