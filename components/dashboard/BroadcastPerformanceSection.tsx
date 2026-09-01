"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type {
  BroadcastCategoryPerformance,
  BroadcastPerformanceResponse,
  BusinessUnitFilter,
  DateRangeKey,
  SubjectPerformance,
  SubjectPerformanceResponse,
} from "@/lib/types";
import { jsonFetcher } from "@/lib/fetcher";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { matchBusinessUnitAlias } from "@/lib/business-unit-search";
import { LoadingState, ErrorState, EmptyState } from "./StateMessage";
import { SubjectPerformanceTable } from "./SubjectPerformanceTable";
import { SubjectDrilldownPanel } from "./SubjectDrilldownPanel";

type SortKey = "totalSent" | "deliveryRate" | "openRate" | "clickRate" | "bounceRate" | "lastSent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "totalSent", label: "Total Sent" },
  { key: "deliveryRate", label: "Delivery Rate" },
  { key: "openRate", label: "Open Rate" },
  { key: "clickRate", label: "Click Rate" },
  { key: "bounceRate", label: "Bounce Rate" },
  { key: "lastSent", label: "Last Sent" },
];

interface SelectedCategory {
  businessUnit: string;
  category: string;
}

export function BroadcastPerformanceSection({
  businessUnit,
  range,
  customFrom,
  customTo,
  onBusinessUnitChange,
}: {
  businessUnit: BusinessUnitFilter;
  range: DateRangeKey;
  customFrom: string;
  customTo: string;
  /** Lets a recognized business-unit alias in search scope the whole dashboard, same as the tab/select. */
  onBusinessUnitChange?: (value: BusinessUnitFilter) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("totalSent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectPerformance | null>(null);

  const isCustomReady = range !== "custom" || (Boolean(customFrom) && Boolean(customTo));

  const categoriesParams = new URLSearchParams({ businessUnit, range });
  if (range === "custom") {
    categoriesParams.set("from", customFrom);
    categoriesParams.set("to", customTo);
  }
  const categoriesKey = isCustomReady ? `/api/dashboard/broadcasts?${categoriesParams.toString()}` : null;

  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
  } = useSWR<BroadcastPerformanceResponse>(categoriesKey, jsonFetcher);

  const subjectsParams = selectedCategory
    ? (() => {
        const p = new URLSearchParams({ businessUnit: selectedCategory.businessUnit, category: selectedCategory.category, range });
        if (range === "custom") {
          p.set("from", customFrom);
          p.set("to", customTo);
        }
        return p;
      })()
    : null;
  const subjectsKey = selectedCategory && isCustomReady ? `/api/dashboard/broadcasts/subjects?${subjectsParams!.toString()}` : null;

  const {
    data: subjectsData,
    error: subjectsError,
    isLoading: subjectsLoading,
  } = useSWR<SubjectPerformanceResponse>(subjectsKey, jsonFetcher);

  const filteredCategories = useMemo(() => {
    const rows = categoriesData?.categories ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) => r.broadcastCategory.toLowerCase().includes(q) || (r.topSubject ?? "").toLowerCase().includes(q)
        )
      : rows;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [categoriesData, search, sortKey, sortDir]);

  const filteredSubjects = useMemo(() => {
    const rows = subjectsData?.subjects ?? [];
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.subject.toLowerCase().includes(q)) : rows;
  }, [subjectsData, search]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function openCategory(row: BroadcastCategoryPerformance) {
    setSelectedCategory({ businessUnit: row.businessUnit, category: row.broadcastCategory });
    setSelectedSubject(null);
    setSearch("");
  }

  function backToCategories() {
    setSelectedCategory(null);
    setSelectedSubject(null);
    setSearch("");
  }

  function handleSearchChange(value: string) {
    setSearch(value);

    const aliasMatch = matchBusinessUnitAlias(value);
    if (aliasMatch && aliasMatch !== businessUnit && onBusinessUnitChange) {
      onBusinessUnitChange(aliasMatch);
      setSelectedCategory(null);
      setSelectedSubject(null);
      setSearch("");
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Broadcast Performance</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {selectedCategory
              ? `Subjects in "${selectedCategory.category}" — ${selectedCategory.businessUnit}`
              : "Campaign categories derived from business unit + subject"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <button
              type="button"
              onClick={backToCategories}
              className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back to Categories
            </button>
          ) : null}
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={selectedCategory ? "Search subjects…" : "Search categories or a business unit…"}
            className="w-56 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
      </div>

      {!isCustomReady ? (
        <EmptyState message="Select both a start and end date for the custom range." />
      ) : !selectedCategory ? (
        <>
          {categoriesError ? (
            <ErrorState message="Failed to load broadcast performance." />
          ) : categoriesLoading || !categoriesData ? (
            <LoadingState label="Loading broadcast performance…" />
          ) : (
            <>
              {categoriesData.truncated ? (
                <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This selection matches{" "}
                  {categoriesData.totalMatchingRows !== null
                    ? formatNumber(categoriesData.totalMatchingRows)
                    : `at least ${formatNumber(categoriesData.scannedRows)}`}{" "}
                  emails — showing a bounded sample of {formatNumber(categoriesData.scannedRows)} for performance.
                  Narrow the date range or business unit for exact totals.
                </p>
              ) : null}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">Broadcast Category</th>
                      <th className="py-2 pr-4">Business Unit</th>
                      {SORT_OPTIONS.map((opt) => (
                        <th
                          key={opt.key}
                          onClick={() => handleSort(opt.key)}
                          className="cursor-pointer select-none whitespace-nowrap py-2 pr-4 hover:text-gray-700"
                        >
                          {opt.label}
                          {sortKey === opt.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                        </th>
                      ))}
                      <th className="py-2 pr-4">Top Subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-sm text-gray-400">
                          No broadcast categories found for this selection.
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((row) => (
                        <tr
                          key={`${row.businessUnit}-${row.broadcastCategory}`}
                          onClick={() => openCategory(row)}
                          className="cursor-pointer text-gray-700 hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-4 font-medium text-gray-900">{row.broadcastCategory}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4">{row.businessUnit}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{formatNumber(row.totalSent)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{formatPercent(row.deliveryRate)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{formatPercent(row.openRate)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{formatPercent(row.clickRate)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums">{formatPercent(row.bounceRate)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-gray-500">{formatDateTime(row.lastSent)}</td>
                          <td className="max-w-[220px] truncate py-2.5 pr-4 text-gray-500" title={row.topSubject ?? undefined}>
                            {row.topSubject ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {subjectsError ? (
            <ErrorState message="Failed to load subject performance." />
          ) : subjectsLoading || !subjectsData ? (
            <LoadingState label="Loading subject performance…" />
          ) : (
            <>
              {subjectsData.truncated ? (
                <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This business unit matches{" "}
                  {subjectsData.totalMatchingRows !== null
                    ? formatNumber(subjectsData.totalMatchingRows)
                    : `at least ${formatNumber(subjectsData.scannedRows)}`}{" "}
                  emails in range — showing a bounded sample of {formatNumber(subjectsData.scannedRows)}.
                </p>
              ) : null}
              <SubjectPerformanceTable
                subjects={filteredSubjects}
                selectedSubject={selectedSubject?.subject ?? null}
                onSelectSubject={setSelectedSubject}
              />
              {selectedSubject ? (
                <SubjectDrilldownPanel subjectRow={selectedSubject} onClose={() => setSelectedSubject(null)} />
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
