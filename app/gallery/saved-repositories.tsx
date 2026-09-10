"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookMarked,
  Bookmark,
  CalendarDays,
  ExternalLink,
  GitFork,
  Github,
  Loader2,
  Star,
} from "lucide-react";

type SavedRepository = {
  id: string;
  githubRepositoryId: string;
  name: string;
  fullName: string;
  ownerLogin: string;
  ownerAvatar: string;
  description: string;
  htmlUrl: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  savedAt: string;
};

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

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
}

function formatSavedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SavedRepositoriesSection({
  onCountChange,
}: {
  onCountChange: (count: number) => void;
}) {
  const [repositories, setRepositories] = useState<SavedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unsavingIds, setUnsavingIds] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/saved-repositories");
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Please sign in to see your saved repositories."
              : "Failed to load saved repositories."
          );
        }
        const payload = (await response.json()) as {
          repositories?: SavedRepository[];
        };
        if (!active) return;
        setRepositories(Array.isArray(payload.repositories) ? payload.repositories : []);
        setLoadError(null);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load saved repositories."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onCountChange(repositories.length);
  }, [repositories.length, onCountChange]);

  const unsave = useCallback(async (saved: SavedRepository) => {
    setUnsavingIds((prev) => ({ ...prev, [saved.id]: true }));
    setActionError(null);
    try {
      const response = await fetch(`/api/saved-repositories/${saved.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error || "Failed to remove the repository."
        );
      }
      setRepositories((prev) => prev.filter((repo) => repo.id !== saved.id));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to remove the repository."
      );
    } finally {
      setUnsavingIds((prev) => {
        const next = { ...prev };
        delete next[saved.id];
        return next;
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400">
        <Loader2 className="h-7 w-7 animate-spin text-stone-300 dark:text-stone-500" />
        <span className="ml-2 text-sm">Loading your saved repositories…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 px-6 py-20 text-center dark:border-rose-500/25 dark:bg-rose-500/10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-5 text-sm font-semibold text-rose-800 dark:text-rose-200">
          {loadError}
        </p>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 px-6 py-20 text-center dark:border-gray-800">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-white/5 dark:text-stone-500">
          <Github className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-stone-900 dark:text-stone-100">
          No repositories saved yet
        </h2>
        <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
          Tap Save on any repository in the Projects section to keep it here — your
          own private collection of useful open-source projects.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
        >
          Browse repositories <ExternalLink size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4" />
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {repositories.map((saved) => (
          <article
            key={saved.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-[#0d0d0f] dark:hover:border-gray-600"
          >
            <div className="p-4 pb-0">
              <div className="flex items-start justify-between gap-3">
                <a
                  href={saved.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 text-lg font-bold tracking-tight text-stone-900 hover:underline dark:text-stone-100"
                >
                  {saved.name}
                </a>
                <button
                  type="button"
                  onClick={() => unsave(saved)}
                  disabled={unsavingIds[saved.id]}
                  aria-label={`Remove ${saved.name} from saved repositories`}
                  title="Remove from Gallery"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform hover:scale-110 hover:text-rose-500 dark:bg-white/10 dark:text-stone-400"
                >
                  {unsavingIds[saved.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bookmark size={15} className="fill-current" />
                  )}
                </button>
              </div>
              <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                {saved.fullName}
              </p>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <p className="text-sm leading-6 text-stone-600 line-clamp-3 dark:text-stone-300">
                {saved.description || "No description provided."}
              </p>

              {saved.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {saved.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[11px] font-medium text-stone-600 dark:border-gray-700 dark:bg-white/5 dark:text-stone-300"
                    >
                      {topic}
                    </span>
                  ))}
                  {saved.topics.length > 3 && (
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[11px] font-medium text-stone-400 dark:border-gray-700 dark:bg-white/5 dark:text-stone-500">
                      +{saved.topics.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 overflow-hidden rounded-full bg-stone-200 text-stone-600 dark:bg-gray-700 dark:text-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={saved.ownerAvatar}
                    alt=""
                    width={24}
                    height={24}
                    className="h-full w-full object-cover"
                  />
                </span>
                <a
                  href={`https://github.com/${saved.ownerLogin}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`${saved.ownerLogin} on GitHub`}
                  className="truncate text-sm font-semibold text-stone-700 hover:underline dark:text-stone-200"
                >
                  {saved.ownerLogin}
                </a>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 p-4 text-xs font-medium text-stone-500 dark:border-gray-800 dark:text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: saved.language
                      ? LANGUAGE_COLORS[saved.language] ?? "#8a8f98"
                      : "#8a8f98",
                  }}
                />
                {saved.language || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {formatCount(saved.stars)}
              </span>
              <span className="inline-flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5" />
                {formatCount(saved.forks)}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500">
                <CalendarDays size={11} />
                {formatSavedDate(saved.savedAt)}
              </span>
            </div>

            <a
              href={saved.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 border-t border-stone-100 bg-stone-50 px-4 py-3 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-gray-800 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10"
            >
              <BookMarked className="h-3.5 w-3.5" />
              Open on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}