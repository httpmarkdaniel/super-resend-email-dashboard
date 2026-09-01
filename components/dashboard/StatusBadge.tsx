const STATUS_STYLES: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  opened: "bg-teal-50 text-teal-700 ring-teal-600/20",
  clicked: "bg-amber-50 text-amber-700 ring-amber-600/20",
  bounced: "bg-red-50 text-red-700 ring-red-600/20",
  complained: "bg-red-50 text-red-700 ring-red-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  suppressed: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

const DEFAULT_STYLE = "bg-gray-100 text-gray-600 ring-gray-500/20";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = (status ?? "unknown").toLowerCase();
  const style = STATUS_STYLES[normalized] ?? DEFAULT_STYLE;
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
