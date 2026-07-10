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

  const createRoom = async () => {
    try {
      setLoading(true);
      const roomName = `call-public-${crypto.randomUUID()}`;
      router.push(`/room/${roomName}`);
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
          Start or Join Talk
        </h2>

        <button
          onClick={createRoom}
          disabled={loading}
          className="bg-gradient-to-r from-blue-700 to-cyan-500 hover:from-blue-800 hover:to-cyan-600 py-2 rounded-lg text-sm"
        >
          {loading ? "Creating..." : "Create Talk"}
        </button>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Enter Talk ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            className="bg-stone-800 border border-stone-700 p-2 rounded text-sm"
          />

          <button
            onClick={joinRoom}
            className="bg-green-600 hover:bg-green-700 py-2 rounded-lg text-sm"
          >
            Join Talk
          </button>
        </div>

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
