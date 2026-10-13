// ONE-TIME bounded catch-up import.
//
// Backfills public.email_logs with emails sent via Resend that are newer
// than the current MAX(sent_at) in the table (the gap left when the
// historical importer was manually stopped before the webhook was fully
// active). Does NOT touch older history and does NOT delete anything.
//
// Run with:
//   node --env-file=.env.local scripts/catchup-import.mjs
//
// Optional:
//   CATCHUP_AFTER=2026-09-01T09:19:38Z  start after this time instead of MAX(sent_at)
//     (needed when the webhook has already written newer rows, e.g. after an outage)
//   MAX_PAGES=10000                      raise the safety valve for a long gap
//
// Each page is upserted as soon as it's fetched, so an interrupted run keeps
// what it imported and can simply be run again.
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !RESEND_API_KEY) {
  console.error("Missing required env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, RESEND_API_KEY).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const resend = new Resend(RESEND_API_KEY);

const PAGE_SIZE = 100;
const REQUEST_DELAY_MS = 150; // stay well under Resend's 10 req/s rate limit
// Safety valve: this is a bounded catch-up, not the historical importer. If we
// haven't reached the cutoff within this many pages, stop and surface it
// rather than silently sliding into a full historical re-import.
const MAX_PAGES = Number(process.env.MAX_PAGES) || 3000;

// Same rules as app/api/resend-webhook/route.ts — duplicated intentionally
// so this one-time script has no dependency on (and makes no change to)
// the webhook route.
function classifyBusinessUnit(from = "") {
  const sender = from.toLowerCase();

  if (sender.includes("info@hmr.ph")) return "HMR Retail";
  if (sender.includes("inquire@hmr.ph") || sender.includes("meredith.amit@hmr.ph")) return "HMR Auctions";
  if (sender.includes("warren.carman@hmr.ph")) return "HMR Solutions";
  if (
    sender.includes("envirocycle-inc.com") || // any subdomain, e.g. connect.
    sender.includes("envirocycle@marketing.hmr.ph")
  ) {
    return "Envirocycle";
  }

  return "Other";
}

function normalizeToIso(raw) {
  // Resend returns "2026-09-01 06:50:56.508000+00" — normalize to strict ISO 8601.
  return raw.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCutoff() {
  if (process.env.CATCHUP_AFTER) {
    const after = new Date(process.env.CATCHUP_AFTER);
    if (Number.isNaN(after.getTime())) throw new Error(`Invalid CATCHUP_AFTER: ${process.env.CATCHUP_AFTER}`);
    return after;
  }
  const { data, error } = await supabase
    .from("email_logs")
    .select("sent_at")
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) throw new Error(`Failed to read MAX(sent_at) from email_logs: ${error.message}`);
  if (!data || data.length === 0 || !data[0].sent_at) {
    throw new Error("email_logs has no existing sent_at values — refusing to run an unbounded catch-up.");
  }
  return new Date(data[0].sent_at);
}

async function main() {
  const cutoff = await getCutoff();
  console.log(`Catch-up starting after: ${cutoff.toISOString()}`);

  const now = new Date();
  const toImport = [];
  let upserted = 0;
  let cursorAfter;
  let fetchedTotal = 0;
  let page = 0;
  let stoppedAtCutoff = false;

  while (true) {
    page += 1;
    if (page > MAX_PAGES) {
      throw new Error(
        `Safety stop: exceeded ${MAX_PAGES} pages (${fetchedTotal} emails) without reaching the cutoff ` +
          `(${cutoff.toISOString()}). Refusing to continue in case this has become an unbounded historical ` +
          `import. Re-run with a higher MAX_PAGES only after confirming this is expected.`
      );
    }
    const { data: result, error } = await resend.emails.list({
      limit: PAGE_SIZE,
      ...(cursorAfter ? { after: cursorAfter } : {}),
    });

    if (error) {
      throw new Error(`Resend emails.list failed on page ${page}: ${error.message ?? JSON.stringify(error)}`);
    }

    const items = result?.data ?? [];
    if (items.length === 0) break;

    fetchedTotal += items.length;
    const oldestOnPage = items[items.length - 1].created_at;
    console.log(
      `Fetched: ${items.length} (page ${page}, running total ${fetchedTotal}, oldest on page: ${oldestOnPage})`
    );

    for (const item of items) {
      const createdAt = new Date(normalizeToIso(item.created_at));
      if (createdAt <= cutoff) {
        stoppedAtCutoff = true;
        break;
      }
      toImport.push({
        resend_email_id: item.id,
        business_unit: classifyBusinessUnit(item.from),
        sender: item.from,
        recipients: item.to,
        subject: item.subject ?? null,
        status: item.last_event,
        sent_at: createdAt.toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const pending = toImport.slice(upserted);
    if (pending.length) {
      const { error: upsertError } = await supabase.from("email_logs").upsert(pending, { onConflict: "resend_email_id" });
      if (upsertError) {
        throw new Error(`Upsert failed on page ${page}: ${upsertError.message}`);
      }
      upserted += pending.length;
      console.log(`Inserted/upserted: ${upserted}`);
    }

    if (stoppedAtCutoff || !result.has_more) break;

    cursorAfter = items[items.length - 1].id;
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Total processed (newer than cutoff): ${toImport.length}`);

  if (toImport.length === 0) {
    console.log("Nothing to catch up — email_logs is already up to date.");
    return;
  }

  const newest = toImport[0];
  const oldest = toImport[toImport.length - 1];
  console.log(`Newest processed: ${newest.sent_at} (${newest.resend_email_id})`);

  const businessUnitCounts = toImport.reduce((acc, row) => {
    acc[row.business_unit] = (acc[row.business_unit] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n=== Catch-up summary ===");
  console.log(`Total emails added/updated: ${upserted}`);
  console.log(`Oldest catch-up email: ${oldest.sent_at} (${oldest.resend_email_id})`);
  console.log(`Newest catch-up email: ${newest.sent_at} (${newest.resend_email_id})`);
  console.log("Business-unit counts imported:");
  for (const [unit, count] of Object.entries(businessUnitCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${unit}: ${count}`);
  }

  // Verify email_dashboard_daily reflects the new rows.
  const manilaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);

  const { count: logsCount, error: logsCountError } = await supabase
    .from("email_logs")
    .select("resend_email_id", { count: "exact", head: true })
    .eq("business_unit", "HMR Auctions")
    .gte("sent_at", `${manilaToday}T00:00:00+08:00`)
    .lt("sent_at", `${manilaToday}T23:59:59.999+08:00`);

  if (logsCountError) throw new Error(`Post-import email_logs count failed: ${logsCountError.message}`);

  const { data: dailyRow, error: dailyError } = await supabase
    .from("email_dashboard_daily")
    .select("total_emails")
    .eq("business_unit", "HMR Auctions")
    .eq("email_date", manilaToday)
    .maybeSingle();

  if (dailyError) throw new Error(`Post-import email_dashboard_daily read failed: ${dailyError.message}`);

  console.log("\n=== Post-import verification (HMR Auctions, today) ===");
  console.log(`email_logs count (today, Manila): ${logsCount}`);
  console.log(`email_dashboard_daily total_emails (today): ${dailyRow?.total_emails ?? "no row found"}`);
  if (dailyRow && dailyRow.total_emails === logsCount) {
    console.log("email_dashboard_daily immediately reflects the new email_logs records.");
  } else {
    console.log(
      "email_dashboard_daily does NOT match email_logs yet — it may be a cached/materialized view that needs a refresh."
    );
  }
}

main().catch((err) => {
  console.error("Catch-up import failed:", err);
  process.exit(1);
});
