"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Crown, FolderKanban, Plus, Users } from "lucide-react";
import { ProjectsShell } from "./project-ui";

const sections = [
  {
    href: "/projects/add",
    title: "Add Project",
    description: "Create a new project entry with title, description, status, links, tech stack, and highlights.",
    icon: Plus,
    count: null as number | null,
  },
  {
    href: "/projects/own",
    title: "My Projects",
    description: "Every project created by your account in one dedicated board.",
    icon: FolderKanban,
    count: null as number | null,
  },
  {
    href: "/projects/other",
    title: "Other Projects",
    description: "Browse other users' projects. Premium users see all, others only see mutual-follow projects.",
    icon: Users,
    count: null as number | null,
  },
];

export default function ProjectsPage() {
  const { status } = useSession();
  const [counts, setCounts] = useState<{ own: number; other: number } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    let active = true;

    fetch("/api/projects", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return;
        setCounts({
          own: Array.isArray(payload?.ownProjects) ? payload.ownProjects.length : 0,
          other: Array.isArray(payload?.otherProjects) ? payload.otherProjects.length : 0,
        });
      })
      .catch(() => {
        if (active) setCounts(null);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const withCounts = sections.map((section) => ({
    ...section,
    count:
      status !== "authenticated"
        ? null
        : section.href === "/projects/own"
          ? counts?.own
          : section.href === "/projects/other"
            ? counts?.other
            : null,
  }));

  return (
    <ProjectsShell
      eyebrow="Project Workspace"
      title="Build, manage and showcase your work"
      description="Create and keep track of your projects, update status and progress, and explore what others are building on OrbitByte.">
      <section className="grid gap-5 md:grid-cols-3">
        {withCounts.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col rounded-3xl border border-neutral-200 bg-white p-7 text-neutral-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-900 text-white transition-colors group-hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:group-hover:bg-neutral-200">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-300 transition-all group-hover:translate-x-1 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {section.description}
              </p>
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {section.count === null
                  ? "Sign in to see activity"
                  : `${section.count} ${section.count === 1 ? "project" : "projects"}`}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-neutral-200 bg-neutral-100 p-8 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-200 text-amber-500 dark:bg-neutral-800 dark:text-amber-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Premium visibility rule
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-400">
              Premium users can browse all other users&apos; projects. Users without
              premium only see projects from people who mutually follow each other with
              them.
            </p>
          </div>
        </div>
      </section>
    </ProjectsShell>
  );
}