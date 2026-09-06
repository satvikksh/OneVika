/**
 * Shared "seen" registry for social feeds (YouTube Shorts, OrbitByte posts).
 *
 * Persisted in sessionStorage so content never repeats across loads, refreshes,
 * or feed-mode switches within a browsing session. Lazily loaded once, bounded
 * and trimmed so the registry stays small. Divorced from React so feeds can
 * consult it synchronously inside fetch pipelines.
 */

const SEEN_CAP = 600;
const SEEN_TRIM = 400;

type SeenState = { ids: Set<string>; order: string[] };

export type SessionSeen = {
  has: (id: string) => boolean;
  add: (ids: string[]) => void;
};

export function createSessionSeen(storageKey: string): SessionSeen {
  let state: SeenState | null = null;

  const read = (): SeenState => {
    if (state) return state;
    let order: string[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          order = parsed.filter((x): x is string => typeof x === "string");
        }
      } catch {
        /* corrupted/blocked storage → start fresh this session */
      }
    }
    state = { ids: new Set(order), order };
    return state;
  };

  const persist = (s: SeenState) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(s.order));
      } catch {
        /* storage full/blocked → still dedupes for this session */
      }
    }
  };

  return {
    has: (id: string) => read().ids.has(id),
    add: (ids: string[]) => {
      const s = read();
      for (const id of ids) {
        if (!id || s.ids.has(id)) continue;
        s.ids.add(id);
        s.order.push(id);
      }
      if (s.order.length > SEEN_CAP) {
        const dropCount = s.order.length - SEEN_TRIM;
        for (const id of s.order.slice(0, dropCount)) s.ids.delete(id);
        s.order = s.order.slice(-SEEN_TRIM);
      }
      persist(s);
    },
  };
}