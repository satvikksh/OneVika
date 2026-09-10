"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Bookmark,
  BookmarkCheck,
  Clock,
  Compass,
  ExternalLink,
  FolderKanban,
  GitFork,
  Github,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";
import type { GitHubProfile, GitHubRepo } from "@/app/lib/github";

// Query used for the initial "browse popular public repositories" view. It is a
// genuine GitHub search (global repos from any user/organization), never
// restricted to the current account.
export const DEFAULT_EXPLORE_QUERY = "stars:>50";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  CSharp: "#178600",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  JSON: "#292929",
  Dart: "#00B4AB",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  SCSS: "#c6538c",
  TeX: "#3D6117",
  Dockerfile: "#384d54",
};

function languageColor(language: string): string {
  if (!language) return "#8a8f98";
  return LANGUAGE_COLORS[language] ?? "#8a8f98";
}

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

function updatedLabel(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SortKey = "updated" | "stars" | "name" | "forks";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "stars", label: "Most stars" },
  { value: "forks", label: "Most forks" },
  { value: "name", label: "Name A–Z" },
];

function ProfileStats({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-center dark:border-neutral-800 dark:bg-neutral-800/60">
      <div className="text-lg font-black leading-none sm:text-xl">{value}</div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
    </div>
  );
}

function RepoCard({
  repo,
  isSaved,
  saving,
  onToggleSave,
}: {
  repo: GitHubRepo;
  isSaved: boolean;
  saving?: boolean;
  onToggleSave: (repo: GitHubRepo) => void;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-lg font-bold tracking-tight hover:underline"
          >
            {repo.name}
            <ExternalLink className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-500" />
          </a>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {repo.fullName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {repo.visibility === "private" && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-amber-400"
              title="Private repository"
            >
              <Lock className="h-3 w-3" />
              Private
            </span>
          )}
          {repo.visibility === "public" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              <Globe className="h-3 w-3" />
              Public
            </span>
          )}
          {repo.archived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <Archive className="h-3 w-3" />
              Archived
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-3">
        <p className="text-sm leading-6 text-neutral-600 line-clamp-3 dark:text-neutral-300">
          {repo.description || "No description provided."}
        </p>

        {repo.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {repo.topics.slice(0, 4).map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {topic}
              </span>
            ))}
            {repo.topics.length > 4 && (
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500">
                +{repo.topics.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={repo.owner.avatarUrl}
              alt=""
              width={24}
              height={24}
              className="h-full w-full object-cover"
            />
          </span>
          <a
            href={repo.owner.url}
            target="_blank"
            rel="noreferrer"
            title={`${repo.owner.login} on GitHub`}
            className="truncate text-sm font-semibold text-neutral-700 hover:underline dark:text-neutral-200"
          >
            {repo.owner.login}
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 p-5 text-xs font-medium text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: languageColor(repo.language) }}
          />
          {repo.language || "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5" />
          {formatCount(repo.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="h-3.5 w-3.5" />
          {formatCount(repo.forks)}
        </span>
        {repo.license && (
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            {repo.license}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {updatedLabel(repo.updatedAt)}
        </span>
        <button
          type="button"
          onClick={() => onToggleSave(repo)}
          disabled={saving}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${repo.name} from saved repositories` : `Save ${repo.name} to your gallery`}
          className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
            isSaved
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950"
              : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
          }`}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isSaved ? (
            <BookmarkCheck className="h-3.5 w-3.5" />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving…" : isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}

export function GitHubProjectsSection() {
  const { status: sessionStatus } = useSession();

  const [configured, setConfigured] = useState(true);
  const [connected, setConnected] = useState(true);
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<"explore" | "mine">("explore");

  // Shared list for whichever view is active.
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Global search (Explore view).
  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  // Local filter/sort (My repositories view).
  const [localSearch, setLocalSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  // Saved repositories: githubRepositoryId -> saved document id.
  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [busySaves, setBusySaves] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    fetch("/api/github?scope=profile")
      .then(async (response) => {
        const payload = (await response.json()) as {
          configured?: boolean;
          connected?: boolean;
          error?: string;
          profile?: GitHubProfile;
        };
        if (!active) return;
        if (payload.configured === false) {
          setConfigured(false);
          return;
        }
        if (!response.ok) {
          setLoadError(payload.error || "Failed to load the GitHub profile.");
          return;
        }
        setConnected(payload.connected !== false);
        setProfile(payload.profile ?? null);
      })
      .catch(() => {
        if (active) setLoadError("Failed to load the GitHub profile.");
      });

    return () => {
      active = false;
    };
  }, []);

  // Load the current user's saved repositories (for Save/Saved toggles).
  useEffect(() => {
    let active = true;

    fetch("/api/saved-repositories")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          repositories?: {
            githubRepositoryId: string;
            id: string;
          }[];
        };
        if (!active || !Array.isArray(payload.repositories)) return;

        const map: Record<string, string> = {};
        for (const saved of payload.repositories) {
          map[saved.githubRepositoryId] = saved.id;
        }
        setSavedMap(map);
      })
      .catch(() => {
        // Saved state is a convenience; failure just leaves buttons as Save.
      });

    return () => {
      active = false;
    };
  }, [reloadKey, sessionStatus]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoadingRepos(true);
      setLoadError(null);

      try {
        const isExplore = view === "explore";
        const url = isExplore
          ? `/api/github?scope=search&q=${encodeURIComponent(activeQuery || DEFAULT_EXPLORE_QUERY)}&page=1`
          : "/api/github?scope=repos&page=1";

        const response = await fetch(url);
        const payload = (await response.json()) as {
          configured?: boolean;
          connected?: boolean;
          error?: string;
          repos?: GitHubRepo[];
          totalCount?: number;
          hasNextPage?: boolean;
        };

        if (!active) return;
        if (payload.configured === false) {
          setConfigured(false);
          return;
        }
        if (payload.connected === false) {
          setConnected(false);
          setRepos([]);
          setHasNextPage(false);
          setTotalCount(null);
          return;
        }
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load repositories.");
        }

        setConnected(true);
        setRepos(payload.repos ?? []);
        setPage(1);
        setHasNextPage(payload.hasNextPage ?? false);
        setTotalCount(payload.totalCount ?? null);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load repositories."
          );
        }
      } finally {
        if (active) setLoadingRepos(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [view, activeQuery, reloadKey]);

  // Debounced global search — typing updates activeQuery 500ms after pausing.
  useEffect(() => {
    if (view !== "explore") return;
    const trimmed = queryInput.trim();
    if (trimmed === activeQuery) return;

    const handler = setTimeout(() => {
      setActiveQuery(trimmed);
    }, 500);
    return () => clearTimeout(handler);
  }, [queryInput, activeQuery, view]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const isExplore = view === "explore";
      const next = page + 1;

      const response = await fetch(
        isExplore
          ? `/api/github?scope=search&q=${encodeURIComponent(activeQuery || DEFAULT_EXPLORE_QUERY)}&page=${next}`
          : `/api/github?scope=repos&page=${next}`
      );
      const payload = (await response.json()) as {
        error?: string;
        repos?: GitHubRepo[];
        totalCount?: number;
        hasNextPage?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load more repositories.");
      }

      setRepos((prev) => [...prev, ...(payload.repos ?? [])]);
      setPage(next);
      setHasNextPage(payload.hasNextPage ?? false);
      setTotalCount(payload.totalCount ?? null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load more repositories."
      );
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, loadingMore, page, view, activeQuery]);

  const switchView = useCallback(
    (next: "explore" | "mine") => {
      if (next === view) return;
      setView(next);
      setRepos([]);
      setPage(1);
      setHasNextPage(false);
      setTotalCount(null);
      setLoadError(null);
    },
    [view]
  );

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const handleToggleSave = useCallback(
    async (repo: GitHubRepo) => {
      setBusySaves((prev) => ({ ...prev, [repo.id]: true }));
      setActionError(null);

      try {
        const existingId = savedMap[repo.id];

        if (existingId) {
          const response = await fetch(`/api/saved-repositories/${existingId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(payload?.error || "Failed to remove the repository.");
          }
          setSavedMap((prev) => {
            const next = { ...prev };
            delete next[repo.id];
            return next;
          });
          return;
        }

        const response = await fetch("/api/saved-repositories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubRepositoryId: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            ownerLogin: repo.owner.login,
            ownerAvatar: repo.owner.avatarUrl,
            description: repo.description,
            htmlUrl: repo.url,
            language: repo.language,
            stars: repo.stars,
            forks: repo.forks,
            topics: repo.topics,
          }),
        });
        const payload = (await response.json()) as {
          repository?: { id?: string };
          error?: string;
        };
        if (!response.ok || !payload.repository?.id) {
          throw new Error(payload.error || "Failed to save the repository.");
        }
        setSavedMap((prev) => ({ ...prev, [repo.id]: payload.repository!.id! }));
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Save failed. Please try again."
        );
      } finally {
        setBusySaves((prev) => {
          const next = { ...prev };
          delete next[repo.id];
          return next;
        });
      }
    },
    [savedMap]
  );

  const filteredMineRepos = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    let list = repos;
    if (term) {
      list = repos.filter((repo) =>
        [repo.name, repo.fullName, repo.description, repo.language, ...repo.topics]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }
    return [...list].sort((a, b) => {
      switch (sort) {
        case "stars":
          return b.stars - a.stars;
        case "forks":
          return b.forks - a.forks;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [repos, localSearch, sort]);

  const isSearching =
    view === "explore" && (queryInput.trim() !== activeQuery || loadingRepos);

  const resultMeta =
    view === "explore"
      ? activeQuery
        ? `“${activeQuery}” · ${(totalCount ?? 0).toLocaleString()} repositories found`
        : "Popular public repositories from across GitHub"
      : profile
        ? `Repositories from @${profile.username}`
        : "Repositories from the connected account";

  const visibleRepos = view === "explore" ? repos : filteredMineRepos;

  if (sessionStatus === "unauthenticated") {
    return (
      <section className="mt-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
            <Github className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              GitHub Projects
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Discover and browse public repositories from any GitHub user or
              organization.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/70 px-8 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Github className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Sign in to explore GitHub
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Search any public repository, browse your own, and keep a saved
              collection in your Gallery.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <Users className="h-4 w-4" />
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (sessionStatus === "loading") {
    return (
      <section className="mt-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
            <Github className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              GitHub Projects
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Discover and browse public repositories from any GitHub user or
              organization.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-neutral-200 bg-white py-16 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading GitHub Projects…
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
          <Github className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            GitHub Projects
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Discover and browse public repositories from any GitHub user or
            organization.
          </p>
        </div>
      </div>

      {!configured && (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/70 px-8 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Github className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            GitHub is not connected yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            This section becomes available once the server has a{" "}
            <code className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">
              GITHUB_TOKEN
            </code>{" "}
            configured for the GitHub Projects integration.
          </p>
        </div>
      )}

      {configured && !connected && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-neutral-200 bg-neutral-100 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              <Github className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Add your GitHub account
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                Global search still works below. To see{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  My Repositories
                </span>{" "}
                here and your saved ones in the Gallery, add your GitHub profile
                link in{" "}
                <Link
                  href="/profile"
                  className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-600 dark:text-white dark:hover:text-neutral-300"
                >
                  Profile → Social links
                </Link>
                .
              </p>
            </div>
          </div>
          <Link
            href="/profile"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <ExternalLink className="h-4 w-4" />
            Connect GitHub
          </Link>
        </div>
      )}

      {configured && connected && profile && (
        <div className="flex flex-col gap-6 rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
          <span className="grid h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-2xl font-bold tracking-tight">{profile.name}</h3>
              <a
                href={profile.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-white"
              >
                @{profile.username}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {profile.bio && (
              <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300 line-clamp-2">
                {profile.bio}
              </p>
            )}
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
            >
              <Github className="h-4 w-4" />
              View GitHub profile
            </a>
          </div>
          <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
            <ProfileStats label="Public repos" value={profile.publicRepos} />
            <ProfileStats label="Followers" value={formatCount(profile.followers)} />
            <ProfileStats label="Following" value={formatCount(profile.following)} />
          </div>
        </div>
      )}

      {configured && (
        <div className="mt-6">
          <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => switchView("explore")}
              aria-pressed={view === "explore"}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                view === "explore"
                  ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-950"
                  : "text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              }`}
            >
              <Compass className="h-4 w-4" />
              Explore
            </button>
            {connected && (
              <button
                type="button"
                onClick={() => switchView("mine")}
                aria-pressed={view === "mine"}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  view === "mine"
                    ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                My repositories
              </button>
            )}
          </div>

          {view === "explore" && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:max-w-xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Search repositories across GitHub… try “react”, “machine learning”, “typescript”"
                  aria-label="Search GitHub repositories globally"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
                />
                {queryInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueryInput("");
                      setActiveQuery("");
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <button
                type="button"
                onClick={refresh}
                aria-label="Refresh GitHub results"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          )}

          {view === "mine" && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  placeholder="Filter your repositories…"
                  aria-label="Filter your repositories"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <SlidersHorizontal className="h-4 w-4" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  aria-label="Sort repositories"
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <p className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {isSearching && view === "explore" && (
              <span className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching GitHub…
              </span>
            )}
            {!isSearching && (
              <span className="inline-flex items-center gap-1.5">
                {view === "explore" ? (
                  <Globe className="h-3.5 w-3.5" />
                ) : (
                  <FolderKanban className="h-3.5 w-3.5" />
                )}
                {resultMeta}
              </span>
            )}
          </p>

          {actionError && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              {actionError}
            </p>
          )}

          {loadingRepos && (
            <div className="mt-6 flex items-center justify-center gap-3 rounded-3xl border border-neutral-200 bg-white py-16 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              {view === "explore" ? "Searching repositories on GitHub…" : "Loading your repositories…"}
            </div>
          )}

          {!loadingRepos && loadError && repos.length === 0 && (
            <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 px-8 py-12 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {view === "explore"
                    ? "Unable to search repositories"
                    : "Unable to load your repositories"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                  {loadError}
                </p>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          )}

          {!loadingRepos && !loadError && repos.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/70 px-8 py-14 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
              <Search className="mx-auto h-6 w-6 text-neutral-400" />
              <h3 className="mt-3 text-lg font-semibold text-neutral-900 dark:text-white">
                {activeQuery
                  ? `No repositories found for “${activeQuery}”`
                  : "No repositories to show"}
              </h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {activeQuery
                  ? "Try different keywords, or clear the search to browse popular repositories."
                  : "Try searching by name, topic, or language."}
              </p>
            </div>
          )}

          {!loadingRepos && repos.length > 0 && (
            <>
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {visibleRepos.map((repo) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    isSaved={Boolean(savedMap[repo.id])}
                    saving={busySaves[repo.id]}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>

              {view === "mine" && filteredMineRepos.length === 0 && (
                <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/70 px-8 py-14 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
                  <Search className="mx-auto h-6 w-6 text-neutral-400" />
                  <h3 className="mt-3 text-lg font-semibold text-neutral-900 dark:text-white">
                    No matching repositories
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    Try a different search term.
                  </p>
                </div>
              )}

              {loadError && repos.length > 0 && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  {loadError}
                </p>
              )}

              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    {loadingMore ? "Loading…" : "Load more repositories"}
                  </button>
                </div>
              )}

              {!hasNextPage && (
                <p className="mt-6 text-center text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Showing all {repos.length} repositories
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}