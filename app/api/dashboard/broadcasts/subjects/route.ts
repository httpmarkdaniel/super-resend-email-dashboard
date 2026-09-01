import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveDateRange } from "@/lib/date-ranges";
import { safeRate } from "@/lib/format";
import { aggregateEmailsBySubject } from "@/lib/broadcast-aggregation";
import { classifyBroadcastCategory } from "@/lib/broadcast-classifier";
import {
  BUSINESS_UNITS,
  DATE_RANGE_KEYS,
  type BusinessUnit,
  type DateRangeKey,
  type SubjectPerformance,
  type SubjectPerformanceResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function isBusinessUnit(value: string): value is BusinessUnit {
  return (BUSINESS_UNITS as readonly string[]).includes(value);
}

function isDateRangeKey(value: string): value is DateRangeKey {
  return (DATE_RANGE_KEYS as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const businessUnitParam = searchParams.get("businessUnit") ?? "";
  const category = searchParams.get("category") ?? "";
  const rangeParam = searchParams.get("range") ?? "last7days";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Broadcast categories are always scoped to one concrete business unit —
  // "All" is not a valid target for this drilldown.
  if (!isBusinessUnit(businessUnitParam)) {
    return NextResponse.json({ error: "Invalid or missing businessUnit parameter." }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "Missing category parameter." }, { status: 400 });
  }
  if (!isDateRangeKey(rangeParam)) {
    return NextResponse.json({ error: "Invalid range parameter." }, { status: 400 });
  }

  let range: { from: string; to: string };
  try {
    range = resolveDateRange(rangeParam, fromParam, toParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid date range.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let aggregation;
  try {
    aggregation = await aggregateEmailsBySubject(supabase, businessUnitParam, range.from, range.to);
  } catch (err) {
    console.error("Subject aggregation failed:", err);
    return NextResponse.json({ error: "Failed to load subject performance." }, { status: 500 });
  }

  const subjects: SubjectPerformance[] = aggregation.subjects
    .filter((row) => classifyBroadcastCategory(row.businessUnit, row.subject) === category)
    .map((row) => ({
      subject: row.subject,
      businessUnit: row.businessUnit,
      broadcastCategory: category,
      sent: row.sent,
      delivered: row.delivered,
      opened: row.opened,
      clicked: row.clicked,
      bounced: row.bounced,
      failed: row.failed,
      complained: row.complained,
      deliveryRate: safeRate(row.delivered, row.sent),
      openRate: safeRate(row.opened, row.delivered),
      clickRate: safeRate(row.clicked, row.delivered),
      bounceRate: safeRate(row.bounced, row.sent),
      firstSent: row.firstSent,
      lastSent: row.lastSent,
    }))
    .sort((a, b) => b.sent - a.sent);

  const response: SubjectPerformanceResponse = {
    range,
    truncated: aggregation.truncated,
    scannedRows: aggregation.scannedRows,
    totalMatchingRows: aggregation.totalMatchingRows,
    subjects,
  };

  return NextResponse.json(response);
}
