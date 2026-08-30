"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CheckCircle,
  Clock,
  ExternalLink,
  FolderKanban,
  Github,
  LayoutGrid,
  Loader2,
  Pencil,
  PlusCircle,
  Users,
  X,
} from "lucide-react";

export type ProjectStatus =
  | "planning"
  | "in-progress"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "active"
  | "research"
  | "paused";

export type ProjectItem = {
  id: string;
  title: string;
  tagline: string;
  category: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  techStack: string[];
  highlights: string[];
  githubUrl: string;
  liveUrl: string;
  duration: string;
  teamSize: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
};

export const statusConfig: Record<
  ProjectStatus,
  { label: string; dotClass: string }
> = {
  planning: { label: "Planning", dotClass: "bg-violet-500" },
  "in-progress": { label: "In Progress", dotClass: "bg-emerald-500" },
  "on-hold": { label: "On Hold", dotClass: "bg-amber-500" },
  completed: { label: "Completed", dotClass: "bg-emerald-600" },
  cancelled: { label: "Cancelled", dotClass: "bg-rose-500" },
  active: { label: "Active", dotClass: "bg-emerald-500" },
  research: { label: "Research", dotClass: "bg-cyan-500" },
  paused: { label: "Paused", dotClass: "bg-neutral-400" },
};

const FALLBACK_STATUS = {
  label: "Unknown",
  dotClass: "bg-neutral-400",
};

export const selectableProjectStatuses: {
  value: ProjectStatus;
  label: string;
}[] = [
  { value: "planning", label: "Planning" },
  { value: "in-progress", label: "In Progress" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PROJECT_TABS = [
  { href: "/projects", label: "Overview", icon: LayoutGrid },
  { href: "/projects/add", label: "Add Project", icon: PlusCircle },
  { href: "/projects/own", label: "My Projects", icon: FolderKanban },
  { href: "/projects/other", label: "Other Projects", icon: Users },
];

function isActiveTab(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects";
  }
  return pathname.startsWith(href);
}

function OwnerAvatar({
  name,
  avatar,
  size = 40,
}: {
  name: string;
  avatar?: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
      style={{ width: size, height: size }}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-bold">{name?.[0]?.toUpperCase() || "U"}</span>
      )}
    </div>
  );
}

export function ProjectsShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
              {eyebrow}
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </header>

        <nav className="mb-10 inline-flex flex-wrap gap-1 rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {PROJECT_TABS.map((tab) => {
            const active = isActiveTab(pathname ?? "", tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}

export function EmptyProjects({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/70 px-8 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        <Briefcase className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}

export function ProjectCard({
  project,
  showAuthor,
  canEdit = false,
  onStatusUpdated,
}: {
  project: ProjectItem;
  showAuthor: boolean;
  canEdit?: boolean;
  onStatusUpdated?: (
    projectId: string,
    status: ProjectStatus,
    progress: number
  ) => void;
}) {
  const status = statusConfig[project.status] ?? FALLBACK_STATUS;
  const [editorOpen, setEditorOpen] = useState(false);

  const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
  const progressFillClass =
    project.status === "completed"
      ? "bg-emerald-600 dark:bg-emerald-500"
      : "bg-neutral-900 dark:bg-white";
  const updatedLabel = useMemo(() => {
    const date = new Date(project.updatedAt);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [project.updatedAt]);

  const visibleTech = project.techStack.slice(0, 6);
  const extraTech = Math.max(0, project.techStack.length - visibleTech.length);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
            <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
            {status.label}
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {project.category}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            aria-label={`Update status for ${project.title}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
          >
            <Pencil className="h-3 w-3" />
            Update
          </button>
        )}
      </div>

      <div className="px-5 pt-4">
        <div className="mb-2 flex items-end justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Progress
          </p>
          <p className="text-xl font-black leading-none">{progress}%</p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${project.title} progress`}
        >
          <div
            className={`h-2 rounded-full transition-all ${progressFillClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 px-5 pt-5">
        <h3 className="text-2xl font-bold tracking-tight">{project.title}</h3>
        {project.tagline && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {project.tagline}
          </p>
        )}

        {showAuthor && (
          <div className="mt-4 flex items-center gap-3">
            <OwnerAvatar name={project.user.name} avatar={project.user.avatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{project.user.name}</p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {project.user.email || "Project owner"}
              </p>
            </div>
          </div>
        )}

        {project.highlights.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {project.highlights.slice(0, 3).map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                <span className="line-clamp-2">{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        {project.description && (
          <p className="mt-4 text-sm leading-6 text-neutral-600 line-clamp-3 dark:text-neutral-300">
            {project.description}
          </p>
        )}
      </div>

      {visibleTech.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-5">
          {visibleTech.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {tech}
            </span>
          ))}
          {extraTech > 0 && (
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500">
              +{extraTech}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 px-5 pt-5">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/60">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Users className="h-3 w-3" />
            Team
          </div>
          <div className="text-sm font-bold">{project.teamSize}</div>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/60">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3 w-3" />
            Duration
          </div>
          <div className="truncate text-sm font-bold">{project.duration || "—"}</div>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/60">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <CheckCircle className="h-3 w-3" />
            Updated
          </div>
          <div className="truncate text-sm font-bold">{updatedLabel}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-neutral-100 p-5 dark:border-neutral-800">
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        )}
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <ExternalLink className="h-4 w-4" />
            Live Demo
          </a>
        )}
        {canEdit && !editorOpen && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Update Status
          </button>
        )}
      </div>

      {editorOpen && canEdit && (
        <ProjectStatusEditor
          project={project}
          onClose={() => setEditorOpen(false)}
          onUpdated={(projectId, newStatus, newProgress) => {
            onStatusUpdated?.(projectId, newStatus, newProgress);
            setEditorOpen(false);
          }}
        />
      )}
    </article>
  );
}

function ProjectStatusEditor({
  project,
  onClose,
  onUpdated,
}: {
  project: ProjectItem;
  onClose: () => void;
  onUpdated: (projectId: string, status: ProjectStatus, progress: number) => void;
}) {
  const currentConfig = statusConfig[project.status] ?? FALLBACK_STATUS;
  const currentProgress = Number(project.progress) || 0;
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [progressInput, setProgressInput] = useState(String(currentProgress));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    const list = [...selectableProjectStatuses];
    if (!list.some((option) => option.value === project.status)) {
      list.push({
        value: project.status,
        label: currentConfig.label,
      });
    }
    return list;
  }, [project.status, currentConfig.label]);

  const parsedProgress = Number(progressInput);
  const unchanged =
    status === project.status &&
    Number.isFinite(parsedProgress) &&
    parsedProgress === currentProgress;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || unchanged) return;

    const progress = Number(progressInput);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      setError("Progress must be between 0 and 100");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, progress }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update project");
      }

      onUpdated(project.id, status, progress);
    } catch (saveError) {
      console.error("Failed to update project:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update project"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close status editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSave}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-tight">
              Update status &amp; progress
            </h3>
            <p className="mt-1 truncate text-sm text-neutral-500 dark:text-neutral-400">
              {project.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Current status
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              <span className={`h-2 w-2 rounded-full ${currentConfig.dotClass}`} />
              {currentConfig.label}
            </span>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Current progress
            </p>
            <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              {currentProgress}%
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="project-status-select"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Status
            </label>
            <select
              id="project-status-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="project-progress-input"
              className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Progress (0–100)
            </label>
            <div className="relative">
              <input
                id="project-progress-input"
                type="number"
                min="0"
                max="100"
                step="1"
                value={progressInput}
                onChange={(event) => setProgressInput(event.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400 dark:text-neutral-500">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Number.isFinite(parsedProgress) && parsedProgress >= 0 && parsedProgress <= 100 ? parsedProgress : 0}
            onChange={(event) => setProgressInput(event.target.value)}
            className="w-full accent-neutral-900 dark:accent-white"
            aria-label="Progress slider"
          />
          <div className="mt-1 flex justify-between text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-h-5 flex-1 text-sm">
            {error && (
              <span className="text-rose-600 dark:text-rose-400">{error}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || unchanged}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}