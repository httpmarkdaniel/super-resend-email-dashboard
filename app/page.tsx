"use client";

import { useState } from "react";
import useSWR from "swr";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import { FiltersBar } from "@/components/dashboard/FiltersBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DeliveredKpiCard } from "@/components/dashboard/DeliveredKpiCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { BusinessUnitChart } from "@/components/dashboard/BusinessUnitChart";
import { RecentEmailsTable } from "@/components/dashboard/RecentEmailsTable";
import { BroadcastPerformanceSection } from "@/components/dashboard/BroadcastPerformanceSection";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/StateMessage";
import { resolveDateRange } from "@/lib/date-ranges";
import { formatNumber, formatPercent } from "@/lib/format";
import { jsonFetcher } from "@/lib/fetcher";
import { METRIC_COLORS, STATUS_COLORS } from "@/lib/chart-colors";
import type {
  BusinessUnitFilter,
  DashboardMetricsResponse,
  DateRangeKey,
  RecentEmailsResponse,
} from "@/lib/types";

const RECENT_EMAILS_PAGE_SIZE = 20;

export default function Home() {
  const initialCustomRange = resolveDateRange("last7days");

  const [businessUnit, setBusinessUnit] = useState<BusinessUnitFilter>("All");
  const [range, setRange] = useState<DateRangeKey>("last7days");
  const [customFrom, setCustomFrom] = useState(initialCustomRange.from);
  const [customTo, setCustomTo] = useState(initialCustomRange.to);
  const [recentPage, setRecentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isCustomRangeReady = range !== "custom" || (Boolean(customFrom) && Boolean(customTo));

  const metricsParams = new URLSearchParams({ businessUnit, range });
  if (range === "custom") {
    metricsParams.set("from", customFrom);
    metricsParams.set("to", customTo);
  }
  const metricsKey = isCustomRangeReady ? `/api/dashboard/metrics?${metricsParams.toString()}` : null;

  const {
    data: metrics,
    error: metricsError,
    isLoading: metricsLoading,
    mutate: retryMetrics,
  } = useSWR<DashboardMetricsResponse>(metricsKey, jsonFetcher, {
    onSuccess: () => setLastUpdated(new Date()),
  });

  const recentEmailsParams = new URLSearchParams({
    businessUnit,
    page: String(recentPage),
    pageSize: String(RECENT_EMAILS_PAGE_SIZE),
  });
  const recentEmailsKey = `/api/dashboard/recent-emails?${recentEmailsParams.toString()}`;

  const {
    data: recentEmails,
    error: recentError,
    isLoading: recentLoading,
    mutate: retryRecentEmails,
  } = useSWR<RecentEmailsResponse>(recentEmailsKey, jsonFetcher);

  function handleBusinessUnitChange(value: BusinessUnitFilter) {
    setBusinessUnit(value);
    setRecentPage(1);
  }

  let metricsSection: React.ReactNode;

  if (!isCustomRangeReady) {
    metricsSection = (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Select both a start and end date for the custom range.
      </div>
    );
  } else if (metricsError) {
    metricsSection = (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ErrorState message={metricsError.message} onRetry={() => retryMetrics()} />
      </div>
    );
  } else if (metricsLoading || !metrics) {
    metricsSection = (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <LoadingState label="Loading metrics…" />
      </div>
    );
  } else {
    const totals = metrics.totals;
    metricsSection = (
      <>
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <KpiCard label="Total Sent" value={formatNumber(totals.totalEmails)} dotColor={METRIC_COLORS.total} />
          <DeliveredKpiCard
            className="col-span-2 lg:col-span-2"
            value={formatNumber(totals.delivered)}
            rate={formatPercent(totals.deliveryRate)}
            opened={formatNumber(totals.opened)}
            openRate={formatPercent(totals.openRate)}
            clicked={formatNumber(totals.clicked)}
            clickRate={formatPercent(totals.clickRate)}
          />
          <KpiCard
            label="Bounced"
            value={formatNumber(totals.bounced)}
            sublabel={`${formatPercent(totals.bounceRate)} bounce rate`}
            tone={totals.bounced > 0 ? "critical" : "neutral"}
            dotColor={totals.bounced > 0 ? STATUS_COLORS.critical : undefined}
          />
          <KpiCard
            label="Failed"
            value={formatNumber(totals.failed)}
            tone={totals.failed > 0 ? "critical" : "neutral"}
            dotColor={totals.failed > 0 ? STATUS_COLORS.critical : undefined}
          />
          <KpiCard
            label="Complaints"
            value={formatNumber(totals.complained)}
            tone={totals.complained > 0 ? "warning" : "neutral"}
            dotColor={totals.complained > 0 ? STATUS_COLORS.warning : undefined}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard
            title="Email Volume Over Time"
            subtitle="Sent, delivered, opened, and clicked per day"
            className="xl:col-span-2"
          >
            {metrics.volume.length === 0 ? (
              <EmptyState message="No email volume recorded for this range." />
            ) : (
              <VolumeChart data={metrics.volume} />
            )}
          </ChartCard>

          <ChartCard title="Engagement Performance" subtitle="Rates for the selected filters">
            <EngagementChart totals={totals} />
          </ChartCard>
        </section>

        <section>
          <ChartCard
            title="Business Unit Performance"
            subtitle="Volume and engagement across all business units for the selected range"
          >
            <BusinessUnitChart data={metrics.businessUnits} />
          </ChartCard>
        </section>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              HMR Email Analytics
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">Resend Email Performance Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated ? (
              <span className="text-xs text-gray-400">
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-US", {
                  timeZone: "Asia/Manila",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                PHT
              </span>
            ) : null}
            <LiveIndicator />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <FiltersBar
          businessUnit={businessUnit}
          onBusinessUnitChange={handleBusinessUnitChange}
          range={range}
          onRangeChange={setRange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        {metricsSection}

        <BroadcastPerformanceSection
          businessUnit={businessUnit}
          range={range}
          customFrom={customFrom}
          customTo={customTo}
          onBusinessUnitChange={handleBusinessUnitChange}
        />

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Emails</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Most recent emails logged, independent of the date range filter above.
            </p>
          </div>

          {recentError ? (
            <ErrorState message={recentError.message} onRetry={() => retryRecentEmails()} />
          ) : recentLoading || !recentEmails ? (
            <LoadingState label="Loading recent emails…" />
          ) : (
            <RecentEmailsTable
              rows={recentEmails.rows}
              page={recentEmails.page}
              hasMore={recentEmails.hasMore}
              onPrevPage={() => setRecentPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setRecentPage((p) => (recentEmails.hasMore ? p + 1 : p))}
            />
          )}
        </section>
      </div>
    </main>
  );
}
