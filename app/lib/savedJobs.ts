// app/lib/savedJobs.ts
// Single source of truth for the "Saved jobs" bookmark feature.
// Stored in localStorage under SAVED_JOBS_KEY as SavedJobEntry[] = { id, savedAt }.

export const SAVED_JOBS_KEY = "orbitbyte:saved-jobs";

export type SavedJobEntry = {
  id: string;
  savedAt: string;
};

export function normalizeSavedEntries(raw: unknown): SavedJobEntry[] {
  if (!Array.isArray(raw)) return [];

  const entries: SavedJobEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      entries.push({ id: item, savedAt: "" });
    } else if (
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string" &&
      String((item as { id: string }).id).trim()
    ) {
      entries.push({
        id: String((item as { id: string }).id),
        savedAt:
          typeof (item as { savedAt?: unknown }).savedAt === "string"
            ? (item as { savedAt: string }).savedAt
            : "",
      });
    }
  }

  return entries;
}

export function readSavedJobs(): SavedJobEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_JOBS_KEY);
    return normalizeSavedEntries(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function persistSavedJobs(entries: SavedJobEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(entries));
}

export function isSavedJob(entries: SavedJobEntry[], jobId: string): boolean {
  return entries.some((entry) => entry.id === jobId);
}

export function toggleSavedJob(
  entries: SavedJobEntry[],
  jobId: string
): SavedJobEntry[] {
  const existing = entries.some((entry) => entry.id === jobId);
  if (existing) return entries.filter((entry) => entry.id !== jobId);
  return [...entries, { id: jobId, savedAt: new Date().toISOString() }];
}
