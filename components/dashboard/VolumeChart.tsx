"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VolumePoint } from "@/lib/types";
import { CHART_CHROME, METRIC_COLORS } from "@/lib/chart-colors";
import { formatCompactNumber, formatNumber, formatShortDate } from "@/lib/format";

const SERIES: { key: keyof Omit<VolumePoint, "date">; label: string; color: string }[] = [
  { key: "totalEmails", label: "Sent", color: METRIC_COLORS.total },
  { key: "delivered", label: "Delivered", color: METRIC_COLORS.delivered },
  { key: "opened", label: "Opened", color: METRIC_COLORS.opened },
  { key: "clicked", label: "Clicked", color: METRIC_COLORS.clicked },
];

export function VolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {SERIES.map((series) => (
            <linearGradient key={series.key} id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={series.color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={series.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
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
          labelFormatter={(label) => formatShortDate(String(label))}
          formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
          contentStyle={{ borderRadius: 8, borderColor: CHART_CHROME.gridline, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_CHROME.secondaryText }} />
        {SERIES.map((series) => (
          <Area
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={series.label}
            stroke={series.color}
            strokeWidth={2}
            fill={`url(#fill-${series.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
