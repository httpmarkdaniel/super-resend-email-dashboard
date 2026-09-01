export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-sm text-gray-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
      {label}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 text-sm text-red-600">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message = "No data available for this selection." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-1 text-sm text-gray-400">
      <p>{message}</p>
    </div>
  );
}
