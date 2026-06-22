/**
 * Tailwind config for Lien & Collections.
 * Colors map to CSS variables defined in src/index.css (dark-first, light-compatible)
 * plus the Helm brand status scales (golden-orange / watermelon / mint-leaf / bright-indigo).
 * DD-UI-1: tokens mirror Helm's designSystem.js so the module is visually identical to Helm.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          dim: "var(--text-dim)",
          muted: "var(--text-muted)",
        },
        accent: { DEFAULT: "#f59e0b", dim: "rgba(245,158,11,0.15)" },
        // Status / severity (DD-UI-1, DD-UI-5)
        success: "#14eba3", // mint-leaf — cleared / paid
        warning: "#f59f0a", // golden-orange — at-risk / due soon
        error: "#eb143f",   // watermelon — overdue / lapsed
        info: "#6366f1",    // indigo — active / scheduled
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      keyframes: {
        "fade-up": { from: { opacity: 0, transform: "translateY(14px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "accordion-down": { from: { height: 0 }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: 0 } },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
