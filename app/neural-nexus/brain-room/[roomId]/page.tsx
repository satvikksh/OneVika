"use client";

import { use } from "react";
import NeuralGraph from "../../components/NeuralGraph";

interface BrainRoomProps {
  params: Promise<{ roomId: string }>;
}

export default function BrainRoom({ params }: BrainRoomProps) {
  const { roomId } = use(params); // ✅ REQUIRED in Next 15+

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6">
        🧠 Brain Room: {roomId}
      </h1>

      {/* Graph Container */}
      <div className="border border-white/10 rounded-xl p-4 bg-neutral-900">
        <NeuralGraph />
      </div>
    </div>
  );
}
