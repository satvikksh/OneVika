// app/lib/savedPosts.ts
// Single source of truth for the "Saved" feature (Bookmark / save to gallery).
// Stored in localStorage under SAVED_POSTS_KEY as SavedPostEntry[] = { id, savedAt }.
// Backward compatible: legacy values that were plain post-ID strings are
// normalized into entries on read (their savedAt stays empty).

export const SAVED_POSTS_KEY = "orbitbyte:saved-posts";

export type SavedPostEntry = {
  id: string;
  savedAt: string;
};

export function normalizeSavedEntries(raw: unknown): SavedPostEntry[] {
  if (!Array.isArray(raw)) return [];

  const entries: SavedPostEntry[] = [];
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

export function readSavedPosts(): SavedPostEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_POSTS_KEY);
    return normalizeSavedEntries(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function persistSavedPosts(entries: SavedPostEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(entries));
}

export function isSaved(entries: SavedPostEntry[], postId: string): boolean {
  return entries.some((entry) => entry.id === postId);
}

export function savedIds(entries: SavedPostEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

export function toggleSavedEntry(
  entries: SavedPostEntry[],
  postId: string
): SavedPostEntry[] {
  const existing = entries.some((entry) => entry.id === postId);
  if (existing) return entries.filter((entry) => entry.id !== postId);
  return [...entries, { id: postId, savedAt: new Date().toISOString() }];
}