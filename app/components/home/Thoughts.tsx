'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Brain, MessageCircle, Heart, Send, Edit3, Trash2, Check, X } from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

const THOUGHT_WINDOW_HOURS = 24;
const THOUGHT_LIMIT = 8;
const MS_PER_HOUR = 60 * 60 * 1000;

interface User {
  _id: string;
  name: string;
  email?: string;
  image?: string;
  avatar?: string;
  isPremium?: boolean;
}

interface Thought {
  _id: string;
  title?: string;
  content: string;
  createdBy: User | null;
  likes?: string[];
  responses?: unknown[];
  comments?: unknown[];
  createdAt: string;
}

export default function Thoughts() {
  const { data: session } = useSession();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [draft, setDraft] = useState('');
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingThoughtId, setUpdatingThoughtId] = useState<string | null>(null);
  const [deletingThoughtId, setDeletingThoughtId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThoughts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/neural/thoughts?recentHours=${THOUGHT_WINDOW_HOURS}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch thoughts');
        }
        
        const data = await response.json();
        
        const cutoff = Date.now() - THOUGHT_WINDOW_HOURS * MS_PER_HOUR;

        const recentThoughts = (data.posts || data)
          .filter((thought: Thought) => {
            const thoughtTime = new Date(thought.createdAt).getTime();
            return Number.isFinite(thoughtTime) && thoughtTime >= cutoff;
          })
          .slice(0, THOUGHT_LIMIT);
        
        setThoughts(recentThoughts);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading thoughts');
        console.error('Error fetching thoughts:', err);
      } finally {
        setLoading(false);
      }
    };

    const handleCreatedThought = (event: Event) => {
      const thought = (event as CustomEvent<Thought>).detail;
      const thoughtTime = new Date(thought?.createdAt).getTime();
      const cutoff = Date.now() - THOUGHT_WINDOW_HOURS * MS_PER_HOUR;

      if (!thought?._id || !Number.isFinite(thoughtTime) || thoughtTime < cutoff) {
        return;
      }

      setThoughts((current) => {
        const withoutDuplicate = current.filter((item) => item._id !== thought._id);
        return [thought, ...withoutDuplicate].slice(0, THOUGHT_LIMIT);
      });
    };

    fetchThoughts();
    window.addEventListener('thought-created', handleCreatedThought);

    const interval = setInterval(fetchThoughts, 5 * 60 * 1000);
    
    return () => {
      window.removeEventListener('thought-created', handleCreatedThought);
      clearInterval(interval);
    };
  }, []);

  async function createThought() {
    const content = draft.trim();

    if (!content) {
      setCreateError('Thought cannot be empty');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/neural/thoughts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create thought');
      }

      const thought: Thought = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      window.dispatchEvent(new CustomEvent<Thought>('thought-created', { detail: thought }));
      setDraft('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating thought');
    } finally {
      setCreating(false);
    }
  }

  function startEditing(thought: Thought) {
    setActionError(null);
    setEditingThoughtId(thought._id);
    setEditDraft(thought.content);
  }

  function cancelEditing() {
    setEditingThoughtId(null);
    setEditDraft('');
  }

  async function updateThought(thoughtId: string) {
    const content = editDraft.trim();

    if (!content) {
      setActionError('Thought cannot be empty');
      return;
    }

    setUpdatingThoughtId(thoughtId);
    setActionError(null);

    try {
      const response = await fetch(`/api/neural/thoughts/${thoughtId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update thought');
      }

      setThoughts((current) =>
        current.map((thought) => (thought._id === thoughtId ? { ...thought, ...data } : thought))
      );
      cancelEditing();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating thought');
    } finally {
      setUpdatingThoughtId(null);
    }
  }

  async function deleteThought(thoughtId: string) {
    setDeletingThoughtId(thoughtId);
    setActionError(null);

    try {
      const response = await fetch(`/api/neural/thoughts/${thoughtId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete thought');
      }

      setThoughts((current) => current.filter((thought) => thought._id !== thoughtId));
      if (editingThoughtId === thoughtId) {
        cancelEditing();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error deleting thought');
    } finally {
      setDeletingThoughtId(null);
    }
  }

  const thoughtComposer = (
    <div className="mb-4 rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Share a thought..."
        maxLength={280}
        className="min-h-20 w-full resize-none bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-600"
      />
      <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2 dark:border-stone-800">
        <span className="text-xs text-stone-400 dark:text-stone-600">{draft.length}/280</span>
        <button
          type="button"
          onClick={createThought}
          disabled={creating}
          className="flex h-8 min-w-20 items-center justify-center gap-1.5 rounded-full bg-stone-900 px-3 text-xs font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Share
        </button>
      </div>
      {createError && <p className="mt-2 text-xs text-red-500 dark:text-red-300">{createError}</p>}
    </div>
  );

  if (loading) {
    return (
      <section className="w-full pb-8">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 flex items-center gap-2 dark:text-stone-400">
          <Brain className="w-4 h-4" />
          Thoughts
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400 dark:text-stone-500" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full pb-8">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 flex items-center gap-2 dark:text-stone-400">
          <Brain className="w-4 h-4" />
          Thoughts
        </h2>
        {thoughtComposer}
        <div className="text-center py-6">
          <p className="text-xs text-stone-500 dark:text-stone-500">{error}</p>
        </div>
      </section>
    );
  }

  if (thoughts.length === 0) {
    return (
      <section className="w-full pb-8">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 flex items-center gap-2 dark:text-stone-400">
          <Brain className="w-4 h-4" />
          Thoughts
        </h2>
        {thoughtComposer}
        <div className="text-center py-8">
          <p className="text-xs text-stone-500 dark:text-stone-500">No thoughts yet. Be the first to share your thoughts!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full pb-8">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide flex items-center gap-2 dark:text-stone-400">
          <Brain className="w-4 h-4" />
          Thoughts
        </h2>
      </div>

      {thoughtComposer}
      {actionError && <p className="mb-3 px-1 text-xs text-red-500 dark:text-red-300">{actionError}</p>}
      
      <div className="flex flex-col gap-3">
        {thoughts.map((thought) => {
          const authorName = thought.createdBy?.name || 'Unknown User';
          const authorAvatar = thought.createdBy?.avatar || thought.createdBy?.image;
          const isOwnThought = Boolean(session?.user?.id && thought.createdBy?._id === session.user.id);
          const isEditing = editingThoughtId === thought._id;

          return (
            <div
              key={thought._id}
              className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-stone-100 p-3 shadow-sm transition-shadow hover:shadow-md group dark:border-stone-800 dark:from-stone-950 dark:to-stone-900"
            >
              {/* Thought Header */}
              <div className="flex items-center gap-2 mb-2">
                {authorAvatar && (
                  <Image
                    src={authorAvatar}
                    alt={authorName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900 text-xs truncate dark:text-stone-100">
                    {authorName}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-500">
                    {new Date(thought.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {isOwnThought && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditing(thought)}
                      className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                      aria-label="Edit thought"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteThought(thought._id)}
                      disabled={deletingThoughtId === thought._id}
                      className="rounded-full p-1.5 text-stone-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-500 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      aria-label="Delete thought"
                    >
                      {deletingThoughtId === thought._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Thought Content */}
              {isEditing ? (
                <div className="mb-2">
                  <textarea
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    maxLength={280}
                    className="min-h-20 w-full resize-none rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 outline-none focus:border-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-stone-600"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => updateThought(thought._id)}
                      disabled={updatingThoughtId === thought._id}
                      className="flex h-7 min-w-16 items-center justify-center gap-1 rounded-full bg-stone-900 px-2 text-xs text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
                    >
                      {updatingThoughtId === thought._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-stone-700 text-xs mb-2 line-clamp-2 group-hover:line-clamp-none transition-all dark:text-stone-300">
                  {thought.content}
                </p>
              )}

              {/* Thought Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-stone-200 text-xs dark:border-stone-800">
                <button className="flex items-center gap-1 text-stone-500 transition hover:text-red-500 dark:text-stone-500 dark:hover:text-red-300">
                  <Heart className="w-3 h-3" />
                  <span>{thought.likes?.length || 0}</span>
                </button>
                <button className="flex items-center gap-1 text-stone-500 transition hover:text-blue-500 dark:text-stone-500 dark:hover:text-blue-300">
                  <MessageCircle className="w-3 h-3" />
                  <span>{thought.responses?.length || thought.comments?.length || 0}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
