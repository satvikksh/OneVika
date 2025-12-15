"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Sparkles,
  LogIn,
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
  const [page, setPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  /* ============================
     FETCH POSTS (PAGINATED)
  ============================ */
 useEffect(() => {
  if (!session) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLoadingPosts(true);

  fetch(`/api/post?page=${page}`)
    .then((res) => res.json())
    .then((data) => {
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p._id));
        const unique = data.filter((p: any) => !ids.has(p._id));
        return [...prev, ...unique];
      });
    })
    .finally(() => setLoadingPosts(false));
}, [session, page]);

  /* ============================
     INFINITE SCROLL
  ============================ */
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage((p) => p + 1);
    });

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, []);

  /* ============================
     OPTIMISTIC LIKE
  ============================ */
  const toggleLike = async (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === id
          ? {
              ...p,
              likes: p.likes.includes(session!.user.id)
                ? p.likes.filter((id: string) => id !== session!.user.id)
                : [...p.likes, session!.user.id],
            }
          : p
      )
    );

    await fetch(`/api/post/${id}/like`, { method: "POST" });
  };

  /* ============================
     DELETE POST
  ============================ */
 const deletePost = async (id: string) => {
  const res = await fetch(`/api/post/${id}`, { method: "DELETE" });

  if (!res.ok) {
    alert("Failed to delete post");
    return;
  }

  setPosts((prev) => prev.filter((p) => p._id !== id));
};


  /* ============================
     LOADING SESSION
  ============================ */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading feed...
      </div>
    );
  }

  /* ============================
     BLOCK FEED IF NOT LOGGED IN
  ============================ */
  if (!session) {
    return (
      <div
        className={`${
          isDark ? "bg-black text-white" : "bg-gray-50"
        } min-h-screen flex flex-col items-center justify-center px-4`}
      >
        <Sparkles className="w-12 h-12 mb-4 text-purple-500" />
        <h2 className="text-2xl font-bold mb-2">Login Required</h2>
        <p className="text-gray-500 mb-6 text-center">
          You must be logged in to view the imagination feed.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white"
        >
          <LogIn size={18} /> Login
        </button>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark bg-black" : "bg-gray-50"} min-h-screen`}>
      {/* HEADER */}
      <div className="py-10 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
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
  setPosts((prev) => {
    const exists = prev.some((p) => p._id === post._id);
    if (exists) return prev;
    return [post, ...prev];
  })
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
              {/* USER */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  {post.userId?.name?.[0] ?? "U"}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{post.userId?.name}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* DELETE */}
                {post.userId?._id === session.user.id && (
                  <button
                    onClick={() => deletePost(post._id)}
                    className="text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* CONTENT */}
              <p className="mb-3">{post.content}</p>

              {post.image && (
                <Image
                  src={post.image}
                  alt="Post image"
                  width={700}
                  height={400}
                  className="rounded-xl mb-3"
                />
              )}

              {/* ACTIONS */}
              <div className="flex gap-6 text-gray-500">
                <button
                  onClick={() => toggleLike(post._id)}
                  className="flex items-center gap-1 hover:text-purple-500"
                >
                  <Heart size={18} /> {post.likes.length}
                </button>

                <div className="flex items-center gap-1">
                  <MessageCircle size={18} />
                  {post.comments.length}
                </div>
              </div>

              {/* COMMENTS */}
              <input
                placeholder="Write a comment..."
                className="mt-3 w-full p-2 border rounded-lg"
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    await fetch(`/api/post/${post._id}/comment`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: e.currentTarget.value }),
                    });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </motion.div>
          ))}

          {/* INFINITE SCROLL LOADER */}
          <div ref={loaderRef} className="h-10" />
          {loadingPosts && (
            <p className="text-center text-gray-400">Loading more…</p>
          )}
        </div>
      </div>
    </div>
  );
}
