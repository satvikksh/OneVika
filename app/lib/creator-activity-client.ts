// app/lib/creator-activity-client.ts
export type ClientIngestEvent = {
  eventId?: string;
  eventType:
    | "view_start"
    | "watch"
    | "complete"
    | "like"
    | "comment"
    | "follow"
    | "share";
  contentId?: string;
  creatorId?: string;
  watchedMs?: number;
  durationMs?: number;
  completed?: boolean;
  commentText?: string;
};

const queue: ClientIngestEvent[] = [];
const MAX_QUEUE_SIZE = 20;
const FLUSH_INTERVAL_MS = 4000;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function generateEventId() {
  try {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function reportCreatorActivity(events: ClientIngestEvent[]) {
  if (typeof window === "undefined" || events.length === 0) return;
  queue.push(...events);

  if (queue.length >= MAX_QUEUE_SIZE) {
    flushCreatorActivity();
    return;
  }

  if (flushTimer) return;
  flushTimer = setTimeout(flushCreatorActivity, FLUSH_INTERVAL_MS);
}

export function flushCreatorActivity() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const events = queue.splice(0);
  if (events.length === 0) return;

  fetch("/api/creator/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  }).catch(() => {
    // Best-effort tracking: failures are dropped rather than retried to
    // avoid double counting (server dedupe only covers a 10-minute window).
  });
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushCreatorActivity();
    }
  });
  window.addEventListener("beforeunload", () => {
    flushCreatorActivity();
  });
}