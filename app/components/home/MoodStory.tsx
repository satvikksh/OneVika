'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Eye, Loader2, Trash2, UserCircle, X, Plus } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';

const IMAGE_STORY_DURATION_MS = 30_000;
const VIEW_TRACK_DELAY_MS = 1_000;
const VIEWER_PAGE_SIZE = 30;
const VIEWER_REFRESH_MS = 10_000;

type Story = {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isMine: boolean;
  seen: boolean;
  username: string;
  userAvatar?: string;
  viewerCount?: number;
};

type StoryViewer = {
  viewerId: string;
  viewerName: string;
  viewerUsername: string;
  viewerProfilePicture?: string;
  viewedAt: string;
};

type ViewersState = {
  viewers: StoryViewer[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
};

const emptyViewersState: ViewersState = {
  viewers: [],
  total: 0,
  page: 0,
  hasMore: false,
  loading: false,
  error: null,
};

export default function MoodStory() {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(IMAGE_STORY_DURATION_MS);
  const [viewersPanelOpen, setViewersPanelOpen] = useState(false);
  const [viewersByStory, setViewersByStory] = useState<Record<string, ViewersState>>({});
  const [isDismissing, setIsDismissing] = useState(false);

  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);
  const storyStartedAtRef = useRef(0);
  const viewTimerRef = useRef<number | null>(null);
  const feedScrollYRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  /* ================= LOAD STORIES ================= */
  const loadStories = useCallback(async () => {
    try {
      const res = await fetch('/api/stories/today', { cache: 'no-store' });
      if (!res.ok) return setStories([]);
      const data = await res.json();
      setStories(Array.isArray(data) ? data : []);
    } catch {
      setStories([]);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const visibleStories = useMemo(() => {
    const myStory = stories.find((story) => story.isMine);
    const otherStories = stories.filter((story) => !story.isMine);
    return myStory ? [myStory, ...otherStories] : otherStories;
  }, [stories]);

  const active = activeIndex === null ? null : visibleStories[activeIndex] ?? null;
  const activeStoryId = active?._id ?? null;
  const activeMediaType = active?.mediaType ?? null;
  const activeViewers = active ? viewersByStory[active._id] ?? emptyViewersState : emptyViewersState;

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
    void loadStories();
  }

  /* ================= DELETE ================= */
  async function deleteStory(id: string) {
    await fetch(`/api/stories/delete/${id}`, { method: 'DELETE' });
    setActiveIndex(null);
    void loadStories();
  }

  const closeStory = useCallback(() => {
    if (isDismissing) return;

    setIsDismissing(true);
    window.setTimeout(() => {
      setActiveIndex(null);
      setViewersPanelOpen(false);
      setIsDismissing(false);
      window.scrollTo({ top: feedScrollYRef.current, behavior: 'instant' });
    }, 240);
  }, [isDismissing]);

  const goToStory = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0) return;
      if (nextIndex >= visibleStories.length) {
        closeStory();
        return;
      }

      setActiveIndex(nextIndex);
      setViewersPanelOpen(false);
    },
    [closeStory, visibleStories.length]
  );

  const goNext = useCallback(() => {
    if (activeIndex === null) return;
    goToStory(activeIndex + 1);
  }, [activeIndex, goToStory]);

  const goPrevious = useCallback(() => {
    if (activeIndex === null) return;
    goToStory(activeIndex - 1);
  }, [activeIndex, goToStory]);

  /* ================= OPEN ================= */
  function openStory(index: number) {
    feedScrollYRef.current = window.scrollY;
    setActiveIndex(index);
    setProgress(0);
    setViewersPanelOpen(false);
  }

  const recordView = useCallback(async (storyId: string) => {
    try {
      await fetch(`/api/stories/seen/${storyId}`, { method: 'POST' });
      void loadStories();
    } catch {
      // Keep the viewer open; a later active watch can retry tracking.
    }
  }, [loadStories]);

  const loadViewers = useCallback(
    async (storyId: string, page = 1) => {
      setViewersByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...(prev[storyId] ?? emptyViewersState),
          loading: true,
          error: null,
        },
      }));

      try {
        const res = await fetch(
          `/api/stories/viewers/${storyId}?page=${page}&limit=${VIEWER_PAGE_SIZE}`,
          { cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Unable to load viewers');
        }

        setViewersByStory((prev) => ({
          ...prev,
          [storyId]: {
            viewers:
              page === 1
                ? data.viewers ?? []
                : [...(prev[storyId]?.viewers ?? []), ...(data.viewers ?? [])],
            total: Number(data.total) || 0,
            page: Number(data.page) || page,
            hasMore: Boolean(data.hasMore),
            loading: false,
            error: null,
          },
        }));
      } catch (error) {
        setViewersByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...(prev[storyId] ?? emptyViewersState),
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to load viewers',
          },
        }));
      }
    },
    []
  );

  useEffect(() => {
    if (!activeStoryId || !activeMediaType) return;

    setProgress(0);
    setDurationMs(activeMediaType === 'image' ? IMAGE_STORY_DURATION_MS : 0);
    storyStartedAtRef.current = performance.now();

    if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
    if (!active?.isMine) {
      viewTimerRef.current = window.setTimeout(() => {
        void recordView(activeStoryId);
      }, VIEW_TRACK_DELAY_MS);
    }

    if (autoAdvanceRef.current) window.clearTimeout(autoAdvanceRef.current);
    if (activeMediaType === 'image') {
      autoAdvanceRef.current = window.setTimeout(goNext, IMAGE_STORY_DURATION_MS);
    }

    return () => {
      if (viewTimerRef.current) window.clearTimeout(viewTimerRef.current);
      if (autoAdvanceRef.current) window.clearTimeout(autoAdvanceRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
    };
  }, [activeStoryId, activeMediaType, active?.isMine, goNext, recordView]);

  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !active.isMine || !viewersPanelOpen) return;
    const current = viewersByStory[active._id];
    if (!current || current.page === 0) {
      void loadViewers(active._id, 1);
    }
  }, [active, loadViewers, viewersByStory, viewersPanelOpen]);

  useEffect(() => {
    if (!active || !active.isMine || !viewersPanelOpen) return;

    const interval = window.setInterval(() => {
      void loadViewers(active._id, 1);
    }, VIEWER_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [active, loadViewers, viewersPanelOpen]);

  useEffect(() => {
    if (!activeStoryId || durationMs <= 0) return;

    const tick = () => {
      if (activeMediaType === 'video' && videoRef.current?.duration) {
        setProgress(Math.min(videoRef.current.currentTime / videoRef.current.duration, 1));
      } else {
        const elapsed = performance.now() - storyStartedAtRef.current;
        setProgress(Math.min(elapsed / durationMs, 1));
      }

      progressFrameRef.current = requestAnimationFrame(tick);
    };

    progressFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
    };
  }, [activeStoryId, activeMediaType, durationMs]);

  const handleVideoMetadata = () => {
    const video = videoRef.current;
    if (!video?.duration || Number.isNaN(video.duration)) return;
    setDurationMs(video.duration * 1000);
  };

  const handleViewerWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!active) return;

    if (event.deltaY > 24 && active.isMine) {
      setViewersPanelOpen(true);
      return;
    }

    if (event.deltaY < -24) {
      if (viewersPanelOpen) {
        setViewersPanelOpen(false);
      } else {
        closeStory();
      }
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!active || touchStartYRef.current === null) return;

    const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = endY - touchStartYRef.current;
    touchStartYRef.current = null;

    if (deltaY > 45 && active.isMine) {
      setViewersPanelOpen(true);
      return;
    }

    if (deltaY < -45) {
      if (viewersPanelOpen) {
        setViewersPanelOpen(false);
      } else {
        closeStory();
      }
    }
  };

  const handleStoryTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (viewersPanelOpen || isDismissing) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    if (event.clientX < window.innerWidth / 2) {
      goPrevious();
    } else {
      goNext();
    }
  };

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
        <div className="flex min-w-[80px] flex-col items-center">
          <label
            className="flex cursor-pointer flex-col items-center"
            onClick={(e) => {
              if (!session) {
                e.preventDefault();
                signIn();
              }
            }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-800">
              <Plus className="text-white" />
            </div>

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
              className="mt-1 text-xs text-green-400"
            >
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          )}
        </div>

        {visibleStories.map((story, index) => (
          <StoryBubble
            key={story._id}
            story={story}
            onClick={() => openStory(index)}
          />
        ))}
      </section>

      {/* ================= FULLSCREEN VIEWER ================= */}
      {active && (
        <div
          className={`fixed inset-0 z-50 flex touch-none items-center justify-center overflow-hidden bg-black transition-all duration-200 ease-out ${
            isDismissing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
          onClick={handleStoryTap}
          onWheel={handleViewerWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] flex gap-1">
            {visibleStories.map((story, index) => (
              <div key={story._id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                  style={{
                    width:
                      index < (activeIndex ?? 0)
                        ? '100%'
                        : index === activeIndex
                          ? `${Math.round(progress * 100)}%`
                          : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="fixed left-4 right-4 top-[max(2.25rem,calc(env(safe-area-inset-top)+2rem))] z-[90] flex items-center justify-between gap-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              {active.userAvatar ? (
                <img
                  src={active.userAvatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="h-8 w-8" />
              )}
              <span className="truncate text-sm font-semibold">
                {active.isMine ? 'Your thought' : active.username}
              </span>
            </div>
            <button
              onClick={closeStory}
              className="rounded-full bg-black/30 p-2 text-white backdrop-blur transition hover:bg-white/15"
              aria-label="Close story"
            >
              <X size={22} />
            </button>
          </div>

          {active.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={active.mediaUrl}
              autoPlay
              playsInline
              controls={false}
              onLoadedMetadata={handleVideoMetadata}
              onEnded={goNext}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <img
              src={active.mediaUrl}
              className="max-h-full max-w-full object-contain"
              alt="story"
            />
          )}

          {active.isMine && !viewersPanelOpen && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setViewersPanelOpen(true);
              }}
              className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[95] flex -translate-x-1/2 flex-col items-center gap-1 rounded-full bg-black/35 px-4 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-white/15"
            >
              <ChevronUp className="h-4 w-4" />
              Viewers
            </button>
          )}

          {/* DELETE */}
          {active.isMine && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                void deleteStory(active._id);
              }}
              className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-[100] rounded-full bg-black/35 p-3 text-white opacity-90 backdrop-blur transition hover:bg-white/15 hover:opacity-100"
              aria-label="Delete story"
            >
              <Trash2 size={22} />
            </button>
          )}

          {active.isMine && (
            <ViewersPanel
              open={viewersPanelOpen}
              state={activeViewers}
              onClose={() => setViewersPanelOpen(false)}
              onLoadMore={() => {
                if (!activeViewers.loading && activeViewers.hasMore) {
                  void loadViewers(active._id, activeViewers.page + 1);
                }
              }}
            />
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
      className="flex min-w-[80px] flex-col items-center"
    >
      <div
        className={`h-16 w-16 rounded-2xl p-[2px]
          ${
            story.seen
              ? 'bg-stone-700'
              : 'bg-gradient-to-tr from-green-600 via-green-400 to-cyan-400'
          }`}
      >
        <div className="h-full w-full overflow-hidden rounded-xl bg-black">
          {story.mediaType === 'video' ? (
            <video
              src={story.mediaUrl}
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={story.mediaUrl}
              className="h-full w-full object-cover"
              alt="story"
            />
          )}
        </div>
      </div>

      <span className="mt-1 max-w-[72px] truncate text-center text-xs text-stone-300">
        {story.isMine ? 'Your thought' : story.username}
      </span>
    </button>
  );
}

function ViewersPanel({
  open,
  state,
  onClose,
  onLoadMore,
}: {
  open: boolean;
  state: ViewersState;
  onClose: () => void;
  onLoadMore: () => void;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[110] max-h-[72vh] rounded-t-3xl bg-stone-950 text-white shadow-2xl transition-transform duration-300 ease-out ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => {
        if (event.deltaY < -24 && state.viewers.length === 0) onClose();
      }}
    >
      <div className="mx-auto h-full w-full max-w-xl">
        <div className="sticky top-0 z-10 rounded-t-3xl border-b border-stone-800 bg-stone-950 px-4 pb-3 pt-4">
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-stone-700" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">
                  Viewed by {state.total} {state.total === 1 ? 'person' : 'people'}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Newest viewers first
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-500 hover:bg-stone-800"
              aria-label="Close viewers"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(72vh-5rem)] overflow-y-auto px-4 py-2">
          {state.loading && state.viewers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading viewers...
            </div>
          ) : state.error ? (
            <p className="py-8 text-center text-sm text-red-500">{state.error}</p>
          ) : state.viewers.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              No viewers yet.
            </p>
          ) : (
            <div className="divide-y divide-stone-800">
              {state.viewers.map((viewer) => (
                <div key={viewer.viewerId} className="flex items-center gap-3 py-3">
                  {viewer.viewerProfilePicture ? (
                    <img
                      src={viewer.viewerProfilePicture}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-11 w-11 text-stone-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {viewer.viewerName}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                      @{viewer.viewerUsername}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                    {formatRelativeTime(viewer.viewedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {state.hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={state.loading}
              className="my-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-800 px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) return 'just now';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
