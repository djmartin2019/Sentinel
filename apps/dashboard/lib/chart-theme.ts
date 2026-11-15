// Recharts takes literal colors (SVG attributes), so mirror the theme tokens here.
export const chartTheme = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#737373",
  axisFont: "var(--font-geist-mono), ui-monospace, monospace",
  avg: "#1ea7ff",
  p95: "#5b7cff",
  p99: "#9d7bff",
  up: "#22c55e",
  degraded: "#f59e0b",
  down: "#ef4444",
} as const;

export const axisTick = {
  fill: chartTheme.axis,
  fontSize: 10,
  fontFamily: chartTheme.axisFont,
} as const;
