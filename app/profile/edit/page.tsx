"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, Upload, Trash2, ArrowLeft } from "lucide-react";

export default function EditProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    bio: "",
    avatar: "",
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      setForm({
        name: data.user.name,
        bio: data.user.bio,
        avatar: data.user.avatar,
      });
    }
    load();
  }, []);

  async function uploadAvatar() {
    const fd = new FormData();
    fd.append("file", uploadFile!);

    const res = await fetch("/api/user/upload-avatar", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setForm({ ...form, avatar: data.url });
  }

  async function save() {
    await fetch("/api/user/update", {
      method: "POST",
      body: JSON.stringify(form),
    });

    router.push("/profile");
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
            className="rounded-full"
            alt="avatar"
          />
        ) : (
          <div className="w-24 h-24 bg-purple-500 text-white rounded-full flex items-center justify-center text-3xl font-bold">
            {form.name[0]}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="cursor-pointer text-purple-600 flex gap-2 items-center">
            <Upload size={18} />
            <span>Upload New Avatar</span>
            <input
              type="file"
              className="hidden"
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
              onClick={() => setForm({ ...form, avatar: "" })}
              className="flex gap-1 items-center text-red-500"
            >
              <Trash2 size={18} /> Remove Avatar
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="mt-6">
        <p className="mb-1 font-semibold">Name</p>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full p-3 border dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl"
        />
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
}
