-- ============================================================
-- Migration: email_dashboard_daily (live-aggregating view, times
-- out at 1M+ rows) -> email_daily_stats (incrementally-maintained
-- table, O(1) per webhook write, O(days x business units) per read).
--
-- Parity: matches the EXACT current definition of
-- public.email_dashboard_daily verbatim:
--
--   SELECT date(sent_at) AS email_date, business_unit,
--     count(*) AS total_emails,
--     count(*) FILTER (WHERE status = ANY (ARRAY['delivered','opened','clicked'])) AS delivered,
--     count(*) FILTER (WHERE status = ANY (ARRAY['opened','clicked'])) AS opened,
--     count(*) FILTER (WHERE status = 'clicked') AS clicked,
--     count(*) FILTER (WHERE status = 'bounced') AS bounced,
--     count(*) FILTER (WHERE status = 'failed') AS failed,
--     count(*) FILTER (WHERE status = 'complained') AS complained,
--     count(*) FILTER (WHERE status = 'suppressed') AS suppressed
--   FROM email_logs
--   WHERE sent_at IS NOT NULL
--   GROUP BY date(sent_at), business_unit;
--
-- Run each numbered section as its own statement/step (not all as
-- one blind paste) so you can confirm each step before the next.
-- Nothing here drops or modifies email_dashboard_daily or
-- email_logs — this only adds new objects.
-- ============================================================

-- Step 0 (optional but recommended, safe to run anytime):
-- refreshes planner statistics and adds a supporting index for the
-- OTHER slow paths (recent-emails, broadcast analytics), which
-- query email_logs directly and are unaffected by this migration.
-- Plain CREATE INDEX (not CONCURRENTLY) because Supabase's SQL
-- Editor runs scripts inside a transaction block, which CONCURRENTLY
-- cannot run inside. This briefly locks email_logs against writes
-- while it builds (one-time cost, likely tens of seconds on 1M+
-- rows) — the webhook's writes will just queue, not fail. If you'd
-- rather avoid that lock, delete this ANALYZE/CREATE INDEX pair and
-- run them later, outside the SQL Editor's transaction (e.g. via the
-- Supabase CLI or psql), with CONCURRENTLY restored.
ANALYZE public.email_logs;

CREATE INDEX IF NOT EXISTS idx_email_logs_business_unit_sent_at
ON public.email_logs (business_unit, sent_at DESC);


-- Step 1: create the new table. Same column set/shape as the view.
CREATE TABLE IF NOT EXISTS public.email_daily_stats (
  email_date     date NOT NULL,
  business_unit  text NOT NULL,
  total_emails   integer NOT NULL DEFAULT 0,
  delivered      integer NOT NULL DEFAULT 0,
  opened         integer NOT NULL DEFAULT 0,
  clicked        integer NOT NULL DEFAULT 0,
  bounced        integer NOT NULL DEFAULT 0,
  failed         integer NOT NULL DEFAULT 0,
  complained     integer NOT NULL DEFAULT 0,
  suppressed     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (email_date, business_unit)
);


-- Step 2: trigger function. Delta-based: subtracts the OLD row's
-- bucket contribution (UPDATE/DELETE) and adds the NEW row's
-- (INSERT/UPDATE), so a status progression (sent->delivered->opened)
-- shifts counts between buckets without double-counting or changing
-- total_emails. Skips (subtracts nothing / adds nothing) whenever
-- sent_at IS NULL, matching the view's WHERE clause exactly. Uses
-- date(sent_at) with NO timezone conversion, deliberately, to match
-- the view's exact (session-timezone-dependent) bucketing.
CREATE OR REPLACE FUNCTION public.sync_email_daily_stats()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.sent_at IS NOT NULL THEN
    UPDATE public.email_daily_stats SET
      total_emails = total_emails - 1,
      delivered    = delivered - (OLD.status = ANY (ARRAY['delivered','opened','clicked']))::int,
      opened       = opened - (OLD.status = ANY (ARRAY['opened','clicked']))::int,
      clicked      = clicked - (OLD.status = 'clicked')::int,
      bounced      = bounced - (OLD.status = 'bounced')::int,
      failed       = failed - (OLD.status = 'failed')::int,
      complained   = complained - (OLD.status = 'complained')::int,
      suppressed   = suppressed - (OLD.status = 'suppressed')::int
    WHERE email_date = date(OLD.sent_at) AND business_unit = OLD.business_unit;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.sent_at IS NOT NULL THEN
    INSERT INTO public.email_daily_stats
      (email_date, business_unit, total_emails, delivered, opened, clicked, bounced, failed, complained, suppressed)
    VALUES (
      date(NEW.sent_at), NEW.business_unit, 1,
      (NEW.status = ANY (ARRAY['delivered','opened','clicked']))::int,
      (NEW.status = ANY (ARRAY['opened','clicked']))::int,
      (NEW.status = 'clicked')::int,
      (NEW.status = 'bounced')::int,
      (NEW.status = 'failed')::int,
      (NEW.status = 'complained')::int,
      (NEW.status = 'suppressed')::int
    )
    ON CONFLICT (email_date, business_unit) DO UPDATE SET
      total_emails = email_daily_stats.total_emails + 1,
      delivered    = email_daily_stats.delivered + EXCLUDED.delivered,
      opened       = email_daily_stats.opened + EXCLUDED.opened,
      clicked      = email_daily_stats.clicked + EXCLUDED.clicked,
      bounced      = email_daily_stats.bounced + EXCLUDED.bounced,
      failed       = email_daily_stats.failed + EXCLUDED.failed,
      complained   = email_daily_stats.complained + EXCLUDED.complained,
      suppressed   = email_daily_stats.suppressed + EXCLUDED.suppressed;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- Step 3: attach the trigger BEFORE backfilling (see note below on
-- why this order matters).
DROP TRIGGER IF EXISTS trg_sync_email_daily_stats ON public.email_logs;
CREATE TRIGGER trg_sync_email_daily_stats
AFTER INSERT OR UPDATE OR DELETE ON public.email_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_email_daily_stats();


-- Step 4: backfill historical data. Deliberately a REPLACE (DO
-- UPDATE SET col = EXCLUDED.col), not an incremental add. Because
-- the trigger is already live (step 3), this full recomputation is
-- safe to run at any point afterward, including while the webhook
-- keeps writing — whatever the trigger already captured during the
-- gap gets overwritten with the same correct total, since this
-- query re-derives truth from the complete current email_logs
-- table rather than adding on top of the trigger's work.
INSERT INTO public.email_daily_stats
  (email_date, business_unit, total_emails, delivered, opened, clicked, bounced, failed, complained, suppressed)
SELECT
  date(sent_at) AS email_date,
  business_unit,
  count(*) AS total_emails,
  count(*) FILTER (WHERE status = ANY (ARRAY['delivered','opened','clicked'])) AS delivered,
  count(*) FILTER (WHERE status = ANY (ARRAY['opened','clicked'])) AS opened,
  count(*) FILTER (WHERE status = 'clicked') AS clicked,
  count(*) FILTER (WHERE status = 'bounced') AS bounced,
  count(*) FILTER (WHERE status = 'failed') AS failed,
  count(*) FILTER (WHERE status = 'complained') AS complained,
  count(*) FILTER (WHERE status = 'suppressed') AS suppressed
FROM public.email_logs
WHERE sent_at IS NOT NULL
GROUP BY date(sent_at), business_unit
ON CONFLICT (email_date, business_unit) DO UPDATE SET
  total_emails = EXCLUDED.total_emails,
  delivered    = EXCLUDED.delivered,
  opened       = EXCLUDED.opened,
  clicked      = EXCLUDED.clicked,
  bounced      = EXCLUDED.bounced,
  failed       = EXCLUDED.failed,
  complained   = EXCLUDED.complained,
  suppressed   = EXCLUDED.suppressed;


-- ============================================================
-- Step 5: VALIDATION — run all three before telling anyone to
-- switch the API. The last query must return ZERO rows.
-- These read the view, so they may take a while (the view itself
-- is the slow thing being replaced) — that's expected here, this
-- is a one-time manual check, not a web request.
-- ============================================================

-- 5a. Grand totals match.
SELECT
  (SELECT coalesce(sum(total_emails), 0) FROM public.email_dashboard_daily) AS view_total,
  (SELECT coalesce(sum(total_emails), 0) FROM public.email_daily_stats)     AS table_total;

-- 5b. Row counts match (same number of distinct email_date/business_unit buckets).
SELECT
  (SELECT count(*) FROM public.email_dashboard_daily) AS view_rows,
  (SELECT count(*) FROM public.email_daily_stats)     AS table_rows;

-- 5c. Full per-bucket diff — MUST return 0 rows for parity to be confirmed.
SELECT
  COALESCE(v.email_date, t.email_date) AS email_date,
  COALESCE(v.business_unit, t.business_unit) AS business_unit,
  v.total_emails AS view_total_emails, t.total_emails AS table_total_emails,
  v.delivered    AS view_delivered,    t.delivered    AS table_delivered,
  v.opened       AS view_opened,       t.opened       AS table_opened,
  v.clicked      AS view_clicked,      t.clicked      AS table_clicked,
  v.bounced      AS view_bounced,      t.bounced      AS table_bounced,
  v.failed       AS view_failed,       t.failed       AS table_failed,
  v.complained   AS view_complained,   t.complained   AS table_complained,
  v.suppressed   AS view_suppressed,   t.suppressed   AS table_suppressed
FROM public.email_dashboard_daily v
FULL OUTER JOIN public.email_daily_stats t
  ON v.email_date = t.email_date AND v.business_unit = t.business_unit
WHERE v.total_emails IS DISTINCT FROM t.total_emails
   OR v.delivered    IS DISTINCT FROM t.delivered
   OR v.opened       IS DISTINCT FROM t.opened
   OR v.clicked      IS DISTINCT FROM t.clicked
   OR v.bounced      IS DISTINCT FROM t.bounced
   OR v.failed       IS DISTINCT FROM t.failed
   OR v.complained   IS DISTINCT FROM t.complained
   OR v.suppressed   IS DISTINCT FROM t.suppressed
ORDER BY email_date DESC;
