"use client";

import { useRouter } from "next/navigation";

export default function BrainRoomCard() {
  const router = useRouter();

  const joinRoom = () => {
    const roomId = "future-of-tourist-safety";
    router.push(`/neural-nexus/brain-room/${roomId}`);
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/50 to-purple-900/40 border border-white/10">
      <h3 className="text-xl font-semibold mb-2">
        Future of Tourist Safety
      </h3>

      <p className="text-gray-400 mb-4">
        Live collective thinking with AI summarization.
      </p>

      <div className="flex justify-between items-center">
        <span className="text-green-400">🟢 Active</span>
        <button
          onClick={joinRoom}
          className="px-4 py-2 bg-purple-600 rounded-xl"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
