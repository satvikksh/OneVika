"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // ✅ Create Room (via backend API)
  const createRoom = async () => {
  try {
    setLoading(true);

    const roomName = Math.random().toString(36).substring(2, 8);

    const res = await fetch("/api/metered", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomName }),
    });

    const data = await res.json();

    console.log("Room API Response:", data);

    // 🔥 FIX: check res.ok instead of data.success
    if (!res.ok) {
      alert("Failed to create room");
      return;
    }

    router.push(`/room/${data.roomName}`);

  } catch (error) {
    console.log(error);
    alert("Something went wrong");
  } finally {
    setLoading(false);
  }
};

  // ✅ Join Room
  const joinRoom = () => {
    if (!joinRoomId) return alert("Enter Room ID");

    router.push(`/room/${joinRoomId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

      <div className="bg-stone-900 rounded-xl p-6 w-80 flex flex-col gap-4">

        <h2 className="text-lg font-semibold text-white">
          Start or Join Room
        </h2>

        {/* Create Room */}
        <button
          onClick={createRoom}
          disabled={loading}
          className="bg-cyan-400 hover:bg-cyan-500 py-2 rounded-lg text-sm"
        >
          {loading ? "Creating..." : "➕ Create Room"}
        </button>

        {/* Join Room */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            className="bg-stone-800 border border-stone-700 p-2 rounded text-sm"
          />

          <button
            onClick={joinRoom}
            className="bg-green-600 hover:bg-green-700 py-2 rounded-lg text-sm"
          >
            🔗 Join Room
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="text-xs text-stone-400 hover:text-white mt-2"
        >
          Cancel
        </button>

      </div>
    </div>
  );
}
