"use client";

import { useEffect, useState } from "react";

export default function LikesModal({
  postId,
  onClose
}: {
  postId: string;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/posts/${postId}/likes`)
      .then(res => res.json())
      .then(setUsers);
  }, [postId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl w-80">
        <h3 className="font-bold mb-3">Liked by</h3>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {users.map(u => (
            <div key={u._id} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
                {u.name[0]}
              </div>
              <span>{u.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded bg-gray-200 dark:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
