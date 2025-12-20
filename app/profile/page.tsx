"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Heart,
  User,
  Mail,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";

type Post = {
  _id: string;
  content: string;
  image?: string;
};

type UserData = {
  name: string;
  email: string;
  avatar?: string;
  cover?: string;
  bio?: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // edit / delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // ================= LOAD PROFILE =================
  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadProfile() {
      const res = await fetch("/api/user/profile");
      const data = await res.json();

      setUserData(data.user ?? data);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setLikedPosts(Array.isArray(data.likedPosts) ? data.likedPosts : []);
      setLoading(false);
    }

    loadProfile();
  }, [status]);

  // ================= DELETE POST =================
  async function deletePost(postId: string) {
    if (!confirm("Delete this post permanently?")) return;

    setDeletingId(postId);

    const res = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } else {
      alert("Failed to delete post");
    }

   setPosts((prev) => prev.filter((p) => p._id !== postId));
  }

  // ================= EDIT POST =================
  async function saveEdit(postId: string) {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    });

    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, content: editText } : p
        )
      );
      setEditingId(null);
      setEditText("");
    } else {
      alert("Failed to update post");
    }
  }

  if (status === "loading" || loading) {
    return <div className="text-center mt-20">Loading profile…</div>;
  }

  if (!session?.user) {
    return (
      <div className="text-center mt-20 text-gray-600">
        Please login first.
      </div>
    );
  }

  const avatar = userData?.avatar
    ? userData.avatar
    : `/api/initial-avatar?name=${userData?.name}`;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* ================= HEADER ================= */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-gray-800/40 rounded-full border mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">YOUR PROFILE</span>
        </div>
        <h1 className="text-4xl font-bold">
          Welcome, {userData?.name}
        </h1>
      </div>

      {/* ================= PROFILE CARD ================= */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border shadow-md">
        <div className="flex items-center gap-6">
          <Image
            src={avatar}
            width={96}
            height={96}
            className="rounded-full object-cover"
            alt="avatar"
          />

          <div>
            <p className="flex items-center gap-2">
              <User size={18} /> {userData?.name}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={18} /> {userData?.email}
            </p>
          </div>
        </div>

        <p className="mt-4 italic">
          {userData?.bio || "No bio added yet."}
        </p>

        <Link
          href="/profile/edit"
          className="mt-6 inline-flex gap-2 items-center px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
        >
          <Edit size={18} /> Edit Profile
        </Link>
      </div>

      {/* ================= USER POSTS ================= */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Your Posts</h2>

        {posts.length === 0 ? (
          <p className="text-gray-500">You haven't posted anything yet.</p>
        ) : (
          posts.map((post) => (
            <div
              key={post._id}
              className="relative p-4 bg-white dark:bg-gray-900 border rounded-xl mb-4"
            >
              {/* ACTION BUTTONS */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(post._id);
                    setEditText(post.content);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => deletePost(post._id)}
                  disabled={deletingId === post._id}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* EDIT MODE */}
              {editingId === post._id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveEdit(post._id)}
                      className="px-4 py-1 bg-green-600 text-white rounded-lg flex gap-1"
                    >
                      <Save size={16} /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-1 bg-gray-400 text-white rounded-lg flex gap-1"
                    >
                      <X size={16} /> Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* ================= LIKED POSTS ================= */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Heart className="text-red-500" /> Your Favorites
        </h2>

        {likedPosts.length === 0 ? (
          <p className="text-gray-500">No liked posts yet.</p>
        ) : (
          likedPosts.map((post) => (
            <div
              key={post._id}
              className="p-4 bg-white dark:bg-gray-900 border rounded-xl mb-4"
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
