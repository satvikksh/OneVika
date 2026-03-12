"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus } from "lucide-react";
import { ProjectsShell, statusConfig, type ProjectStatus } from "../project-ui";

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
  status: "active",
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (!session) {
    return (
      <ProjectsShell
        eyebrow="Projects Space"
        title="Sign in to add projects"
        description="Project creation is available after login."
      >
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-400">
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
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Project Details</h2>
              <p className="mt-1 text-sm text-slate-400">
                Fill the fields below and submit.
              </p>
            </div>
            <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Tagline</label>
              <input
                name="tagline"
                value={form.tagline}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              >
                {Object.entries(statusConfig).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                required
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Progress</label>
              <input
                type="number"
                min="0"
                max="100"
                name="progress"
                value={form.progress}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Team Size</label>
              <input
                type="number"
                min="1"
                name="teamSize"
                value={form.teamSize}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Duration</label>
              <input
                name="duration"
                value={form.duration}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">GitHub URL</label>
              <input
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Live URL</label>
              <input
                name="liveUrl"
                value={form.liveUrl}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Tech Stack</label>
              <input
                name="techStack"
                value={form.techStack}
                onChange={handleChange}
                placeholder="Next.js, MongoDB, Tailwind CSS"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">Highlights</label>
              <input
                name="highlights"
                value={form.highlights}
                onChange={handleChange}
                placeholder="Beta launched, 10k users"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-4 pt-2">
              <div className="min-h-6 text-sm">
                {error && <span className="text-rose-400">{error}</span>}
                {!error && success && <span className="text-emerald-300">{success}</span>}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Project
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
          <h2 className="text-2xl font-bold text-white">Visibility</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
            <p>Projects you create appear on your own projects page.</p>
            <p>
              Other users can see your project depending on their access:
              premium users can browse all projects, while non-premium users only see mutual-follow projects.
            </p>
            <p>
              Use clear titles, clean descriptions, and comma-separated tech stack and highlights for the best result.
            </p>
          </div>
        </div>
      </section>
    </ProjectsShell>
  );
}
