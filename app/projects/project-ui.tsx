"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle,
  Clock,
  ExternalLink,
  Github,
  Sparkles,
  Users,
} from "lucide-react";

export type ProjectStatus = "active" | "completed" | "research" | "paused";

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
  active: {
    label: "Active",
    className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  completed: {
    label: "Completed",
    className: "border-blue-500/30 bg-blue-500/15 text-blue-300",
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
}: {
  project: ProjectItem;
  showAuthor: boolean;
}) {
  const status = statusConfig[project.status];

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors hover:border-white/20">
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
    </article>
  );
}
