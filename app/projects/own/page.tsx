"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import {
  EmptyProjects,
  ProjectCard,
  ProjectsShell,
  type ProjectItem,
  type ProjectStatus,
} from "../project-ui";

export default function OwnProjectsPage() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/projects?scope=own", { cache: "no-store" });
        const payload = (await response.json()) as {
          projects?: ProjectItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load own projects");
        }

        setProjects(Array.isArray(payload.projects) ? payload.projects : []);
      } catch (fetchError) {
        console.error("Failed to load own projects:", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load own projects");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchOwnProjects();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500 dark:text-neutral-300" />
      </div>
    );
  }

  const handleStatusUpdated = (
    projectId: string,
    newStatus: ProjectStatus,
    newProgress: number
  ) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? { ...project, status: newStatus, progress: newProgress }
          : project
      )
    );
  };

  return (
    <ProjectsShell
      eyebrow="My Projects"
      title="Your personal project board"
      description="Everything created by your account appears here. Click Update on any card to change its status and progress."
    >
      {!session ? (
        <EmptyProjects
          title="Sign in to view your projects"
          description="Your project list is available after login."
        />
      ) : error ? (
        <EmptyProjects title="Unable to load projects" description={error} />
      ) : projects.length === 0 ? (
        <EmptyProjects
          title="No own projects yet"
          description="Go to Add Project and publish your first one."
        />
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showAuthor={false}
              canEdit
              onStatusUpdated={handleStatusUpdated}
            />
          ))}
        </section>
      )}
    </ProjectsShell>
  );
}
