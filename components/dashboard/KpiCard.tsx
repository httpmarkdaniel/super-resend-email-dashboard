type Tone = "neutral" | "good" | "warning" | "critical";

const DOT_TONE: Record<Tone, string> = {
  neutral: "bg-gray-300",
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-gray-900",
  good: "text-gray-900",
  warning: "text-gray-900",
  critical: "text-gray-900",
};

export function KpiCard({
  label,
  value,
  sublabel,
  tone = "neutral",
  dotColor,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: Tone;
  /** Optional explicit dot color (hex), overrides tone-based dot color. */
  dotColor?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {dotColor ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_TONE[tone]}`} />
        )}
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${VALUE_TONE[tone]}`}>{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-gray-500">{sublabel}</p> : null}
    </div>
  );
}
