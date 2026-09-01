"use client";

import { useState } from "react";
import useSWR from "swr";
import type { SubjectEmailsResponse, SubjectPerformance } from "@/lib/types";
import { jsonFetcher } from "@/lib/fetcher";
import { formatDateTime, formatNumber, formatPercent, formatRecipients } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { LoadingState, ErrorState } from "./StateMessage";

const PAGE_SIZE = 25;

export function SubjectDrilldownPanel({
  subjectRow,
  onClose,
}: {
  subjectRow: SubjectPerformance;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    businessUnit: subjectRow.businessUnit,
    subject: subjectRow.subject,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  const { data, error, isLoading } = useSWR<SubjectEmailsResponse>(
    `/api/dashboard/subject-emails?${params.toString()}`,
    jsonFetcher
  );

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Subject Drilldown</p>
          <h4 className="mt-0.5 text-sm font-semibold text-gray-900">{subjectRow.subject}</h4>
          <p className="mt-0.5 text-xs text-gray-500">
            {subjectRow.businessUnit} · {subjectRow.broadcastCategory}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
        >
          Close
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <Stat label="Total Sent" value={formatNumber(subjectRow.sent)} />
        <Stat label="Delivered" value={formatNumber(subjectRow.delivered)} sub={formatPercent(subjectRow.deliveryRate)} />
        <Stat label="Opened" value={formatNumber(subjectRow.opened)} sub={formatPercent(subjectRow.openRate)} />
        <Stat label="Clicked" value={formatNumber(subjectRow.clicked)} sub={formatPercent(subjectRow.clickRate)} />
        <Stat label="Bounced" value={formatNumber(subjectRow.bounced)} sub={formatPercent(subjectRow.bounceRate)} />
        <Stat label="Failed" value={formatNumber(subjectRow.failed)} />
        <Stat label="Complaints" value={formatNumber(subjectRow.complained)} />
        <Stat label="First / Last Sent" value={formatDateTime(subjectRow.firstSent)} sub={formatDateTime(subjectRow.lastSent)} />
      </dl>

      <div className="mt-4 border-t border-gray-200 pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Recent Individual Emails
        </p>

        {error ? (
          <ErrorState message="Failed to load emails for this subject." />
        ) : isLoading || !data ? (
          <LoadingState label="Loading emails…" />
        ) : data.rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No emails found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Recipient</th>
                    <th className="py-2 pr-4">Sender</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((row) => (
                    <tr key={row.resend_email_id} className="text-gray-700">
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-500">{formatDateTime(row.sent_at)}</td>
                      <td className="max-w-[220px] truncate py-2 pr-4" title={row.recipients?.join(", ")}>
                        {formatRecipients(row.recipients)}
                      </td>
                      <td className="max-w-[200px] truncate py-2 pr-4 text-gray-500">{row.sender ?? "—"}</td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Page {page}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => (data.hasMore ? p + 1 : p))}
                  disabled={!data.hasMore}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Load more
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-gray-900">{value}</dd>
      {sub ? <dd className="text-xs text-gray-500">{sub}</dd> : null}
    </div>
  );
}
