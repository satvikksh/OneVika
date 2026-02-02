'use client';

import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';

type Story = {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isMine: boolean;
  seen: boolean;
  username: string;
};

export default function MoodStory() {
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<Story | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: session } = useSession();

  /* ================= LOAD STORIES ================= */
  const loadStories = async () => {
    try {
      const res = await fetch('/api/stories/today', { cache: 'no-store' });
      if (!res.ok) return setStories([]);
      const data = await res.json();
      setStories(Array.isArray(data) ? data : []);
    } catch {
      setStories([]);
    }
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

  /* ================= OPEN ================= */
  async function openStory(story: Story) {
    setActive(story);
    await fetch(`/api/stories/seen/${story._id}`, { method: 'POST' });
    loadStories();
  }

  return (
    <>
      {/* ================= STORY ROW ================= */}
      <section
       className="
    flex gap-4 px-2
    overflow-x-auto
    overflow-y-visible
    scrollbar-hide
        "
      >
        {/* ADD STORY */}
<div className="flex flex-col items-center min-w-[80px]">
  <label
    className="cursor-pointer flex flex-col items-center"
    onClick={(e) => {
      if (!session) {
        e.preventDefault();
        signIn();
      }
    }}
  >
    <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center">
      <Plus className="text-white" />
    </div>

    {/* TEXT BELOW ADD ICON ✅ */}
    <span className="mt-1 text-xs text-stone-300">Add</span>

    <input
      type="file"
      hidden
      accept="image/*,video/*"
      onChange={(e) => setFile(e.target.files?.[0] || null)}
    />
  </label>

  {file && (
    <button
      onClick={uploadStory}
      className="text-xs text-green-400 mt-1"
    >
      {uploading ? 'Uploading…' : 'Post'}
    </button>
  )}
</div>


        {/* MY STORY */}
        {myStory && (
          <StoryBubble story={myStory} onClick={() => openStory(myStory)} />
        )}

        {/* OTHER STORIES */}
        {otherStories.map(story => (
          <StoryBubble
            key={story._id}
            story={story}
            onClick={() => openStory(story)}
          />
        ))}
      </section>

      {/* ================= FULLSCREEN VIEWER ================= */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">

          {active.mediaType === 'video' ? (
            <video
              src={active.mediaUrl}
              autoPlay
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
            className="fixed top-4 left-4 z-[100] text-white"
          >
            <X size={28} />
          </button>

          {/* DELETE */}
          {active.isMine && (
            <button
              onClick={() => deleteStory(active._id)}
              className="fixed bottom-20 right-4 z-[100] text-white opacity-80 hover:opacity-100"
            >
              <Trash2 size={26} />
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
    <button
      onClick={onClick}
      className="flex flex-col items-center min-w-[80px]"
    >
      {/* STORY IMAGE */}
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

      {/* ✅ USERNAME BELOW STORY (FIXED) */}
      <span className="mt-1 text-xs text-stone-300 truncate max-w-[72px] text-center">
        {story.isMine ? 'Your story' : story.username}
      </span>
    </button>
  );
}

