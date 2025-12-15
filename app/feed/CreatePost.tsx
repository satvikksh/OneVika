"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, PlusCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function CreatePost({
  onPostCreated,
}: {
  onPostCreated: (post: any) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ============================
     CREATE POST
  ============================ */
  async function handleCreatePost() {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!content.trim() && !image) return;

    setLoading(true);

    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, image }),
      });

      if (!res.ok) throw new Error("Failed");

      const newPost = await res.json();

      // 🔹 Instant UI update (no reload)
      onPostCreated(newPost);

      // 🔹 Reset form
      setContent("");
      setImage(null);
    } catch {
      alert("Failed to create post");
    } finally {
      setLoading(false);
    }
  }

  /* ============================
     IMAGE UPLOAD
  ============================ */
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
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
        className="w-full p-3 bg-transparent outline-none resize-none text-gray-900 dark:text-gray-200 disabled:opacity-50"
      />

      {/* IMAGE PREVIEW */}
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

      {/* ACTION BAR */}
      <div className="flex items-center justify-between mt-4">
        {/* IMAGE UPLOAD */}
        <label className="cursor-pointer text-purple-600 dark:text-purple-400">
          <ImageIcon size={26} />
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageUpload}
            disabled={!session}
          />
        </label>

        {/* POST BUTTON */}
        <button
          onClick={handleCreatePost}
          disabled={loading || (!content.trim() && !image)}
          className="px-4 py-2 sm:px-6 sm:py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition disabled:opacity-50"
        >
          <PlusCircle size={20} />
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
