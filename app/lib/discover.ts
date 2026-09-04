/**
 * Discover lib — server-side helpers for the /discover page.
 *
 * The SerpApi key is read from SERPAPI_KEY (server-only) and is NEVER
 * exposed to the client. All SerpApi and reverse-geocoding requests are
 * made from the OrbitByte backend.
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY || process.env.SERP_API_KEY || "";
const SERPAPI_BASE = "https://serpapi.com/search.json";
const GEOCODE_BASE = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 12; // SerpApi calls per user per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

export type NewsArticle = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet: string;
  thumbnail: string | null;
};

export type ReverseGeocodeResult = {
  label: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
};

type CacheEntry = { data: unknown; expiresAt: number };

// In-memory caches (single Node process). Persist no user data.
const newsCache = new Map<string, CacheEntry>();
const rateBuckets = new Map<string, number[]>();

export function isSerpKeyConfigured(): boolean {
  return Boolean(SERPAPI_KEY.trim());
}

/** Validate + normalize an incoming location query param. */
export function parseLocationParam(raw: string | null): string | null {
  const value = (raw || "").trim();
  if (!value || value.length > 120) return null;
  if (!/^[\p{L}\p{N}\s.,'’\-&+()#]+$/u.test(value)) return null;
  return value;
}

/** Validate an incoming coordinate query param within [min, max]. */
export function parseCoord(raw: string | null, min: number, max: number): number | null {
  const value = Number.parseFloat(raw || "");
  if (!Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

/** Short city token (first comma part) used as the SerpApi query term. */
export function cityFromLocation(location: string): string {
  const first = location.split(",")[0].trim();
  if (first) return first.slice(0, 60);
  return location.trim().slice(0, 60);
}

/** fetch() wrapper with a hard timeout. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reverse-geocode a lat/lng pair to a human location label.
 * Uses BigDataCloud's free reverse-geocode API (no key required), called
 * from the backend. Returns null on failure.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = new URL(GEOCODE_BASE);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("localityLanguage", "en");

    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return null;

    const record = data as Record<string, unknown>;
    const city = (record.city || record.locality || record.principalSubdivision || "") as string;
    const region = (record.principalSubdivision || "") as string;
    const country = (record.countryName || "") as string;
    const countryCode = (record.countryCode || "") as string;

    const parts: string[] = [];
    for (const part of [city, region, country].map((p) => String(p).trim())) {
      if (part && !parts.includes(part)) parts.push(part);
    }

    return {
      label: parts.length > 0 ? parts.join(", ") : "Unknown location",
      city,
      region,
      country,
      countryCode,
    };
  } catch {
    return null;
  }
}

/** Map a raw SerpApi news item to our normalized shape. */
function normalizeArticles(raw: unknown[]): NewsArticle[] {
  // google_news returns story-groups (with nested .stories) plus an optional
  // flat top_stories list. Flatten both into individual articles.
  const flat: unknown[] = [];
  for (const item of raw || []) {
    const entry = (item || {}) as Record<string, unknown>;
    const stories = entry.stories;
    if (Array.isArray(stories) && stories.length > 0) {
      flat.push(...stories);
    } else if (entry.title && entry.link) {
      flat.push(entry);
    }
  }

  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const item of flat) {
    const entry = (item || {}) as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title : "";
    const link = typeof entry.link === "string" ? entry.link : "";
    if (!title || !link) continue;

    const dedupeKey = link.toLowerCase().trim();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const source =
      typeof entry.source === "string"
        ? entry.source
        : (entry.source as { name?: string } | undefined)?.name || "";
    const publishedAt =
      typeof entry.date === "string"
        ? entry.date
        : typeof entry.iso_date === "string"
          ? entry.iso_date
          : "";

    articles.push({
      id: typeof entry.id === "string" ? entry.id : `article-${articles.length}`,
      title,
      link,
      source: source || "Google News",
      publishedAt,
      snippet: typeof entry.snippet === "string" ? entry.snippet : "",
      thumbnail:
        typeof entry.thumbnail === "string"
          ? entry.thumbnail
          : typeof entry.image === "string"
            ? entry.image
            : null,
    });
  }
  return articles;
}

/** Query SerpApi's Google News engine for a location. */
export async function fetchNews(location: string): Promise<NewsArticle[]> {
  if (!SERPAPI_KEY.trim()) {
    throw new Error("SerpApi is not configured on the server.");
  }

  const params = new URLSearchParams({
    engine: "google_news",
    q: cityFromLocation(location),
    location: location,
    hl: "en",
    gl: "in",
    google_domain: "google.co.in",
    api_key: SERPAPI_KEY,
  });

  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error || `News request failed (${res.status})`;
    throw new Error(message);
  }

  const newsResults = Array.isArray((data as { news_results?: unknown[] }).news_results)
    ? (data as { news_results: unknown[] }).news_results
    : [];
  const topStories = Array.isArray((data as { top_stories?: unknown[] }).top_stories)
    ? (data as { top_stories: unknown[] }).top_stories
    : [];

  return normalizeArticles([...topStories, ...newsResults]);
}

/** Sliding-window rate limiter keyed by user id. */
export function consumeRateLimit(
  userId: string
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const bucket = (rateBuckets.get(userId) || []).filter((t) => t > windowStart);

  if (bucket.length >= RATE_LIMIT_MAX) {
    const oldest = bucket[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  bucket.push(now);
  rateBuckets.set(userId, bucket);
  return { allowed: true };
}

/** Return a cached news payload for (user, location) if still fresh. */
export function getCachedNews(
  userId: string,
  location: string
): { key: string; data: unknown | null } {
  const key = `${userId}::${location.trim().toLowerCase()}`;
  const entry = newsCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return { key, data: entry.data };
  if (entry) newsCache.delete(key);
  return { key, data: null };
}

/** Store news payload bound to a cache key. */
export function setCachedNews(key: string, data: unknown): void {
  newsCache.set(key, { data, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
}