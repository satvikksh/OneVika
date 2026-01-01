"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import CreatePost from "./CreatePost";
import { useTheme } from "../theme-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function FeedPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  /* ============================
     SESSION GUARD (IMPORTANT)
  ============================ */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading feed...
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  /* ============================
     FETCH POSTS
  ============================ */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!session?.user?.id) return;

    setLoadingPosts(true);

    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .finally(() => setLoadingPosts(false));
  }, [session]);

  /* ============================
     OPTIMISTIC LIKE
  ============================ */
  const toggleLike = async (id: string) => {
    if (!session?.user?.id) return;

    setPosts((prev) =>
      prev.map((p) =>
        p._id === id
          ? {
              ...p,
              likes: p.likes.includes(session.user.id)
                ? p.likes.filter(
                    (uid: string) => uid !== session.user.id
                  )
                : [...p.likes, session.user.id],
            }
          : p
      )
    );

    await fetch(`/api/posts/${id}/like`, {
      method: "POST",
    });
  };

  /* ============================
     DELETE POST (OWNER ONLY)
  ============================ */
  const deletePost = async (id: string) => {
    if (!session?.user?.id) return;

    const res = await fetch(`/api/posts/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete post");
      return;
    }

    setPosts((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <div className={`${isDark ? "dark bg-black" : "bg-gray-50"} min-h-screen`}>
      {/* HEADER */}
      <div className="py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-2">
            <Sparkles className="w-4 h-4" />
            IMAGINATION FEED
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Share Your Imagination
          </h1>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* CREATE POST */}
        <CreatePost
          onPostCreated={(post) =>
            setPosts((prev) =>
              prev.some((p) => p._id === post._id)
                ? prev
                : [post, ...prev]
            )
          }
        />

        {/* FEED */}
        <div className="space-y-6 mt-6">
          {posts.map((post) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 bg-white dark:bg-gray-900 border shadow"
            >
              {/* USER INFO */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  {post.userId?.name?.[0] ?? "U"}
                </div>

                <div className="flex-1">
                  <h3 className="font-bold">
                    {post.userId?.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>

                {post.userId?._id === session?.user?.id && (
                  <button
                    onClick={() => deletePost(post._id)}
                    className="text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* CONTENT */}
              {post.content && (
                <p className="mb-3">{post.content}</p>
              )}

              {/* MEDIA */}
              {post.images?.map((url: string, i: number) =>
                url.endsWith(".mp4") ? (
                  <video
                    key={i}
                    src={url}
                    controls
                    className="rounded-xl mb-3 w-full"
                  />
                ) : (
                  <Image
                    key={i}
                    src={url}
                    alt="Post media"
                    width={700}
                    height={400}
                    className="rounded-xl mb-3"
                  />
                )
              )}

              {/* ACTIONS */}
              <div className="flex gap-6 text-gray-500">
                <button
                  onClick={() => toggleLike(post._id)}
                  className="flex items-center gap-1 hover:text-purple-500"
                >
                  <Heart size={18} />
                  {post.likes.length}
                </button>

                <div className="flex items-center gap-1">
                  <MessageCircle size={18} />
                  {post.comments.length}
                </div>
              </div>
            </motion.div>
          ))}

          {loadingPosts && (
            <p className="text-center text-gray-400">
              Loading posts…
            </p>
          )}

          <div ref={loaderRef} className="h-10" />
        </div>
      </div>
    </div>
  );
}
