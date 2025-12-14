"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, MessageCircle, Sparkles, LogIn } from "lucide-react";
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
  

   /* ============================
     FETCH POSTS ONLY IF LOGGED IN
  ============================ */
  useEffect(() => {
    if (!session) return;

    setLoadingPosts(true);

    fetch("/api/post")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load posts");
        return res.json();
      })
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [session]);

  
  /* ============================
     LOADING SESSION
  ============================ */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading feed...
      </div>
    );
  }
   /* ============================
     NOT LOGGED IN → BLOCK FEED
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
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
          You must be logged in to view the imagination feed.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold hover:scale-105 transition"
        >
          <LogIn size={18} />
          Login
        </button>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark bg-black" : "bg-gray-50"} min-h-screen`}>
      {/* Header */}
      <div className="py-10 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-gray-800/40 rounded-full border backdrop-blur mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">IMAGINATION FEED</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Share Your Imagination
          </h1>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* Create Post */}
        <CreatePost
          onPostCreated={(post) => setPosts((prev) => [post, ...prev])}
        />

        {/* Feed */}
        <div className="space-y-6 mt-6">
          {posts.length === 0 ? (
            <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No posts yet — be the first to imagine!</p>
            </div>
          ) : (
            posts.map((post) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-lg"
              >
                {/* User */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {post.userId?.avatar ? (
                      <Image
                        src={post.userId.avatar}
                        alt={post.userId.name}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                        (post.userId?.name?.[0] ?? "U").toUpperCase()
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-200">
                        {post.userId?.name ?? "User"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="mb-4 text-gray-800 dark:text-gray-200">
                  {post.content}
                </p>

                {/* Image */}
                {post.image && (
                  <Image
                    src={post.image}
                    alt="Post image"
                    width={700}
                    height={400}
                    className="rounded-xl mb-4 object-cover"
                  />
                )}

                

                {/* Actions */}
                <div className="flex gap-6 text-gray-500 dark:text-gray-400">
                  <button className="flex items-center gap-1 hover:text-purple-500 transition">
                    <Heart size={20} /> {post.likes?.length || 0}
                  </button>

                  <button className="flex items-center gap-1 hover:text-blue-500 transition">
                    <MessageCircle size={20} /> {post.comments?.length || 0}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
