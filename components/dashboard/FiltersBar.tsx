"use client";

import { DATE_RANGE_OPTIONS } from "@/lib/date-ranges";
import type { BusinessUnitFilter, DateRangeKey } from "@/lib/types";
import { BUSINESS_UNITS } from "@/lib/types";

const BUSINESS_UNIT_OPTIONS: BusinessUnitFilter[] = ["All", ...BUSINESS_UNITS];

export function FiltersBar({
  businessUnit,
  onBusinessUnitChange,
  range,
  onRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: {
  businessUnit: BusinessUnitFilter;
  onBusinessUnitChange: (value: BusinessUnitFilter) => void;
  range: DateRangeKey;
  onRangeChange: (value: DateRangeKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Business Unit</span>
          <select
            value={businessUnit}
            onChange={(e) => onBusinessUnitChange(e.target.value as BusinessUnitFilter)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {BUSINESS_UNIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Date Range</span>
          <select
            value={range}
            onChange={(e) => onRangeChange(e.target.value as DateRangeKey)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {range === "custom" ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
