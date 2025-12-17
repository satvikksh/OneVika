"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, Heart, User, Mail, Edit } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();

  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);

  useEffect(() => {

    
    if (!session?.user) return;

    async function load() {
      const res = await fetch("/api/user/profile");
      const data = await res.json();

      setUserData(data.user ?? data);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setLikedPosts(Array.isArray(data.likedPosts) ? data.likedPosts : []);
    }

    load();
  }, [session]);

  if (!session?.user) {
    return (
      <div className="text-center mt-20 text-gray-700">Please login first.</div>
    );
  }

  const avatar = userData?.avatar
    ? userData.avatar
    : `/api/initial-avatar?name=${userData?.name}`;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-gray-800/40 rounded-full border border-white/20 mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">YOUR PROFILE</span>
        </div>

        <h1 className="text-4xl font-bold">Welcome, {userData?.name}</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border dark:border-gray-700 shadow-md">
        <div className="flex items-center gap-6">
          {userData?.avatar ? (
            <Image
              src={userData.avatar}
              width={90}
              height={90}
              className="rounded-full object-cover"
              alt="avatar"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
              {userData?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          {userData?.cover && (
            <Image
              src={userData.cover}
              width={900}
              height={300}
              className="rounded-xl mb-6 object-cover"
              alt="cover"
            />
          )}

          <div>
            <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User size={18} /> {userData?.name}
            </p>
            <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Mail size={18} /> {userData?.email}
            </p>
          </div>
        </div>

        {/* Bio */}
        <p className="mt-4 text-gray-700 dark:text-gray-300 italic">
          {userData?.bio || "No bio added yet."}
        </p>

        <Link
          href="/profile/edit"
          className="mt-6 inline-flex gap-2 items-center px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
        >
          <Edit size={18} /> Edit Profile
        </Link>
      </div>

      {/* User Posts */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Your Posts</h2>
        {posts?.length === 0 ? (
          <p className="text-gray-500">You haven't posted anything yet.</p>
        ) : (
          posts?.map((post) => (
            <div
              key={post._id}
              className="p-4 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl mb-4"
            >
              <p>{post.content}</p>
              {post.image && (
                <Image
                  src={post.image}
                  width={600}
                  height={350}
                  className="rounded-xl mt-3"
                  alt=""
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Liked Posts */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Heart className="text-red-500" /> Your Favorites
        </h2>

        {likedPosts?.length === 0 ? (
          <p className="text-gray-500">No liked posts yet.</p>
        ) : (
          likedPosts?.map((post) => (
            <div
              key={post._id}
              className="p-4 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl mb-4"
            >
              <p>{post.content}</p>
              {post.image && (
                <Image
                  src={post.image}
                  width={600}
                  height={350}
                  className="rounded-xl mt-3"
                  alt=""
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
