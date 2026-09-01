"use client";

import type { SubjectPerformance } from "@/lib/types";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { EmptyState } from "./StateMessage";

export function SubjectPerformanceTable({
  subjects,
  selectedSubject,
  onSelectSubject,
}: {
  subjects: SubjectPerformance[];
  selectedSubject: string | null;
  onSelectSubject: (row: SubjectPerformance) => void;
}) {
  if (subjects.length === 0) {
    return <EmptyState message="No subjects found for this category and selection." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-4">Subject</th>
            <th className="py-2 pr-4">Sent</th>
            <th className="py-2 pr-4">Delivered</th>
            <th className="py-2 pr-4">Opened</th>
            <th className="py-2 pr-4">Clicked</th>
            <th className="py-2 pr-4">Bounced</th>
            <th className="py-2 pr-4">Delivery Rate</th>
            <th className="py-2 pr-4">Open Rate</th>
            <th className="py-2 pr-4">Click Rate</th>
            <th className="py-2 pr-4">Bounce Rate</th>
            <th className="py-2 pr-4">First Sent</th>
            <th className="py-2 pr-4">Last Sent</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {subjects.map((row) => (
            <tr
              key={row.subject}
              onClick={() => onSelectSubject(row)}
              className={`cursor-pointer text-gray-700 hover:bg-gray-50 ${
                selectedSubject === row.subject ? "bg-blue-50" : ""
              }`}
            >
              <td className="max-w-xs truncate py-2 pr-4 font-medium text-gray-900" title={row.subject}>
                {row.subject}
              </td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatNumber(row.sent)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatNumber(row.delivered)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatNumber(row.opened)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatNumber(row.clicked)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatNumber(row.bounced)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatPercent(row.deliveryRate)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatPercent(row.openRate)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatPercent(row.clickRate)}</td>
              <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatPercent(row.bounceRate)}</td>
              <td className="whitespace-nowrap py-2 pr-4 text-gray-500">{formatDateTime(row.firstSent)}</td>
              <td className="whitespace-nowrap py-2 pr-4 text-gray-500">{formatDateTime(row.lastSent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
