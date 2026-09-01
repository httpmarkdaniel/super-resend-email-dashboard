import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { classifyBroadcastCategory } from "@/lib/broadcast-classifier";
import { BUSINESS_UNITS, type BusinessUnit, type EmailLogRow, type RecentEmailsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function isBusinessUnit(value: string): value is BusinessUnit {
  return (BUSINESS_UNITS as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const businessUnitParam = searchParams.get("businessUnit") ?? "All";
  if (businessUnitParam !== "All" && !isBusinessUnit(businessUnitParam)) {
    return NextResponse.json({ error: "Invalid businessUnit parameter." }, { status: 400 });
  }

  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSizeParam = Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(pageSizeParam, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const offset = (page - 1) * pageSize;

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("email_logs")
    .select("resend_email_id, business_unit, sender, recipients, subject, status, sent_at")
    .order("sent_at", { ascending: false, nullsFirst: false })
    // Fetch one extra row to cheaply detect a next page without a COUNT(*) over a 1M+ row table.
    .range(offset, offset + pageSize);

  query =
    businessUnitParam === "All"
      ? query.in("business_unit", BUSINESS_UNITS as unknown as string[])
      : query.eq("business_unit", businessUnitParam);

  const { data, error } = await query;

  if (error) {
    console.error("email_logs query failed:", error);
    return NextResponse.json({ error: "Failed to load recent emails." }, { status: 500 });
  }

  const rows = (data ?? []) as EmailLogRow[];
  const hasMore = rows.length > pageSize;

  const rowsWithCategory = rows.slice(0, pageSize).map((row) => ({
    ...row,
    broadcast_category: classifyBroadcastCategory(row.business_unit, row.subject),
  }));

  const response: RecentEmailsResponse = {
    rows: rowsWithCategory,
    page,
    pageSize,
    hasMore,
  };

  return NextResponse.json(response);
}
