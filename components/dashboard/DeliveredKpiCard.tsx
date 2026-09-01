import { METRIC_COLORS } from "@/lib/chart-colors";

export function DeliveredKpiCard({
  value,
  rate,
  opened,
  openRate,
  clicked,
  clickRate,
  className = "",
}: {
  value: string;
  rate: string;
  opened: string;
  openRate: string;
  clicked: string;
  clickRate: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: METRIC_COLORS.delivered }} />
        <p className="text-sm text-gray-500">Delivered</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{rate} delivery rate</p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
        <div>
          <p className="text-xs text-gray-500">Opened</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{opened}</p>
          <p className="text-xs text-gray-500">{openRate} open rate</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Clicked</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{clicked}</p>
          <p className="text-xs text-gray-500">{clickRate} click rate</p>
        </div>
      </div>
    </div>
  );
}
