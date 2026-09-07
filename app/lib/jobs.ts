/**
 * Jobs lib — server-side helpers for the /jobs page.
 *
 * Uses SerpAPI's google_jobs engine. The SerpAPI key is read from
 * SERPAPI_API_KEY (server-only) and is NEVER exposed to the client. This
 * module is intentionally self-contained: it does NOT import from the Discover
 * lib or share any code with the Serper-based news/search integration, so
 * SerpAPI is used exclusively by the Jobs section and Serper exclusively by
 * Discover.
 */

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || "";
const SERPAPI_BASE = "https://serpapi.com/search.json";

const JOBS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const JOBS_RATE_LIMIT_MAX = 12; // SerpAPI calls per user per window
const JOBS_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const JOBS_FETCH_TIMEOUT_MS = 20000;

export type JobPost = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  thumbnail: string | null;
  via: string;
  employmentType: string;
  experienceLevel: string;
  salary: string;
  postedAt: string;
  applyLink: string | null;
  highlights: string[];
};

export type JobSearchParams = {
  q: string;
  location?: string;
  remote?: "true" | "false";
  employmentType?: string;
  experienceLevel?: string;
  datePosted?: string;
  sortBy?: string;
  nextPageToken?: string;
};

export type JobSearchResult = {
  jobs: JobPost[];
  hasMore: boolean;
  nextPageToken: string | null;
};

const EMPLOYMENT_TYPES = new Set([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "TEMPORARY",
  "INTERN",
  "VOLUNTEER",
  "PER_DIEM",
]);
const EXPERIENCE_LEVELS = new Set([
  "ENTRY_LEVEL",
  "JUNIOR",
  "MID_LEVEL",
  "SENIOR",
  "MANAGER",
  "EXECUTIVE",
]);
const DATE_POSTED = new Set(["today", "3days", "week", "month"]);
const SORT_BY = new Set(["relevance", "date"]);

type CacheEntry = { data: unknown; expiresAt: number };
const jobsCache = new Map<string, CacheEntry>();
const rateBuckets = new Map<string, number[]>();

export function isJobsApiConfigured(): boolean {
  return Boolean(SERPAPI_API_KEY.trim());
}

/** Reference list of employment types for the UI (stable order). */
export const EMPLOYMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACTOR", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERN", label: "Internship" },
  { value: "VOLUNTEER", label: "Volunteer" },
];

/** Reference list of experience levels for the UI. */
export const EXPERIENCE_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "ENTRY_LEVEL", label: "Entry Level" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID_LEVEL", label: "Mid Level" },
  { value: "SENIOR", label: "Senior" },
  { value: "MANAGER", label: "Manager" },
  { value: "EXECUTIVE", label: "Executive" },
];

/** fetch() wrapper with a hard timeout (Jobs-only; kept local for isolation). */
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JOBS_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Strictly validate + normalize incoming GET query params. */
export function parseSearchParams(
  searchParams: URLSearchParams
): { ok: true; params: JobSearchParams } | { ok: false; error: string } {
  const q = (searchParams.get("q") || "").trim();
  if (!q || q.length > 100) {
    return { ok: false, error: "A valid q query param is required (max 100 chars)." };
  }
  if (!/^[\p{L}\p{N}\s.,'’\-&+()#/@%!:=]+$/u.test(q)) {
    return { ok: false, error: "The search query contains unsupported characters." };
  }

  const location = parseOptional(searchParams.get("location"), 120);
  if (location === null) {
    return { ok: false, error: "The location param is invalid." };
  }

  const remote = searchParams.get("remote");
  if (remote && remote !== "true" && remote !== "false") {
    return { ok: false, error: "The remote param must be true or false." };
  }

  const employmentType = searchParams.get("employment_type");
  if (employmentType && !EMPLOYMENT_TYPES.has(employmentType)) {
    return { ok: false, error: "The employment_type param is invalid." };
  }

  const experienceLevel = searchParams.get("experience_level");
  if (experienceLevel && !EXPERIENCE_LEVELS.has(experienceLevel)) {
    return { ok: false, error: "The experience_level param is invalid." };
  }

  const datePosted = searchParams.get("date_posted");
  if (datePosted && !DATE_POSTED.has(datePosted)) {
    return { ok: false, error: "The date_posted param is invalid." };
  }

  const sortBy = searchParams.get("sort_by");
  if (sortBy && !SORT_BY.has(sortBy)) {
    return { ok: false, error: "The sort_by param is invalid." };
  }

  const nextPageToken = (searchParams.get("next_page_token") || "").trim();
  if (nextPageToken && nextPageToken.length > 2000) {
    return { ok: false, error: "The page token is invalid." };
  }

  return {
    ok: true,
    params: {
      q,
      location: location || undefined,
      remote: remote === "true" || remote === "false" ? (remote as "true" | "false") : undefined,
      employmentType: employmentType || undefined,
      experienceLevel: experienceLevel || undefined,
      datePosted: datePosted || undefined,
      sortBy: sortBy || undefined,
      nextPageToken: nextPageToken || undefined,
    },
  };
}

function parseOptional(raw: string | null, maxLength: number): string | null | undefined {
  if (raw === null) return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.length > maxLength) return null;
  if (!/^[\p{L}\p{N}\s.,'’\-&+()#/@%!:=]+$/u.test(value)) return null;
  return value;
}

/** Deterministic cache key for a search (excludes nothing; keeps params). */
export function jobParamsHash(params: JobSearchParams): string {
  return JSON.stringify(params);
}

/** Return cached jobs payload for a cache key if still fresh. */
export function getCachedJobs(cacheKey: string): unknown | null {
  const entry = jobsCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) jobsCache.delete(cacheKey);
  return null;
}

/** Store jobs payload bound to a cache key. */
export function setCachedJobs(cacheKey: string, data: unknown): void {
  jobsCache.set(cacheKey, { data, expiresAt: Date.now() + JOBS_CACHE_TTL_MS });
}

/** Sliding-window rate limiter keyed by user id (Jobs-only bucket). */
export function consumeRateLimit(
  userId: string
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowStart = now - JOBS_RATE_LIMIT_WINDOW_MS;
  const bucket = (rateBuckets.get(userId) || []).filter((t) => t > windowStart);

  if (bucket.length >= JOBS_RATE_LIMIT_MAX) {
    const oldest = bucket[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + JOBS_RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  bucket.push(now);
  rateBuckets.set(userId, bucket);
  return { allowed: true };
}

/** Map a raw SerpAPI google_jobs item to our normalized shape. */
function normalizeJobs(raw: unknown[]): JobPost[] {
  const seen = new Set<string>();
  const jobs: JobPost[] = [];

  for (const item of raw || []) {
    const entry = (item || {}) as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title : "";
    if (!title.trim()) continue;

    const id =
      typeof entry.job_id === "string" && entry.job_id
        ? entry.job_id
        : `job-${jobs.length}-${title}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const de = (entry.detected_extensions || {}) as Record<string, unknown>;
    const extensions = Array.isArray(entry.extensions) ? entry.extensions.map(String) : [];

    const applyOptions = Array.isArray(entry.apply_options)
      ? (entry.apply_options as { title?: unknown; link?: unknown }[])
      : [];
    const applyOption =
      applyOptions.find((opt) => typeof opt.link === "string" && opt.link) || null;
    const applyLink =
      applyOption?.link || (typeof entry.source_link === "string" ? entry.source_link : null);

    const highlights = extractHighlights(entry);

    jobs.push({
      id,
      title,
      company: typeof entry.company_name === "string" ? entry.company_name : "",
      location: typeof entry.location === "string" ? entry.location : "",
      description: truncateDescription(
        typeof entry.description === "string" ? entry.description : ""
      ),
      thumbnail: typeof entry.thumbnail === "string" ? entry.thumbnail : null,
      via: typeof entry.via === "string" ? entry.via : "",
      employmentType:
        typeof de.schedule_type === "string"
          ? de.schedule_type
          : typeof entry.employment_type === "string"
            ? entry.employment_type
            : "",
      experienceLevel: inferExperienceLevel(extensions),
      salary:
        typeof de.salary === "string"
          ? de.salary
          : typeof entry.salary === "string"
            ? entry.salary
            : inferSalary(extensions),
      postedAt: typeof de.posted_at === "string" ? de.posted_at : "",
      applyLink: typeof applyLink === "string" ? applyLink : null,
      highlights,
    });
  }

  return jobs;
}

function extractHighlights(entry: Record<string, unknown>): string[] {
  const raw = entry.job_highlights;
  if (!Array.isArray(raw)) return [];
  const lines: string[] = [];
  for (const group of raw) {
    const g = (group || {}) as { items?: unknown };
    if (Array.isArray(g.items)) {
      for (const line of g.items) {
        if (typeof line === "string" && line.trim()) lines.push(line.trim());
      }
    }
  }
  return lines.slice(0, 8);
}

function inferExperienceLevel(extensions: string[]): string {
  const LEVELS = [
    ["entry", "Entry Level"],
    ["junior", "Junior"],
    ["mid-senior", "Mid-Senior"],
    ["mid", "Mid Level"],
    ["senior", "Senior"],
    ["director", "Director"],
    ["manager", "Manager"],
    ["executive", "Executive"],
  ];
  for (const ext of extensions) {
    const lower = ext.toLowerCase();
    for (const [key, label] of LEVELS) {
      if (lower.includes(key)) return label;
    }
  }
  return "";
}

function inferSalary(extensions: string[]): string {
  for (const ext of extensions) {
    if (/[₹$€£]/.test(ext) && /\d/.test(ext)) return ext;
  }
  return "";
}

function truncateDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 420 ? `${clean.slice(0, 420).trim()}…` : clean;
}

/** Query SerpAPI's google_jobs engine. */
export async function fetchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  if (!isJobsApiConfigured()) {
    throw new Error("SerpAPI is not configured on the server.");
  }

  const search = new URLSearchParams({
    engine: "google_jobs",
    q: params.q,
    hl: "en",
    gl: "in",
    google_domain: "google.co.in",
    api_key: SERPAPI_API_KEY,
  });
  if (params.location) search.set("location", params.location);
  if (params.remote) search.set("remote", params.remote);
  if (params.employmentType) search.set("employment_type", params.employmentType);
  if (params.experienceLevel) search.set("experience_level", params.experienceLevel);
  if (params.datePosted) search.set("date_posted", params.datePosted);
  if (params.sortBy) search.set("sort_by", params.sortBy);
  if (params.nextPageToken) search.set("next_page_token", params.nextPageToken);

  const res = await fetchWithTimeout(`${SERPAPI_BASE}?${search.toString()}`);
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!res.ok || typeof data.error === "string" || typeof data.error_message === "string") {
    const statusNote = res.status !== 200 ? ` (${res.status})` : "";
    const message =
      (data.error as string) ||
      (data.error_message as string) ||
      `Job search failed${statusNote}`;
    throw new Error(message);
  }

  const jobsResults = Array.isArray(data.jobs_results) ? (data.jobs_results as unknown[]) : [];
  const pagination = (data.serpapi_pagination || {}) as { next_page_token?: string };
  const nextPageToken =
    typeof pagination.next_page_token === "string" && pagination.next_page_token
      ? pagination.next_page_token
      : null;

  return {
    jobs: normalizeJobs(jobsResults),
    hasMore: Boolean(nextPageToken),
    nextPageToken,
  };
}