"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BookMarked,
  Bookmark,
  CalendarDays,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Share2,
  Video,
} from "lucide-react";
import { PremiumAvatar } from "../components/premium-ui";
import {
  SAVED_POSTS_KEY,
  SavedPostEntry,
  readSavedPosts,
  persistSavedPosts,
  toggleSavedEntry,
} from "../lib/savedPosts";

type GalleryTab = "all" | "posts" | "videos";

type SavedFeedPost = {
  _id: string;
  content?: string;
  contentType?: string;
  images?: string[];
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
    image?: string;
    avatar?: string;
    isPremium?: boolean;
  } | null;
  likes?: string[];
  comments?: unknown[];
  createdAt?: string;
};

function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return (
    url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")
  );
}

function hasVideo(post: SavedFeedPost): boolean {
  return (post.images || []).some((url) => isVideoUrl(url));
}

function formatSavedDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max = 150): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function isAllowedAvatarHost(src: string | undefined | null): boolean {
  if (!src) return false;
  try {
    const host = new URL(src).hostname;
    return (
      host === "res.cloudinary.com" || host.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

export default function GalleryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [savedEntries, setSavedEntries] = useState<SavedPostEntry[]>([]);
  const [posts, setPosts] = useState<SavedFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GalleryTab>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const refreshSaved = useCallback(() => {
    setSavedEntries(readSavedPosts());
  }, []);

  useEffect(() => {
    let active = true;
    refreshSaved();

    (async () => {
      try {
        const response = await fetch("/api/posts");
        if (!response.ok) throw new Error("Failed to fetch posts");
        const data = await response.json();
        if (active) {
          setPosts(Array.isArray(data) ? data : []);
          setLoadError(null);
        }
      } catch {
        if (active) setLoadError("Couldn’t load your saved content.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVED_POSTS_KEY) refreshSaved();
    };
    const onFocus = () => refreshSaved();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshSaved();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(refreshSaved, 20000);

    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [refreshSaved]);

  const savedAtMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of savedEntries) map[entry.id] = entry.savedAt;
    return map;
  }, [savedEntries]);

  const savedPosts = useMemo(() => {
    const matched = posts.filter((post) => savedAtMap[post._id]);
    return [...matched].sort((a, b) => {
      const timeA = savedAtMap[a._id] || a.createdAt || "";
      const timeB = savedAtMap[b._id] || b.createdAt || "";
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [posts, savedAtMap]);

  const videoCount = useMemo(
    () => savedPosts.filter((post) => hasVideo(post)).length,
    [savedPosts]
  );
  const postCount = savedPosts.length - videoCount;

  const visiblePosts = useMemo(() => {
    if (activeTab === "videos") return savedPosts.filter((post) => hasVideo(post));
    if (activeTab === "posts") return savedPosts.filter((post) => !hasVideo(post));
    return savedPosts;
  }, [activeTab, savedPosts]);

  const tabs: { id: GalleryTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: savedPosts.length },
    { id: "posts", label: "Posts", count: postCount },
    { id: "videos", label: "Videos", count: videoCount },
  ];

  const openPost = (postId: string) =>
    router.push(`/feed?postId=${encodeURIComponent(postId)}`);

  const unsave = (postId: string) => {
    setSavedEntries((current) => {
      const next = toggleSavedEntry(current, postId);
      persistSavedPosts(next);
      return next;
    });
  };

  const share = async (postId: string, content: string) => {
    const url = `${window.location.origin}/feed?postId=${encodeURIComponent(postId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "OrbitByte post", text: content, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled share */
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 px-6 py-20 text-center dark:border-gray-800">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-white/5 dark:text-stone-500">
        <BookMarked className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-stone-900 dark:text-stone-100">
        Nothing saved yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
        Tap the bookmark on any post or video to keep it here — your own private
        collection.
      </p>
      <button
        onClick={() => router.push("/feed")}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
      >
        Explore the Feed <ArrowRight size={16} />
      </button>
    </div>
  );

  return (
    <main className="flex min-h-screen justify-center bg-stone-50 text-stone-950 transition-colors dark:bg-black dark:text-stone-100">
      <div className="flex w-full max-w-7xl flex-col gap-6 px-5 py-8 pb-24 lg:pb-12">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-pink-600 text-white shadow-lg shadow-blue-500/20">
              <BookMarked size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-stone-950 dark:text-stone-100">
                Gallery
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Your saved posts and videos
              </p>
            </div>
          </div>

          {savedPosts.length > 0 && (
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 dark:border-gray-800 dark:bg-white/5 dark:text-stone-300">
              {savedPosts.length} saved
            </span>
          )}
        </header>

        {/* Tabs */}
        <div className="sticky top-0 z-30 -mx-5 flex gap-2 px-5 py-3 backdrop-blur-lg sm:mx-0 sm:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-gray-800 dark:bg-white/5 dark:text-stone-300 dark:hover:border-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  activeTab === tab.id
                    ? "bg-white/20 dark:bg-stone-900/20"
                    : "bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-stone-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && savedPosts.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-stone-400">
            <Loader2 className="h-7 w-7 animate-spin text-stone-300 dark:text-stone-500" />
            <span className="ml-2 text-sm">Loading your gallery…</span>
          </div>
        ) : savedPosts.length === 0 ? (
          renderEmptyState()
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            {loadError} Saved items still show for posts already loaded.
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-white/5 dark:text-stone-500">
              {activeTab === "videos" ? <Video size={26} /> : <FileText size={26} />}
            </div>
            <p className="mt-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
              No saved {activeTab === "videos" ? "videos" : "posts"} yet
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Save {activeTab === "videos" ? "videos" : "posts"} from the Feed with
              the bookmark icon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visiblePosts.map((post) => {
              const creator = post.userId || {};
              const name = creator.name || "OrbitByte User";
              const avatarSrc =
                creator.image ||
                creator.avatar ||
                (isAllowedAvatarHost(creator.image) ? creator.image : null);
              const firstMedia = (post.images || [])[0];
              const isVideo = isVideoUrl(firstMedia);
              const savedDate = savedAtMap[post._id]
                ? formatSavedDate(savedAtMap[post._id])
                : "";
              const liked = (post.likes || []).some(
                (like) => String(like) === session?.user?.id
              );
              const commentCount = (post.comments && post.comments.length) || 0;

              return (
                <div
                  key={post._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPost(post._id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPost(post._id);
                    }
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-colors hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0d0d0f] dark:hover:border-gray-600"
                >
                  {/* Media */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-black/40">
                    {firstMedia ? (
                      isVideo ? (
                        <video
                          src={firstMedia}
                          muted
                          playsInline
                          preload="metadata"
                          tabIndex={-1}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={firstMedia}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6">
                        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
                          {truncate(post.content || "No media", 120)}
                        </p>
                      </div>
                    )}

                    {/* Content type badge */}
                    <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      {isVideo ? <Video size={12} /> : <FileText size={12} />}
                      {isVideo ? "Video" : "Post"}
                    </span>

                    {/* Extra media count */}
                    {!isVideo && (post.images || []).length > 1 && (
                      <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                        +{(post.images || []).length - 1}
                      </span>
                    )}

                    {/* Video play overlay */}
                    {isVideo && (
                      <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/5">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-stone-900 shadow-lg transition-transform group-hover:scale-110">
                          <Play size={20} className="ml-0.5 fill-current" />
                        </span>
                      </div>
                    )}

                    {/* Unsave */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        unsave(post._id);
                      }}
                      aria-label="Remove from Gallery"
                      title="Remove from Gallery"
                      className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-blue-400 backdrop-blur transition-transform hover:scale-110"
                    >
                      <Bookmark size={15} className="fill-current" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {/* Creator */}
                    <div className="flex items-center gap-2.5">
                      <PremiumAvatar
                        src={isAllowedAvatarHost(avatarSrc) ? avatarSrc : null}
                        alt={name}
                        fallback={name}
                        size={36}
                        isPremium={!!creator.isPremium}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {name}
                        </p>
                        {savedDate ? (
                          <p className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                            <CalendarDays size={11} />
                            Saved {savedDate}
                          </p>
                        ) : (
                          <p className="text-[11px] text-stone-400 dark:text-stone-500">
                            @{creator._id?.slice(-6) || "orbitbyte"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Post content */}
                    {post.content ? (
                      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                        {truncate(post.content, 150)}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-400 dark:text-stone-500">
                        Share this post and see replies in the Feed.
                      </p>
                    )}

                    {/* Stats */}
                    <div className="mt-auto flex items-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-gray-800 dark:text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <Heart
                          size={14}
                          className={
                            liked ? "fill-rose-500 text-rose-500" : ""
                          }
                        />
                        {(post.likes && post.likes.length) || 0}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageCircle size={14} />
                        {commentCount}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          share(post._id, post.content || "");
                        }}
                        aria-label="Share post"
                        className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-200"
                      >
                        <Share2 size={14} />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}