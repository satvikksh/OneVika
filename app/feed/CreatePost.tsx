"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, PlusCircle, Video } from "lucide-react";
import { useSession } from "next-auth/react";

export default function CreatePost({
  onPostCreated,
}: {
  onPostCreated: (post: any) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ============================
     UPLOAD TO SERVER
  ============================ */
 async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    console.error(err);
    throw new Error("Upload failed");
  }

  const data = await res.json();
  return data.url;
}


  /* ============================
     CREATE POST
  ============================ */
 async function handleCreatePost() {
  if (!session) {
    router.push("/login");
    return;
  }

  if (!content.trim() && !file) return;

  setLoading(true);

  try {
    const mediaUrls: string[] = [];

    if (file) {
      const url = await uploadMedia(file);
      mediaUrls.push(url);
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        images: mediaUrls,
      }),
    });

    if (!res.ok) throw new Error("Post failed");

    const newPost = await res.json();
    onPostCreated(newPost);

    setContent("");
    setFile(null);
  } catch (err) {
    alert("Failed to create post");
  } finally {
    setLoading(false);
  }
}


  /* ============================
     FILE SELECT
  ============================ */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);

    // preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selected);
  }

  return (
    <div className="rounded-2xl p-4 sm:p-6 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-md mb-8">
      {/* TEXTAREA */}
      <textarea
        placeholder={
          session
            ? "Imagine something extraordinary..."
            : "Login to share your imagination..."
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!session}
        rows={3}
        className="w-full p-3 bg-transparent outline-none resize-none text-gray-900 dark:text-gray-200 disabled:opacity-50"
      />

      {/* PREVIEW */}
      {preview && (
        <div className="mt-3">
          {file?.type.startsWith("video") ? (
            <video
              src={preview}
              controls
              className="rounded-xl max-h-72 w-full"
            />
          ) : (
            <Image
              src={preview}
              alt="Preview"
              width={700}
              height={400}
              className="rounded-xl max-h-72 object-cover"
            />
          )}
        </div>
      )}

      {/* ACTION BAR */}
      <div className="flex items-center justify-between mt-4">
        {/* MEDIA UPLOAD */}
        <div className="flex items-center gap-4">
          <label className="cursor-pointer text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <ImageIcon size={22} />
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={handleFileChange}
              disabled={!session}
            />
          </label>

          <label className="cursor-pointer text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Video size={22} />
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={handleFileChange}
              disabled={!session}
            />
          </label>
        </div>

        {/* POST BUTTON */}
        <button
          onClick={handleCreatePost}
          disabled={loading || (!content.trim() && !file)}
          className="px-4 py-2 sm:px-6 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition disabled:opacity-50"
        >
          <PlusCircle size={20} />
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
