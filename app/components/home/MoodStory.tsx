'use client';

import React, { useEffect, useState } from 'react';

type Story = {
  _id: string;
  mediaUrl: string;
  isMine?: boolean;
};

export default function MoodStory() {
  const [stories, setStories] = useState<Story[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  /* ================= LOAD STORIES ================= */
  const loadStories = async () => {
    const res = await fetch('/api/stories/today', { cache: 'no-store' });
    const data = await res.json();
    setStories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStories();
  }, []);

  /* ================= CREATE STORY ================= */
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

    await loadStories(); // 🔥 refresh immediately
  }

  const myStory = stories.find(s => s.isMine);
  const otherStories = stories.filter(s => !s.isMine);

  return (
    <>
      {/* ================= STORY ROW ================= */}
      <section className="flex gap-4 overflow-x-auto pb-3">

        {/* ===== YOUR STORY ===== */}
        <div className="flex flex-col items-center gap-2 min-w-[76px]">

          {/* CLICKABLE STORY */}
          <label className="cursor-pointer">
            <div
              onClick={() => myStory && setActiveStory(myStory)}
              className={`w-16 h-16 rounded-2xl p-[2px]
                ${myStory
                  ? 'bg-gradient-to-tr from-pink-500 via-yellow-400 to-blue-500'
                  : 'bg-stone-700'
                }`}
            >
              <div className="w-full h-full rounded-xl bg-black overflow-hidden flex items-center justify-center">
                {myStory ? (
                  myStory.mediaUrl.endsWith('.mp4') ? (
                    <video
                      src={myStory.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={myStory.mediaUrl}
                      className="w-full h-full object-cover"
                      alt="my-story"
                    />
                  )
                ) : (
                  <span className="text-white text-xl">+</span>
                )}
              </div>
            </div>

            {!myStory && (
              <input
                type="file"
                hidden
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            )}
          </label>

          <span className="text-xs text-stone-300">Your story</span>

          {file && (
            <button
              onClick={uploadStory}
              className="text-xs text-green-400"
            >
              {uploading ? 'Uploading…' : 'Post'}
            </button>
          )}
        </div>

        {/* ===== OTHER STORIES ===== */}
        {otherStories.map(story => (
          <button
            key={story._id}
            onClick={() => setActiveStory(story)}
            className="flex flex-col items-center gap-2 min-w-[76px]"
          >
            <div className="w-16 h-16 rounded-2xl p-[2px]
                            bg-gradient-to-tr from-indigo-500 to-purple-500">
              {story.mediaUrl.endsWith('.mp4') ? (
                <video
                  src={story.mediaUrl}
                  className="w-full h-full rounded-xl object-cover"
                  muted
                />
              ) : (
                <img
                  src={story.mediaUrl}
                  className="w-full h-full rounded-xl object-cover"
                  alt="story"
                />
              )}
            </div>
            <span className="text-xs text-stone-400">Story</span>
          </button>
        ))}
      </section>

      {/* ================= FULLSCREEN VIEWER ================= */}
      {activeStory && (
        <div
          onClick={() => setActiveStory(null)}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          {activeStory.mediaUrl.endsWith('.mp4') ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              controls={false}
              className="max-h-full max-w-full"
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              className="max-h-full max-w-full object-contain"
              alt="story-view"
            />
          )}
        </div>
      )}
    </>
  );
}
