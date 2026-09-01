"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { ResponsiveContainer } from "recharts";
import type { MetricTotals } from "@/lib/types";
import { CHART_CHROME, METRIC_COLORS, STATUS_COLORS } from "@/lib/chart-colors";
import { formatPercent } from "@/lib/format";

export function EngagementChart({ totals }: { totals: MetricTotals }) {
  const data = [
    { name: "Delivery Rate", rate: totals.deliveryRate, color: METRIC_COLORS.delivered },
    { name: "Open Rate", rate: totals.openRate, color: METRIC_COLORS.opened },
    { name: "Click Rate", rate: totals.clickRate, color: METRIC_COLORS.clicked },
    { name: "Bounce Rate", rate: totals.bounceRate, color: STATUS_COLORS.critical },
  ].map((d) => ({ ...d, value: d.rate === null ? 0 : d.rate * 100 }));

  const hasData = data.some((d) => d.rate !== null);

  if (!hasData) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        No engagement data available for this selection.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={CHART_CHROME.gridline} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: CHART_CHROME.mutedText, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: CHART_CHROME.secondaryText, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          formatter={(_value, _name, item) => [
            formatPercent((item.payload as { rate: number | null }).rate),
            String((item.payload as { name: string }).name),
          ]}
          contentStyle={{ borderRadius: 8, borderColor: CHART_CHROME.gridline, fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
          <LabelList
            dataKey="rate"
            position="right"
            formatter={(v: unknown) => formatPercent(typeof v === "number" ? v : null)}
            style={{ fill: CHART_CHROME.secondaryText, fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
