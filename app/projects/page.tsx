"use client";

import Link from "next/link";
import { Crown, FolderKanban, Plus, Users } from "lucide-react";
import { ProjectsShell } from "./project-ui";

const sections = [
  {
    href: "/projects/add",
    title: "Add Project",
    description: "Create a new project entry with title, description, status, links, tech stack, and highlights.",
    icon: Plus,
    accent: "from-cyan-400 to-blue-500",
  },
  {
    href: "/projects/own",
    title: "Own Projects",
    description: "See every project created by your account in one dedicated page.",
    icon: FolderKanban,
    accent: "from-emerald-400 to-cyan-500",
  },
  {
    href: "/projects/other",
    title: "Other Projects",
    description: "Browse other users' projects. Premium users can see all other users. Non-premium users only see mutual-follow projects.",
    icon: Users,
    accent: "from-fuchsia-400 to-cyan-500",
  },
];

export default function ProjectsPage() {
  return (
    <ProjectsShell
      eyebrow="Projects Space"
      title="Choose a project workspace"
      description="Create, manage, and showcase your projects in one place. Browse others' projects for inspiration and collaboration.">
      <section className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-2xl transition-all hover:-translate-y-1 hover:border-white/20"
          >
            <div
              className={`mb-6 inline-flex rounded-2xl bg-gradient-to-r ${section.accent} p-4 text-slate-950`}
            >
              <section.icon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{section.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-400/10 p-3 text-amber-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Premium visibility rule</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Premium users can browse all other users&apos; projects. Users without premium
              only see projects from people who mutually follow each other with them.
            </p>
          </div>
        </div>
      </section>
    </ProjectsShell>
  );
}
