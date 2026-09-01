/**
 * Fixed categorical + status slots from the validated reference palette.
 * Assigned once per metric identity and reused across every chart so the
 * same metric always reads as the same color.
 */
export const METRIC_COLORS = {
  total: "#2a78d6", // categorical slot 1 - blue
  delivered: "#eb6834", // categorical slot 2 - orange
  opened: "#1baf7a", // categorical slot 3 - aqua
  clicked: "#eda100", // categorical slot 4 - yellow
  bounced: "#d03b3b", // status critical
} as const;

export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export const CHART_CHROME = {
  gridline: "#e1e0d9",
  axis: "#c3c2b7",
  mutedText: "#898781",
  secondaryText: "#52514e",
} as const;
