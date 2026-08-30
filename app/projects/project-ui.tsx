"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle,
  Clock,
  ExternalLink,
  Github,
  Loader2,
  Pencil,
  Sparkles,
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
  { label: string; className: string }
> = {
  planning: {
    label: "Planning",
    className: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  },
  "in-progress": {
    label: "In Progress",
    className: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
  },
  "on-hold": {
    label: "On Hold",
    className: "border-orange-500/30 bg-orange-500/15 text-orange-300",
  },
  completed: {
    label: "Completed",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  },
  active: {
    label: "Active",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  research: {
    label: "Research",
    className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  paused: {
    label: "Paused",
    className: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  },
};

const FALLBACK_STATUS = {
  label: "Unknown",
  className: "border-slate-500/30 bg-slate-500/15 text-slate-300",
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
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_46%,_#111827_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="mb-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
          <div className="max-w-4xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </p>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/projects"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
            >
              Overview
            </Link>
            <Link
              href="/projects/add"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
            >
              Add Project
            </Link>
            <Link
              href="/projects/own"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
            >
              Own Projects
            </Link>
            <Link
              href="/projects/other"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
            >
              Other Projects
            </Link>
          </div>
        </section>

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
    <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
      <Briefcase className="mx-auto mb-4 h-10 w-10 text-slate-500" />
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
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

  return (
    <article className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors hover:border-white/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
              {project.category}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                aria-label={`Update status for ${project.title}`}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <Pencil className="h-3 w-3" />
                Update Status
              </button>
            )}
          </div>
          <h3 className="truncate text-2xl font-bold text-white">{project.title}</h3>
          {project.tagline && (
            <p className="mt-1 text-sm text-slate-300">{project.tagline}</p>
          )}
        </div>

        {showAuthor && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
              {project.user.avatar ? (
                <Image
                  src="/icons/orbitoai.png"
                  alt={project.user.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {project.user.name?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {project.user.name}
              </p>
              <p className="truncate text-xs text-slate-400">{project.user.email}</p>
            </div>
          </div>
        )}
      </div>

      <p className="mb-5 text-sm leading-7 text-slate-300">{project.description}</p>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {project.techStack.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {project.highlights.length > 0 && (
        <div className="mb-5 space-y-2">
          {project.highlights.slice(0, 3).map((highlight) => (
            <div key={highlight} className="flex items-start gap-2 text-sm text-slate-300">
              <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/5 px-3 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Users className="h-3.5 w-3.5" />
            Team
          </div>
          <div className="font-semibold text-white">{project.teamSize}</div>
        </div>
        <div className="rounded-2xl bg-white/5 px-3 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Duration
          </div>
          <div className="font-semibold text-white">{project.duration || "N/A"}</div>
        </div>
        <div className="col-span-2 rounded-2xl bg-white/5 px-3 py-3 sm:col-span-1">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <CheckCircle className="h-3.5 w-3.5" />
            Updated
          </div>
          <div className="font-semibold text-white">
            {new Date(project.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {(project.githubUrl || project.liveUrl) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Demo
                </a>
              )}
            </div>
          )}

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
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [progressInput, setProgressInput] = useState(String(project.progress));
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
  const currentProgress = Number(project.progress) || 0;
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
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-white">Update status &amp; progress</h3>
            <p className="mt-1 truncate text-sm text-slate-400">{project.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Current status
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${currentConfig.className}`}
            >
              {currentConfig.label}
            </span>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Current progress
            </p>
            <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-300">
              {currentProgress}%
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="project-status-select"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Status
            </label>
            <select
              id="project-status-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
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
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Progress (0–100)
            </label>
            <input
              id="project-progress-input"
              type="number"
              min="0"
              max="100"
              step="1"
              value={progressInput}
              onChange={(event) => setProgressInput(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-h-5 flex-1 text-sm">
            {error && <span className="text-rose-400">{error}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || unchanged}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-60"
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
