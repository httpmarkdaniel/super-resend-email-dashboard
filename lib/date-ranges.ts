import type { DateRangeKey } from "./types";

export interface ResolvedRange {
  from: string;
  to: string;
}

export const DASHBOARD_TIME_ZONE = "Asia/Manila";

const manilaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in Asia/Manila, as YYYY-MM-DD. Does not mutate any stored timestamp. */
function manilaTodayISO(): string {
  return manilaDateFormatter.format(new Date());
}

function addDaysToISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function firstOfMonthISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = new Date(`${value}T00:00:00Z`).getTime();
  return !Number.isNaN(time);
}

/**
 * Ranges are resolved against Asia/Manila calendar days (the business's
 * local day), not UTC or the server/browser's local timezone.
 */
export function resolveDateRange(
  key: DateRangeKey,
  customFrom?: string | null,
  customTo?: string | null
): ResolvedRange {
  const today = manilaTodayISO();

  switch (key) {
    case "today":
      return { from: today, to: today };
    case "last7days":
      return { from: addDaysToISODate(today, -6), to: today };
    case "last30days":
      return { from: addDaysToISODate(today, -29), to: today };
    case "thismonth":
      return { from: firstOfMonthISO(today), to: today };
    case "custom": {
      if (!customFrom || !customTo || !isValidISODate(customFrom) || !isValidISODate(customTo)) {
        throw new Error("Custom range requires valid 'from' and 'to' dates (YYYY-MM-DD).");
      }
      return customFrom <= customTo
        ? { from: customFrom, to: customTo }
        : { from: customTo, to: customFrom };
    }
    default: {
      const exhaustiveCheck: never = key;
      throw new Error(`Unsupported date range key: ${exhaustiveCheck}`);
    }
  }
}

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "last7days", label: "Last 7 Days" },
  { key: "last30days", label: "Last 30 Days" },
  { key: "thismonth", label: "This Month" },
  { key: "custom", label: "Custom" },
];
