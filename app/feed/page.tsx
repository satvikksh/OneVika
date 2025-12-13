/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  ImageIcon,
  PlusCircle,
  Heart,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { useTheme } from "../theme-provider";

export default function FeedPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // Load user session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  // ⛔ Prevent posting without login
  function createPost() {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!content.trim() && !image) return;

    const newPost = {
      id: Date.now(),
      user: {
        name: user.name,
        avatar: user.avatar || "U",
      },
      content,
      image,
      likes: 0,
      comments: 0,
      time: "Just now",
    };

    setPosts([newPost, ...posts]);
    setContent("");
    setImage(null);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className={`${isDark ? "dark bg-black" : "bg-gray-50"} min-h-screen`}>
      {/* ---------------- HEADER ---------------- */}
      <div className="py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-gray-800/40 rounded-full border border-white/20 backdrop-blur mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">IMAGINATION FEED</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Share Your Vision
          </h1>
        </motion.div>
      </div>

      {/* ---------------- FEED LAYOUT ---------------- */}
      <div className="max-w-2xl mx-auto px-4 pb-24">
        {/* ---------------- CREATE POST BOX ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-md"
        >
          <textarea
            placeholder="Imagine something extraordinary..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 bg-transparent outline-none border-none resize-none text-gray-900 dark:text-gray-200"
          />

          {image && (
            <div className="mt-3">
              <Image
                src={image}
                alt="Preview"
                width={700}
                height={400}
                className="rounded-xl max-h-60 object-cover"
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            {/* Upload Button */}
            <label className="cursor-pointer text-purple-600 dark:text-purple-400 hover:opacity-70">
              <ImageIcon size={26} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            {/* Post Button */}
            <button
              onClick={createPost}
              className="px-4 py-2 sm:px-6 sm:py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition"
            >
              <PlusCircle size={20} /> Post
            </button>
          </div>
        </motion.div>

        {/* ---------------- FEED POSTS ---------------- */}
        <div className="mt-8 space-y-6">
          {posts.length === 0 ? (
            <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No posts yet — be the first to imagine!</p>
            </div>
          ) : (
            posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-lg"
              >
                {/* User Row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                    {post.user.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-200">
                      {post.user.name}
                    </h3>
                    <p className="text-sm text-gray-500">{post.time}</p>
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
                    <Heart size={20} /> {post.likes}
                  </button>

                  <button className="flex items-center gap-1 hover:text-blue-500 transition">
                    <MessageCircle size={20} /> {post.comments}
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
