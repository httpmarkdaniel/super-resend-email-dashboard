"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BusinessUnitPerformance } from "@/lib/types";
import { CHART_CHROME, METRIC_COLORS } from "@/lib/chart-colors";
import { formatCompactNumber, formatNumber } from "@/lib/format";

const SERIES: { key: keyof Pick<BusinessUnitPerformance, "totalEmails" | "delivered" | "opened" | "clicked">; label: string; color: string }[] = [
  { key: "totalEmails", label: "Sent", color: METRIC_COLORS.total },
  { key: "delivered", label: "Delivered", color: METRIC_COLORS.delivered },
  { key: "opened", label: "Opened", color: METRIC_COLORS.opened },
  { key: "clicked", label: "Clicked", color: METRIC_COLORS.clicked },
];

export function BusinessUnitChart({ data }: { data: BusinessUnitPerformance[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
        <XAxis
          dataKey="businessUnit"
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          axisLine={{ stroke: CHART_CHROME.axis }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCompactNumber(v)}
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
          contentStyle={{ borderRadius: 8, borderColor: CHART_CHROME.gridline, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_CHROME.secondaryText }} />
        {SERIES.map((series) => (
          <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
