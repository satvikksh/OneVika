"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, Upload, Trash2, ArrowLeft } from "lucide-react";

export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    avatar: "",
    isPrivate: false,
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  /* ============================
     LOAD PROFILE
  ============================ */
  useEffect(() => {
    if (!session?.user) return;

    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.user) return;

        setForm({
          name: data.user.name ?? "",
          bio: data.user.bio ?? "",
          avatar: data.user.avatar ?? "",
          isPrivate: Boolean(data.user.isPrivate),
        });
      } catch (err) {
        console.error("PROFILE LOAD ERROR", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  /* ============================
     SAVE PROFILE (NO DATA LOSS)
  ============================ */
  async function save() {
    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("bio", form.bio);
      formData.append("isPrivate", String(form.isPrivate));

      if (uploadFile) {
        formData.append("file", uploadFile);
      }

      if (removeAvatar) {
        formData.append("removeAvatar", "true");
      }

      const res = await fetch("/api/user/update", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Failed to update profile");
        return;
      }

      router.push("/profile");
    } finally {
      setSaving(false);
    }
  }

  /* ============================
     GUARDS
  ============================ */
  if (status === "loading" || loading) {
    return <div className="text-center mt-20">Loading profile…</div>;
  }

  if (!session?.user) {
    return <div className="text-center mt-20">Please login first.</div>;
  }

  /* ============================
     UI
  ============================ */
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
        {form.avatar && !removeAvatar ? (
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
              onChange={(e) => {
                setUploadFile(e.target.files?.[0] || null);
                setRemoveAvatar(false);
              }}
            />
          </label>

          {form.avatar && (
            <button
              onClick={() => {
                setRemoveAvatar(true);
                setUploadFile(null);
              }}
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
          className="w-full p-2 border rounded"
          value={form.name}
          onChange={(e) =>
            e.target.value.length <= 20 &&
            setForm({ ...form, name: e.target.value })
          }
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
          className="w-full p-3 border rounded-xl h-32"
        />
      </div>

      {/* Privacy */}
      <div className="mt-6">
        <label className="flex gap-3 items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) =>
              setForm({ ...form, isPrivate: e.target.checked })
            }
          />
          <span className="font-medium">Private Profile</span>
        </label>
      </div>

      <button
        disabled={saving}
        onClick={save}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl disabled:opacity-60"
      >
        <Save size={20} /> {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
