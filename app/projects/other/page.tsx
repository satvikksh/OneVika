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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  return (
    <ProjectsShell
      eyebrow="Other Projects"
      title="Browse other users' projects"
      description="Search by user name and explore projects based on your access level."
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
          <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
              <label className="mb-3 block text-sm font-medium text-slate-300">
                Search by user name
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creator name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-white outline-none focus:border-cyan-400/40"
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${isPremium ? "bg-amber-400/10 text-amber-300" : "bg-slate-500/10 text-slate-300"}`}>
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {isPremium ? "Premium access" : "Standard access"}
                  </p>
                  <p className="text-xs text-slate-400">
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
