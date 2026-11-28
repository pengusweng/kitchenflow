import { AlertCircle } from "lucide-react";

export default function KitchenPanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg bg-surface-hover px-3 py-2 text-sm">
      <p className="flex items-start gap-2 text-danger-ink">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-md px-2 font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted"
      >
        Retry
      </button>
    </div>
  );
}
