'use client';

import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';

type Story = {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isMine: boolean;
  seen: boolean;
};

export default function MoodStory() {
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<Story | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ================= LOAD STORIES ================= */
  const loadStories = async () => {
    const res = await fetch('/api/stories/today', { cache: 'no-store' });
    if (!res.ok) return setStories([]);
    setStories(await res.json());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStories();
  }, []);

  const myStory = stories.find(s => s.isMine);
  const otherStories = stories.filter(s => !s.isMine);

  /* ================= UPLOAD ================= */
  async function uploadStory() {
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append('media', file);

    await fetch('/api/stories/create', {
      method: 'POST',
      body: form,
    });

    setFile(null);
    setUploading(false);
    loadStories();
  }

  /* ================= DELETE ================= */
  async function deleteStory(id: string) {
    await fetch(`/api/stories/delete/${id}`, { method: 'DELETE' });
    setActive(null);
    loadStories();
  }

  /* ================= OPEN STORY ================= */
  async function openStory(story: Story) {
    setActive(story);

    // mark seen (optional backend)
    await fetch(`/api/stories/seen/${story._id}`, { method: 'POST' });
    loadStories();
  }

  return (
    <>
      {/* ================= STORY ROW ================= */}
      <section className="flex gap-4 overflow-x-auto pb-3">

        {/* ADD STORY */}
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
          <label className="relative cursor-pointer">
            <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center">
              <Plus className="text-white" />
            </div>
            <input
              type="file"
              hidden
              accept="image/*,video/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <span className="text-xs text-stone-400">Add</span>

          {file && (
            <button onClick={uploadStory} className="text-xs text-green-400">
              {uploading ? 'Uploading…' : 'Post'}
            </button>
          )}
        </div>

        {/* MY STORY */}
        {myStory && (
          <StoryBubble story={myStory} onClick={() => openStory(myStory)} />
        )}

        {/* OTHERS */}
        {otherStories.map(s => (
          <StoryBubble key={s._id} story={s} onClick={() => openStory(s)} />
        ))}
      </section>

      {/* ================= VIEWER ================= */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {active.mediaType === 'video' ? (
            <video
              src={active.mediaUrl}
              autoPlay
              playsInline
              controls={false}
              className="max-h-full max-w-full"
            />
          ) : (
            <img
              src={active.mediaUrl}
              className="max-h-full max-w-full object-contain"
              alt="story"
            />
          )}

          {/* CLOSE */}
          <button
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 text-white"
          >
            <X />
          </button>

          {/* DELETE (ONLY MINE) */}
          {active.isMine && (
            <button
              onClick={() => deleteStory(active._id)}
              className="absolute bottom-6 bg-red-500 px-4 py-2 rounded-xl text-white flex gap-2"
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ================= STORY BUBBLE ================= */
function StoryBubble({
  story,
  onClick,
}: {
  story: Story;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 min-w-[80px]">
      <div
        className={`w-16 h-16 rounded-2xl p-[2px]
          ${story.seen
            ? 'bg-stone-700'
            : 'bg-gradient-to-tr from-pink-500 via-yellow-400 to-blue-500'
          }`}
      >
        <div className="w-full h-full bg-black rounded-xl overflow-hidden">
          {story.mediaType === 'video' ? (
            <video
              src={story.mediaUrl}
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              alt="story"
            />
          )}
        </div>
      </div>
      <span className="text-xs text-stone-400">Story</span>
    </button>
  );
}
