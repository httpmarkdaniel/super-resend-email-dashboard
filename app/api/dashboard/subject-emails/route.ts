import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { BUSINESS_UNITS, type BusinessUnit, type EmailLogRow, type SubjectEmailsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

function isBusinessUnit(value: string): value is BusinessUnit {
  return (BUSINESS_UNITS as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const businessUnitParam = searchParams.get("businessUnit") ?? "";
  const subject = searchParams.get("subject");

  if (!isBusinessUnit(businessUnitParam)) {
    return NextResponse.json({ error: "Invalid or missing businessUnit parameter." }, { status: 400 });
  }
  if (subject === null) {
    return NextResponse.json({ error: "Missing subject parameter." }, { status: 400 });
  }

  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSizeParam = Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? Math.min(pageSizeParam, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

  const offset = (page - 1) * pageSize;

  const supabase = getSupabaseAdmin();

  // Deliberately unordered — ordering this table (even by primary key) was
  // observed to hit Postgres statement timeouts without a supporting index
  // (see broadcast-aggregation.ts). Rows come back in scan order, not
  // strictly by sent_at.
  const { data, error } = await supabase
    .from("email_logs")
    .select("resend_email_id, business_unit, sender, recipients, subject, status, sent_at")
    .eq("business_unit", businessUnitParam)
    .eq("subject", subject)
    .range(offset, offset + pageSize);

  if (error) {
    console.error("email_logs subject query failed:", error);
    return NextResponse.json({ error: "Failed to load emails for this subject." }, { status: 500 });
  }

  const rows = (data ?? []) as EmailLogRow[];
  const hasMore = rows.length > pageSize;

  const response: SubjectEmailsResponse = {
    rows: rows.slice(0, pageSize),
    page,
    pageSize,
    hasMore,
  };

  return NextResponse.json(response);
}
