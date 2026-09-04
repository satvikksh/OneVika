"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PremiumAvatar, PremiumName } from "../premium-ui";
import { usePremiumTheme } from "@/app/premium-theme-provider";
import {
  readSavedPosts,
  persistSavedPosts,
  toggleSavedEntry,
  savedIds,
} from "../../lib/savedPosts";

const RECENT_POST_WINDOW_DAYS = 3;
const RECENT_POST_LIMIT = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface User {
  _id: string;
  name: string;
  email?: string;
  image?: string;
  avatar?: string;
  isPremium?: boolean;
}

interface Comment {
  _id: string;
  content?: string;
  text?: string;
  createdAt: string;
  userId?: User;
  user?: User;
}

interface Post {
  _id: string;
  content: string;
  contentType?: "post";
  images: string[];
  userId: User | null;
  likes: string[];
  comments: Comment[];
  createdAt: string;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:$|[?#])/i.test(url);
}

function commentAuthor(comment: Comment) {
  return comment.userId || comment.user;
}

export default function NewPosts() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isPremium } = usePremiumTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentingId, setCommentingId] = useState("");
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);

  useEffect(() => {
    setSavedPostIds(savedIds(readSavedPosts()));
  }, []);

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/posts?type=post&recentDays=${RECENT_POST_WINDOW_DAYS}`
        );
        if (!response.ok) throw new Error("Failed to fetch posts");

        const data = await response.json();
        const cutoff = Date.now() - RECENT_POST_WINDOW_DAYS * MS_PER_DAY;
        const recentPosts = (Array.isArray(data?.posts) ? data.posts : data || []).filter(
          (post: Post) => {
            const postTime = new Date(post.createdAt).getTime();
            return (
              (!post.contentType || post.contentType === "post") &&
              Number.isFinite(postTime) &&
              postTime >= cutoff
            );
          }
        );

        setPosts(recentPosts.slice(0, RECENT_POST_LIMIT));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading posts");
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
    const interval = window.setInterval(fetchRecentPosts, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const savedSet = useMemo(() => new Set(savedPostIds), [savedPostIds]);
  const openPost = (postId: string) =>
    router.push(`/feed?postId=${encodeURIComponent(postId)}`);

  async function toggleLike(post: Post) {
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/feed?postId=${post._id}`)}`);
      return;
    }

    const userId = session.user.id;
    const wasLiked = post.likes.some((id) => String(id) === userId);
    setPosts((current) =>
      current.map((item) =>
        item._id === post._id
          ? {
              ...item,
              likes: wasLiked
                ? item.likes.filter((id) => String(id) !== userId)
                : [...item.likes, userId],
            }
          : item
      )
    );

    const response = await fetch(`/api/posts/${post._id}/like`, { method: "POST" });
    if (!response.ok) {
      setPosts((current) =>
        current.map((item) => (item._id === post._id ? post : item))
      );
    }
  }

  async function submitComment(event: FormEvent, post: Post) {
    event.preventDefault();
    const content = (commentDrafts[post._id] || "").trim();
    if (!content) return;
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/feed?postId=${post._id}`)}`);
      return;
    }

    setCommentingId(post._id);
    const response = await fetch(`/api/posts/${post._id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const comment = await response.json().catch(() => null);
    setCommentingId("");

    if (response.ok && comment) {
      setPosts((current) =>
        current.map((item) =>
          item._id === post._id
            ? { ...item, comments: [comment, ...(item.comments || [])] }
            : item
        )
      );
      setCommentDrafts((current) => ({ ...current, [post._id]: "" }));
    }
  }

  async function sharePost(postId: string) {
    const url = `${window.location.origin}/feed?postId=${postId}`;
    if (navigator.share) {
      await navigator.share({ title: "OrbitByte post", url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  function toggleSaved(postId: string) {
    const next = toggleSavedEntry(readSavedPosts(), postId);
    persistSavedPosts(next);
    setSavedPostIds(savedIds(next));
  }

  if (loading || error || posts.length === 0) {
    return (
      <section className="w-full pb-8">
        <h2 className="mb-4 px-1 text-sm font-medium tracking-wide text-stone-600 dark:text-stone-400">
          New Posts
        </h2>
        <div className="flex items-center justify-center py-10 text-center text-xs text-stone-500">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            error || "No posts from the last few days yet. Check back soon!"
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full pb-8">
      <h2 className="mb-4 px-1 text-sm font-medium tracking-wide text-stone-600 dark:text-stone-400">
        New Posts
      </h2>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {posts.map((post) => {
          const authorName = post.userId?.name || "Unknown User";
          const isLiked = post.likes?.some(
            (id) => String(id) === session?.user?.id
          );
          const recentComments = (post.comments || []).slice(0, 2);

          return (
            <article
              key={post._id}
              role="link"
              tabIndex={0}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button,a,input,video")) return;
                openPost(post._id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") openPost(post._id);
              }}
              className={`h-fit cursor-pointer overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${isPremium ? "premium-card" : ""}`}
            >
              <div className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <PremiumAvatar
                    src={post.userId?.avatar || post.userId?.image}
                    alt={authorName}
                    fallback={authorName}
                    size={40}
                    isPremium={Boolean(post.userId?.isPremium)}
                  />
                  <div className="min-w-0 flex-1">
                    {post.userId?._id ? (
                      <Link href={`/profile/${post.userId._id}`} className="block w-fit">
                        <PremiumName
                          name={authorName}
                          isPremium={Boolean(post.userId.isPremium)}
                          textClassName="truncate text-sm font-semibold text-stone-100"
                        />
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-semibold">{authorName}</p>
                    )}
                    <p className="text-xs text-stone-500">
                      {new Date(post.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {post.content && (
                  <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-200">
                    {post.content}
                  </p>
                )}
              </div>

              {post.images?.length > 0 && (
                <div className="grid grid-cols-1 gap-px bg-stone-800">
                  {post.images.map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="relative flex max-h-[36rem] min-h-52 w-full items-center justify-center overflow-hidden bg-black"
                    >
                      {isVideoUrl(src) ? (
                        <video
                          src={src}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-[36rem] w-full object-contain"
                        />
                      ) : (
                        <Image
                          src={src}
                          alt={`Post media ${index + 1}`}
                          width={1200}
                          height={1200}
                          sizes="(min-width: 1280px) 38vw, (min-width: 768px) 52vw, 100vw"
                          className="h-auto max-h-[36rem] w-full object-contain"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-1 border-b border-stone-800 pb-3">
                  <button
                    onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 rounded-full p-2 text-xs transition hover:bg-red-50 dark:hover:bg-red-950/30 ${
                      isLiked ? "text-red-500" : "text-stone-500"
                    }`}
                    aria-label={isLiked ? "Unlike post" : "Like post"}
                  >
                    <Heart className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
                    <span>{post.likes?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => openPost(post._id)}
                    className="flex items-center gap-1.5 rounded-full p-2 text-xs text-stone-500 transition hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/30"
                    aria-label="Open comments"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => sharePost(post._id)}
                    className="ml-auto rounded-full p-2 text-stone-500 transition hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30"
                    aria-label="Share post"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toggleSaved(post._id)}
                    className={`rounded-full p-2 transition hover:bg-blue-50 dark:hover:bg-blue-950/30 ${
                      savedSet.has(post._id) ? "text-blue-600" : "text-stone-500"
                    }`}
                    aria-label={savedSet.has(post._id) ? "Unsave post" : "Save post"}
                  >
                    <Bookmark
                      className="h-5 w-5"
                      fill={savedSet.has(post._id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>

                {recentComments.length > 0 && (
                  <div className="space-y-2 pt-3 text-sm">
                    {recentComments.map((comment) => {
                      const author = commentAuthor(comment);
                      return (
                        <p key={comment._id} className="text-stone-300">
                          <span className="mr-2 font-semibold">
                            {author?.name || "User"}
                          </span>
                          {comment.content || comment.text}
                        </p>
                      );
                    })}
                    {(post.comments?.length || 0) > recentComments.length && (
                      <button
                        onClick={() => openPost(post._id)}
                        className="text-xs font-medium text-stone-500 hover:text-blue-500"
                      >
                        View all {post.comments.length} comments
                      </button>
                    )}
                  </div>
                )}

                <form
                  onSubmit={(event) => submitComment(event, post)}
                  className="mt-3 flex items-center gap-2"
                >
                  <input
                    value={commentDrafts[post._id] || ""}
                    onChange={(event) =>
                      setCommentDrafts((current) => ({
                        ...current,
                        [post._id]: event.target.value,
                      }))
                    }
                    placeholder="Add a comment..."
                    aria-label="Add a comment"
                    className="min-w-0 flex-1 rounded-full bg-stone-900 px-4 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500/30"
                  />
                  <button
                    type="submit"
                    disabled={
                      commentingId === post._id ||
                      !(commentDrafts[post._id] || "").trim()
                    }
                    className="rounded-full p-2 text-blue-600 disabled:opacity-40"
                    aria-label="Post comment"
                  >
                    {commentingId === post._id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
