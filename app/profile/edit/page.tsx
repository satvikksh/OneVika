"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, Upload, Trash2, ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";


export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    avatar: "",
    isPrivate: false,
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  /* ============================
     LOAD PROFILE SAFELY
  ============================ */
  useEffect(() => {
    if (!session?.user) return;

    async function load() {
      try {
        const res = await fetch("/api/user/profile");

        if (!res.ok) {
          // console.error("Failed to load profile");
          return;
        }

        const data = await res.json();

        if (!data?.user) {
          console.error("No user returned", data);
          return;
        }

        setForm({
          name: data.user.name || "",
          bio: data.user.bio || "",
          avatar: data.user.avatar || "",
          isPrivate: data.user?.isPrivate || false, 
        });
      } catch (err) {
        console.error("PROFILE LOAD ERROR", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session]);

  /* ============================
     SAVE PROFILE
  ============================ */
 async function save() {
  const res = await fetch("/api/user/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  if (!res.ok) {
    alert("Failed to update profile");
    return;
  }

  // 🔄 Refresh NextAuth session (VERY IMPORTANT)
// eslint-disable-next-line react-hooks/rules-of-hooks
const { update } = useSession();
await update();
  // Go back to profile page
  router.push("/profile");
}

  /* ============================
     UPLOAD AVATAR (BASE64)
  ============================ */
  async function uploadAvatar() {
    if (!uploadFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        avatar: reader.result as string,
      }));
      setUploadFile(null);
    };
    reader.readAsDataURL(uploadFile);
  }

  /* ============================
     LOADING / AUTH GUARD
  ============================ */
  if (status === "loading" || loading) {
    return <div className="text-center mt-20">Loading profile…</div>;
  }

  if (!session?.user) {
    return <div className="text-center mt-20">Please login first.</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-purple-600 flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>

      {/* Avatar */}
      <div className="flex items-center gap-6">
        {form.avatar ? (
          <Image
            src={form.avatar}
            width={90}
            height={90}
            className="rounded-full object-cover"
            alt="avatar"
          />
        ) : (
          <div className="w-24 h-24 bg-purple-500 text-white rounded-full flex items-center justify-center text-3xl font-bold">
            {(form.name?.[0] || "U").toUpperCase()}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="cursor-pointer text-purple-600 flex gap-2 items-center">
            <Upload size={18} />
            <span>Upload New Avatar</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </label>

          {uploadFile && (
            <button
              onClick={uploadAvatar}
              className="px-3 py-1 bg-blue-500 text-white rounded-xl"
            >
              Upload
            </button>
          )}

          {form.avatar && (
            <button
              onClick={() => setForm((p) => ({ ...p, avatar: "" }))}
              className="flex gap-1 items-center text-red-500"
            >
              <Trash2 size={18} /> Remove Avatar
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="mt-6">
        <input
          value={form.name}
          onChange={(e) => {
            if (e.target.value.length <= 20)
              setForm({ ...form, name: e.target.value });
          }}
        />
        <p className="text-xs text-gray-500">
          {form.name.length}/20 characters
        </p>
      </div>

      {/* Bio */}
      <div className="mt-4">
        <p className="mb-1 font-semibold">Bio</p>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="w-full p-3 border dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl h-32"
        />
      </div>

      <button
        onClick={save}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
      >
        <Save size={20} /> Save Changes
      </button>
    </div>
  );
  {/* Privacy Setting */}
<div className="mt-6">
  <label className="flex gap-3 items-center cursor-pointer">
    <input
      type="checkbox"
      checked={form.isPrivate}
      onChange={(e) =>
        setForm({ ...form, isPrivate: e.target.checked })
      }
      className="w-5 h-5 accent-purple-600"
    />
    <span className="font-medium text-gray-700 dark:text-gray-300">
      Private Profile
    </span>
  </label>

  <p className="text-sm text-gray-500 mt-1">
    When enabled, only you can see your posts and profile.
  </p>
</div>

  
}
