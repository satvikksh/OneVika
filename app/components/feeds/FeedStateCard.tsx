import { RefreshCw } from "lucide-react";

/**
 * Shared loading / empty / error state card used by the YouTube Shorts feed
 * so every feed-mode swap looks and behaves the same.
 */
export default function FeedStateCard({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  spinning = false,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  spinning?: boolean;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-red-500">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-white/55">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30 hover:bg-amber-400/25"
        >
          <RefreshCw size={15} className={spinning ? "animate-spin" : ""} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}