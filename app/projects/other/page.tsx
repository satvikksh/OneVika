"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Crown, Loader2, Search } from "lucide-react";
import { EmptyProjects, ProjectCard, ProjectsShell, type ProjectItem } from "../project-ui";

export default function OtherProjectsPage() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const fetchOtherProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/projects?scope=other", { cache: "no-store" });
        const payload = (await response.json()) as {
          projects?: ProjectItem[];
          isPremium?: boolean;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load other projects");
        }

        setProjects(Array.isArray(payload.projects) ? payload.projects : []);
        setIsPremium(Boolean(payload.isPremium));
      } catch (fetchError) {
        console.error("Failed to load other projects:", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load other projects");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchOtherProjects();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      project.user.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500 dark:text-neutral-300" />
      </div>
    );
  }

  return (
    <ProjectsShell
      eyebrow="Other Projects"
      title="Explore what others are building"
      description="Search by creator name and explore projects based on your access level."
    >
      {!session ? (
        <EmptyProjects
          title="Sign in to browse projects"
          description="Other users' projects are available after login."
        />
      ) : error ? (
        <EmptyProjects title="Unable to load projects" description={error} />
      ) : (
        <>
          <section className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto]">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
              <label className="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Search by creator name
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creator name"
                  className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                    isPremium
                      ? "bg-neutral-900 text-amber-300 dark:bg-white dark:text-amber-500"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {isPremium ? "Premium access" : "Standard access"}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {isPremium
                      ? "You can see every other user's projects."
                      : "You can only see mutual-follow projects."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {filteredProjects.length === 0 ? (
            <EmptyProjects
              title="No projects found"
              description={
                searchQuery
                  ? "No projects matched that creator name."
                  : isPremium
                    ? "No other users have added projects yet."
                    : "No mutual-follow users have published projects yet."
              }
            />
          ) : (
            <section className="grid gap-6 lg:grid-cols-2">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} showAuthor />
              ))}
            </section>
          )}
        </>
      )}
    </ProjectsShell>
  );
}
