"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";

export default function CommentSection({
  post,
  onUpdate,
}: {
  post: any;
  onUpdate: (comments: any[]) => void;
}) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ SAFETY: normalize comments
  const comments = Array.isArray(post.comments) ? post.comments : [];

  const submitComment = async () => {
    if (!text.trim()) return;

    setLoading(true);

    const res = await fetch(`/api/posts/${post._id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const updatedComments = await res.json();
    onUpdate(updatedComments);
    setText("");
    setLoading(false);
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      {/* COMMENTS */}
      {comments.map((c: any) => (
        <div key={c._id} className="flex gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
            {c.user?.name?.[0] ?? "U"}
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl">
            <p className="font-semibold">{c.user?.name}</p>
            <p>{c.text}</p>
          </div>
        </div>
      ))}

      {/* INPUT */}
      {session && (
        <div className="flex gap-2 mt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 outline-none"
          />
          <button
            onClick={submitComment}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white"
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
