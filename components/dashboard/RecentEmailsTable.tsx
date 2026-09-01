"use client";

import type { EmailLogRow } from "@/lib/types";
import { formatDateTime, formatRecipients } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./StateMessage";

export function RecentEmailsTable({
  rows,
  page,
  hasMore,
  onPrevPage,
  onNextPage,
}: {
  rows: EmailLogRow[];
  page: number;
  hasMore: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No recent emails found for this selection." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Business Unit</th>
              <th className="py-2 pr-4">Sender</th>
              <th className="py-2 pr-4">Subject</th>
              <th className="py-2 pr-4">Recipient</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.resend_email_id} className="text-gray-700">
                <td className="whitespace-nowrap py-2.5 pr-4 text-gray-500">
                  {formatDateTime(row.sent_at)}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4">{row.business_unit ?? "—"}</td>
                <td className="whitespace-nowrap py-2.5 pr-4 text-gray-500">{row.sender ?? "—"}</td>
                <td className="max-w-xs truncate py-2.5 pr-4" title={row.subject ?? undefined}>
                  {row.subject ?? "—"}
                </td>
                <td className="max-w-xs truncate py-2.5 pr-4 text-gray-500" title={row.recipients?.join(", ")}>
                  {formatRecipients(row.recipients)}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-4">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-500">Page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={!hasMore}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
