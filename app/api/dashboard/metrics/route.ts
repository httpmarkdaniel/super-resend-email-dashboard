import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveDateRange } from "@/lib/date-ranges";
import { safeRate } from "@/lib/format";
import {
  BUSINESS_UNITS,
  DATE_RANGE_KEYS,
  type BusinessUnit,
  type BusinessUnitFilter,
  type BusinessUnitPerformance,
  type DailyMetricRow,
  type DashboardMetricsResponse,
  type DateRangeKey,
  type MetricTotals,
  type VolumePoint,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function isBusinessUnit(value: string): value is BusinessUnit {
  return (BUSINESS_UNITS as readonly string[]).includes(value);
}

function isDateRangeKey(value: string): value is DateRangeKey {
  return (DATE_RANGE_KEYS as readonly string[]).includes(value);
}

function emptyTotals(): MetricTotals {
  return {
    totalEmails: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    complained: 0,
    suppressed: 0,
    deliveryRate: null,
    openRate: null,
    clickRate: null,
    bounceRate: null,
  };
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const businessUnitParam = searchParams.get("businessUnit") ?? "All";
  const rangeParam = searchParams.get("range") ?? "last7days";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (businessUnitParam !== "All" && !isBusinessUnit(businessUnitParam)) {
    return NextResponse.json({ error: "Invalid businessUnit parameter." }, { status: 400 });
  }

  if (!isDateRangeKey(rangeParam)) {
    return NextResponse.json({ error: "Invalid range parameter." }, { status: 400 });
  }

  const businessUnitFilter = businessUnitParam as BusinessUnitFilter;

  let range: { from: string; to: string };
  try {
    range = resolveDateRange(rangeParam, fromParam, toParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid date range.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("email_daily_stats")
    .select(
      "email_date, business_unit, total_emails, delivered, opened, clicked, bounced, failed, complained, suppressed"
    )
    .gte("email_date", range.from)
    .lte("email_date", range.to)
    .in("business_unit", BUSINESS_UNITS as unknown as string[])
    .order("email_date", { ascending: true });

  if (error) {
    console.error("email_daily_stats query failed:", error);
    return NextResponse.json({ error: "Failed to load dashboard metrics." }, { status: 500 });
  }

  const rows = (data ?? []) as DailyMetricRow[];

  const scopedRows =
    businessUnitFilter === "All"
      ? rows
      : rows.filter((row) => row.business_unit === businessUnitFilter);

  // Totals + rates for the selected business unit / date range.
  const totals = emptyTotals();
  for (const row of scopedRows) {
    totals.totalEmails += row.total_emails ?? 0;
    totals.delivered += row.delivered ?? 0;
    totals.opened += row.opened ?? 0;
    totals.clicked += row.clicked ?? 0;
    totals.bounced += row.bounced ?? 0;
    totals.failed += row.failed ?? 0;
    totals.complained += row.complained ?? 0;
    totals.suppressed += row.suppressed ?? 0;
  }
  totals.deliveryRate = safeRate(totals.delivered, totals.totalEmails);
  totals.openRate = safeRate(totals.opened, totals.delivered);
  totals.clickRate = safeRate(totals.clicked, totals.delivered);
  totals.bounceRate = safeRate(totals.bounced, totals.totalEmails);

  // Volume-over-time, grouped by date, scoped to the selected business unit.
  const volumeByDate = new Map<string, VolumePoint>();
  for (const row of scopedRows) {
    const existing = volumeByDate.get(row.email_date) ?? {
      date: row.email_date,
      totalEmails: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
    existing.totalEmails += row.total_emails ?? 0;
    existing.delivered += row.delivered ?? 0;
    existing.opened += row.opened ?? 0;
    existing.clicked += row.clicked ?? 0;
    volumeByDate.set(row.email_date, existing);
  }
  const volume = Array.from(volumeByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Business unit comparison always covers all four units for the date range,
  // independent of the selected business unit filter.
  const businessUnitTotals = new Map<BusinessUnit, BusinessUnitPerformance>();
  for (const unit of BUSINESS_UNITS) {
    businessUnitTotals.set(unit, {
      businessUnit: unit,
      totalEmails: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      deliveryRate: null,
      openRate: null,
      clickRate: null,
    });
  }
  for (const row of rows) {
    if (!isBusinessUnit(row.business_unit)) continue;
    const entry = businessUnitTotals.get(row.business_unit)!;
    entry.totalEmails += row.total_emails ?? 0;
    entry.delivered += row.delivered ?? 0;
    entry.opened += row.opened ?? 0;
    entry.clicked += row.clicked ?? 0;
    entry.bounced += row.bounced ?? 0;
  }
  const businessUnits = BUSINESS_UNITS.map((unit) => {
    const entry = businessUnitTotals.get(unit)!;
    entry.deliveryRate = safeRate(entry.delivered, entry.totalEmails);
    entry.openRate = safeRate(entry.opened, entry.delivered);
    entry.clickRate = safeRate(entry.clicked, entry.delivered);
    return entry;
  });

  const response: DashboardMetricsResponse = {
    range,
    totals,
    volume,
    businessUnits,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
