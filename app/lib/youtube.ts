/**
 * YouTube lib — server-side helpers for the /feed YouTube Shorts mode.
 *
 * Uses Serper's videos endpoint. The Serper key is read from SERPER_API_KEY
 * (server-only) via the shared discover helpers and is NEVER exposed to the
 * client. Generic fetch/rate-limit helpers are reused from app/lib/discover.ts
 * rather than duplicated.
 */

import { consumeRateLimit, isSerpKeyConfigured, serperRequest } from "@/app/lib/discover";

const SHORTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SHORTS_PER_FETCH = 24;
const MAX_YOUTUBE_PAGE = 10;

export type YouTubeShort = {
  id: string;
  title: string;
  link: string;
  thumbnail: string | null;
  views: string;
  channel: string | null;
  duration: string | null;
  publishedAt: string | null;
};

type CacheEntry = { data: unknown; expiresAt: number };
const shortsCache = new Map<string, CacheEntry>();

export { consumeRateLimit, isSerpKeyConfigured };

/** Validate a search query + optional result count. */
export function parseYoutubeQuery(
  rawQuery: string | null,
  rawNum: string | null
): { ok: true; q: string; num: number } | { ok: false; error: string } {
  const q = (rawQuery || "").trim();
  if (!q || q.length > 100) {
    return {
      ok: false,
      error: "A valid q query param is required (max 100 chars).",
    };
  }
  if (!/^[\p{L}\p{N}\s.,#'’\-&+()/@%!:=]+$/u.test(q)) {
    return { ok: false, error: "The search query contains unsupported characters." };
  }

  let num = 12;
  if (rawNum) {
    const parsed = Number.parseInt(rawNum, 10);
    if (Number.isFinite(parsed)) num = Math.min(Math.max(parsed, 1), 40);
  }

  return { ok: true, q, num };
}

/** Deterministic cache key for a shorts search (page token included). */
export function shortsCacheKey(
  userId: string,
  q: string,
  num: number,
  sp: string = ""
): string {
  return `${userId}::${q}::${num}::${sp}`;
}

/**
 * Validate a Serper page number passed as `sp`. Serper paginates the videos
 * endpoint by integer pages; anything else is rejected (treated as page 1).
 */
export function parseYoutubePage(rawSp: string | null): string | null {
  const sp = (rawSp || "").trim();
  if (!sp || sp.length > 4 || !/^\d{1,4}$/.test(sp)) return null;
  const page = Number.parseInt(sp, 10);
  if (!Number.isInteger(page) || page < 1 || page > 100) return null;
  return String(page);
}

/** Return cached shorts payload for a cache key if still fresh. */
export function getCachedShorts(cacheKey: string): unknown | null {
  const entry = shortsCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) shortsCache.delete(cacheKey);
  return null;
}

/** Store shorts payload bound to a cache key. */
export function setCachedShorts(cacheKey: string, data: unknown): void {
  shortsCache.set(cacheKey, { data, expiresAt: Date.now() + SHORTS_CACHE_TTL_MS });
}

function extractVideoId(link: unknown): string {
  const url = typeof link === "string" ? link : "";
  const short = url.match(/\/shorts\/([a-zA-Z0-9_-]{6,})/)?.[1];
  if (short) return short;
  return url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)?.[1] || "";
}

function formatViews(value: unknown): string {
  const num = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(num) || num <= 0) return "";
  try {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  } catch {
    return String(num);
  }
}

function isShortDuration(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  return /^\d+:\d{2}$/.test(text) && Number.parseInt(text.split(":")[0], 10) <= 1;
}

/**
 * Normalize Serper videos results into YouTubeShort[]. Filters for Actual
 * Shorts by preferring `/shorts/` links and one-minute-or-less runtimes, and
 * enriches each item with the fields Serper exposes per video.
 */
function normalizeShorts(rawShortsResults: unknown[], rawVideoResults: unknown[]): YouTubeShort[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const video of rawVideoResults || []) {
    const e = video as Record<string, unknown>;
    const id = typeof e.video_id === "string" ? e.video_id : "";
    if (id) byId.set(id, e);
  }

  const seen = new Set<string>();
  const out: YouTubeShort[] = [];

  const push = (item: Record<string, unknown>) => {
    const link = typeof item.link === "string" && item.link.startsWith("http") ? item.link : "";
    const id =
      typeof item.video_id === "string" && item.video_id ? item.video_id : extractVideoId(link);
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!id || !title || seen.has(id)) return;
    seen.add(id);

    const enrich =
      byId.get(id) ??
      (typeof item.channel === "object" && item.channel
        ? (item.channel as Record<string, unknown>)
        : undefined) ??
      {};

    const channel =
      typeof enrich.name === "string" && enrich.name
        ? enrich.name
        : typeof item.channel === "string"
          ? item.channel
          : null;

    out.push({
      id,
      title,
      link: link || `https://www.youtube.com/shorts/${id}`,
      thumbnail:
        typeof item.thumbnail === "string" && item.thumbnail
          ? item.thumbnail
          : typeof item.imageUrl === "string" && item.imageUrl
            ? item.imageUrl
            : item.thumbnail && typeof item.thumbnail === "object"
              ? ((item.thumbnail as { static?: unknown }).static as string) ?? null
              : null,
      views:
        typeof item.views_original === "string"
          ? item.views_original
          : formatViews(item.views),
      channel,
      duration:
        typeof enrich.length === "string"
          ? enrich.length
          : typeof item.duration === "string"
            ? item.duration
            : null,
      publishedAt:
        typeof enrich.published_date === "string"
          ? enrich.published_date
          : typeof item.date === "string"
            ? item.date
            : null,
    });
  };

  for (const node of rawShortsResults || []) {
    const shorts = (node as Record<string, unknown>).shorts;
    if (!Array.isArray(shorts)) continue;
    for (const item of shorts) {
      push(item as Record<string, unknown>);
      if (out.length >= MAX_SHORTS_PER_FETCH) break;
    }
    if (out.length >= MAX_SHORTS_PER_FETCH) break;
  }

  if (out.length === 0) {
    for (const video of rawVideoResults || []) {
      const e = video as Record<string, unknown>;
      const link = typeof e.link === "string" ? e.link : "";
      if (
        !link.includes("/shorts/") &&
        !isShortDuration(e.length) &&
        !isShortDuration(e.duration)
      ) {
        continue;
      }
      push(e);
      if (out.length >= MAX_SHORTS_PER_FETCH) break;
    }
  }

  return out;
}

export type FetchShortsResult = {
  shorts: YouTubeShort[];
  nextPageToken: string | null;
};

/** Query Serper's videos endpoint for Shorts-style results. */
export async function fetchYouTubeShorts(
  q: string,
  num: number,
  opts: { sp?: string | null } = {}
): Promise<FetchShortsResult> {
  const page = opts.sp ? Number.parseInt(opts.sp, 10) : 1;

  const data = await serperRequest<{ videos?: unknown[] }>("/videos", {
    q,
    num,
    gl: "in",
    hl: "en",
    page,
  });

  const videos = Array.isArray(data.videos) ? data.videos : [];
  const shorts = normalizeShorts([], videos);

  const hasMore = videos.length >= Math.min(num, 100) && page < MAX_YOUTUBE_PAGE;
  const nextPageToken = hasMore ? String(page + 1) : null;

  return { shorts, nextPageToken };
}