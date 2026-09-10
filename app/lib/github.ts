// Server-only helpers for the GitHub Projects section.
//
// GITHUB_TOKEN is read from the server environment only and must never be
// exposed to the client (no NEXT_PUBLIC_* and no return values containing the
// token). Clients must go through GET /api/github, never call GitHub directly.
// Calling the GitHub API from a client component with the private token is
// forbidden.

const GITHUB_API_URL = (
  process.env.GITHUB_API_URL || "https://api.github.com"
).replace(/\/+$/, "");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

export const REPOS_PER_PAGE = 30;
const PROFILE_TTL_MS = 5 * 60 * 1000;
const REPOS_TTL_MS = 2 * 60 * 1000;
const SEARCH_TTL_MS = 2 * 60 * 1000;
// App-level guard that sits in front of GitHub's own rate limits.
const USER_RATE_LIMIT = 30; // calls per authenticated user per minute

type CacheEntry = { data: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const userCalls = new Map<string, { count: number; resetAt: number }>();

export type GitHubRateLimit = {
  limit: number;
  remaining: number;
  resetAt: string;
};

export type GitHubProfile = {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  profileUrl: string;
  followers: number;
  following: number;
  publicRepos: number;
  type: string;
};

export type GitHubRepo = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  owner: { login: string; avatarUrl: string; url: string };
  url: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  updatedAt: string;
  license: string | null;
  visibility: "public" | "private";
  fork: boolean;
  archived: boolean;
};

export function isGitHubConfigured(): boolean {
  return GITHUB_TOKEN.length > 0;
}

/**
 * Derives a GitHub username from the value a user stored in their profile
 * social links (e.g. "satvikksh", "https://github.com/satvikksh/", or a
 * trailing path). Returns null when nothing usable is provided.
 */
export function extractGitHubUsername(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (host !== "github.com") return null;
      candidate = parsed.pathname || "";
    }
  } catch {
    return null;
  }

  const username = candidate
    .replace(/^[\/\\]+|[\/\\]+$/g, "")
    .split(/[\/\\]/)[0]
    .trim();

  // GitHub login names allow alphanumerics and single hyphens.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(username)) {
    return null;
  }
  return username;
}

export function consumeGitHubCall(userId: string): boolean {
  const now = Date.now();
  const record = userCalls.get(userId);
  if (!record || record.resetAt < now) {
    userCalls.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  record.count += 1;
  return record.count <= USER_RATE_LIMIT;
}

function readCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function writeCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

type GithubFetchResult<T> = {
  data: T;
  rateLimit: GitHubRateLimit;
  link: string | null;
};

async function githubFetch<T>(path: string): Promise<GithubFetchResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "OrbitByte",
        ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The GitHub API request timed out.");
    }
    throw new Error("Could not reach the GitHub API due to a network error.");
  }

  clearTimeout(timeout);

  const rateLimit: GitHubRateLimit = {
    limit: Number(response.headers.get("x-ratelimit-limit") || "60"),
    remaining: Number(response.headers.get("x-ratelimit-remaining") || "60"),
    resetAt: new Date(
      (Number(response.headers.get("x-ratelimit-reset") || 0) || Date.now()) *
        1000
    ).toISOString(),
  };

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message || "";
    } catch {
      // Non-JSON error body; keep the generic message.
    }

    if (response.status === 401) {
      throw new Error("The GitHub token on the server is invalid or expired.");
    }
    if (response.status === 404) {
      throw new Error("The requested GitHub user or repository was not found.");
    }
    if (response.status === 403 || response.status === 429) {
      if (/rate limit/i.test(detail)) {
        throw new Error("GitHub API rate limit exceeded. Please try again later.");
      }
      throw new Error(detail || "GitHub refused the API request.");
    }
    throw new Error(detail || `GitHub API responded with status ${response.status}.`);
  }

  return {
    data: (await response.json()) as T,
    rateLimit,
    link: response.headers.get("link"),
  };
}

type GitHubUserRaw = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  type: string;
};

type CachedProfile = { profile: GitHubProfile; rateLimit: GitHubRateLimit };

/**
 * Fetches the public profile for a specific GitHub username (the account the
 * OrbitByte user connected via their profile's GitHub social link). Uses the
 * server token for higher rate limits; never passes user data to the client
 * beyond the normalized public profile.
 */
export async function fetchGitHubProfile(username: string): Promise<CachedProfile> {
  const cacheKey = `github::profile::${username.toLowerCase()}`;
  const cached = readCache<CachedProfile>(cacheKey);
  if (cached) return cached;

  const { data: user, rateLimit } = await githubFetch<GitHubUserRaw>(
    `/users/${encodeURIComponent(username)}`
  );

  const profile: GitHubProfile = {
    username: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || "",
    profileUrl: user.html_url,
    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    type: user.type,
  };

  const result: CachedProfile = { profile, rateLimit };
  writeCache(cacheKey, result, PROFILE_TTL_MS);
  return result;
}

type GitHubRepoRaw = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: { login: string; avatar_url: string; html_url: string };
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  license: { spdx_id: string | null; name: string | null } | null;
  private: boolean;
  visibility?: "public" | "private";
  fork: boolean;
  archived: boolean;
};

type CachedRepos = { repos: GitHubRepo[]; hasNextPage: boolean; rateLimit: GitHubRateLimit };

function normalizeRepo(repo: GitHubRepoRaw): GitHubRepo {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || "",
    owner: {
      login: repo.owner.login,
      avatarUrl: repo.owner.avatar_url,
      url: repo.owner.html_url,
    },
    url: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language || "",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    updatedAt: repo.updated_at,
    license: repo.license?.spdx_id || repo.license?.name || null,
    visibility: repo.visibility || (repo.private ? "private" : "public"),
    fork: repo.fork,
    archived: repo.archived,
  };
}

/**
 * Lists the public repositories of a specific GitHub user (used for
 * "My Repositories"). Never restricted to the token owner — any connected
 * OrbitByte user with a GitHub social link can list their own public repos.
 */
export async function fetchGitHubUserRepos(
  username: string,
  page: number
): Promise<CachedRepos> {
  const cacheKey = `github::repos::${username.toLowerCase()}::${page}`;
  const cached = readCache<CachedRepos>(cacheKey);
  if (cached) return cached;

  const { data, rateLimit, link } = await githubFetch<GitHubRepoRaw[]>(
    `/users/${encodeURIComponent(username)}/repos?per_page=${REPOS_PER_PAGE}&page=${page}&sort=updated`
  );

  const repos = data.map(normalizeRepo);

  // GitHub signals pagination through the Link header; it is authoritative.
  const hasNextPage = link?.includes('rel="next"') ?? false;

  const result: CachedRepos = { repos, hasNextPage, rateLimit };
  writeCache(cacheKey, result, REPOS_TTL_MS);
  return result;
}

type GitHubSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepoRaw[];
};

export type CachedSearch = {
  query: string;
  totalCount: number;
  repos: GitHubRepo[];
  hasNextPage: boolean;
  rateLimit: GitHubRateLimit;
};

function searchCacheKey(query: string, page: number): string {
  return `github::search::${query.toLowerCase()}::${page}`;
}

/**
 * Searches GitHub's global public repository index via /search/repositories.
 * Results are never restricted to a single owner — they come from any public
 * user or organization that matches the query.
 */
export async function searchGitHubRepos(query: string, page: number): Promise<CachedSearch> {
  const normalizedQuery = query.trim().slice(0, 256);
  const cacheKey = searchCacheKey(normalizedQuery, page);
  const cached = readCache<CachedSearch>(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalizedQuery);
  const { data, rateLimit, link } = await githubFetch<GitHubSearchResponse>(
    `/search/repositories?q=${encoded}&per_page=${REPOS_PER_PAGE}&page=${page}&sort=stars&order=desc`
  );

  const totalCount = data.total_count ?? 0;
  const repos = (Array.isArray(data.items) ? data.items : []).map(normalizeRepo);

  // Search is capped at 1000 results regardless of total_count.
  const endOfPage = page * REPOS_PER_PAGE;
  const hasNextPage =
    endOfPage < Math.min(totalCount, 1000) && (link?.includes('rel="next"') ?? endOfPage < totalCount);

  const result: CachedSearch = { query: normalizedQuery, totalCount, repos, hasNextPage, rateLimit };
  writeCache(cacheKey, result, SEARCH_TTL_MS);
  return result;
}

// Cache-first accessors so the API route can serve cached responses without
// consuming a per-user rate-limit slot (mirrors the jobs route pattern).
export function getCachedGitHubProfile(username: string): CachedProfile | null {
  return readCache<CachedProfile>(`github::profile::${username.toLowerCase()}`);
}

export function getCachedGitHubUserRepos(
  username: string,
  page: number
): CachedRepos | null {
  return readCache<CachedRepos>(`github::repos::${username.toLowerCase()}::${page}`);
}

export function getCachedGitHubSearch(query: string, page: number): CachedSearch | null {
  return readCache<CachedSearch>(searchCacheKey(query, page));
}