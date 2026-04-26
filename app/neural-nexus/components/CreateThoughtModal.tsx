"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

type CreatedThought = {
  _id: string;
  title?: string;
  content: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email?: string;
    avatar?: string;
    image?: string;
  } | null;
};

export default function CreateThoughtModal() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitThought() {
    const trimmed = content.trim();

    if (!trimmed) {
      setError("Thought cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/neural/thoughts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create thought");
      }

      const thought: CreatedThought = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      window.dispatchEvent(
        new CustomEvent<CreatedThought>("thought-created", { detail: thought })
      );

      setContent("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thought");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-10 right-10 flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-4 text-sm font-semibold text-black shadow-xl transition hover:bg-cyan-400"
      >
        <Plus className="h-4 w-4" />
        Create Thought
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-cyan-400/20 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">New Thought</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share a thought..."
              className="min-h-32 w-full resize-none rounded-xl border border-slate-700 bg-black p-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
              maxLength={280}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">{content.length}/280</p>
              <button
                type="button"
                onClick={submitThought}
                disabled={loading}
                className="flex min-w-24 items-center justify-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Share
              </button>
            </div>

            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
