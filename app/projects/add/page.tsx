"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus } from "lucide-react";
import { ProjectsShell, selectableProjectStatuses, type ProjectStatus } from "../project-ui";

type FormState = {
  title: string;
  tagline: string;
  category: string;
  description: string;
  status: ProjectStatus;
  progress: string;
  techStack: string;
  highlights: string;
  githubUrl: string;
  liveUrl: string;
  duration: string;
  teamSize: string;
};

const initialForm: FormState = {
  title: "",
  tagline: "",
  category: "",
  description: "",
  status: "planning",
  progress: "0",
  techStack: "",
  highlights: "",
  githubUrl: "",
  liveUrl: "",
  duration: "",
  teamSize: "1",
};

const splitCommaValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function AddProjectPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          tagline: form.tagline,
          category: form.category,
          description: form.description,
          status: form.status,
          progress: Number(form.progress || 0),
          techStack: splitCommaValues(form.techStack),
          highlights: splitCommaValues(form.highlights),
          githubUrl: form.githubUrl,
          liveUrl: form.liveUrl,
          duration: form.duration,
          teamSize: Number(form.teamSize || 1),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create project");
      }

      setForm(initialForm);
      setSuccess("Project added successfully");
    } catch (submitError) {
      console.error("Failed to create project:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500 dark:text-neutral-300" />
      </div>
    );
  }

  if (!session) {
    return (
      <ProjectsShell
        eyebrow="Add Project"
        title="Sign in to add projects"
        description="Project creation is available after login."
      >
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/70 p-10 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-400">
          Sign in first, then create a project from this page.
        </div>
      </ProjectsShell>
    );
  }

  return (
    <ProjectsShell
      eyebrow="Add Project"
      title="Publish a new project"
      description="Add your own project here. It will appear in your own projects page immediately."
    >
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Project Details</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Fill the fields below and submit.
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tagline</label>
              <input
                name="tagline"
                value={form.tagline}
                onChange={handleChange}
                placeholder="A one-line summary of the project"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white"
              >
                {selectableProjectStatuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder="What does this project do?"
                required
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Progress</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="progress"
                  value={form.progress}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 pr-10 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400 dark:text-neutral-500">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Team Size</label>
              <input
                type="number"
                min="1"
                name="teamSize"
                value={form.teamSize}
                onChange={handleChange}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Duration</label>
              <input
                name="duration"
                value={form.duration}
                onChange={handleChange}
                placeholder="e.g. 6 months"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">GitHub URL</label>
              <input
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/user/repo"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Live URL</label>
              <input
                name="liveUrl"
                value={form.liveUrl}
                onChange={handleChange}
                placeholder="https://your-project.com"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tech Stack</label>
              <input
                name="techStack"
                value={form.techStack}
                onChange={handleChange}
                placeholder="Next.js, MongoDB, Tailwind CSS"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Highlights</label>
              <input
                name="highlights"
                value={form.highlights}
                onChange={handleChange}
                placeholder="Beta launched, 10k users"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-4 pt-2">
              <div className="min-h-6 text-sm">
                {error && <span className="text-rose-600 dark:text-rose-400">{error}</span>}
                {!error && success && <span className="text-emerald-600 dark:text-emerald-400">{success}</span>}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Project
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
          <h2 className="text-2xl font-bold tracking-tight">Visibility</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-neutral-600">
            <p>Projects you create appear instantly on your My Projects board.</p>
            <p>
              Other users can see your project depending on their access: premium
              users can browse all projects, while non-premium users only see
              mutual-follow projects.
            </p>
            <p>
              Use clear titles, clean descriptions, and comma-separated tech stack
              and highlights for the best result.
            </p>
          </div>
        </div>
      </section>
    </ProjectsShell>
  );
}
