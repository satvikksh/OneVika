"use client";

import React, { useState, useEffect } from "react";
import MoodStory from "./components/home/MoodStory";
import DailyDropCard from "./components/home/DailyDropCard";
import SpacesGrid from "./components/home/SpacesGrid";
import { DailyDrop, Space } from "./types/home";
import RoomModal from "./components/room/RoomModal";

// --- MOCK DATA ---
const TODAY_DROP: DailyDrop = {
  id: "drop-101",
  date: new Date().toISOString(),
  prompt: "What is a small win you had this week that went unnoticed?",
  totalAnswers: 142,
};

const SPACES: Space[] = [
  {
    id: "s1",
    name: "Lo-Fi Study",
    emoji: "🎧",
    description: "Quiet focus room. No talking.",
    memberCount: 87,
    category: "wellness",
    activity: "high",
  },
  {
    id: "s2",
    name: "Midnight Thoughts",
    emoji: "🌌",
    description: "Deep conversations only.",
    memberCount: 42,
    category: "wellness",
    activity: "high",
  },
  {
    id: "s3",
    name: "Pet Parade",
    emoji: "🐾",
    description: "Wholesome content only.",
    memberCount: 156,
    category: "wellness",
    activity: "high",
  },
  {
    id: "s4",
    name: "Retro Tech",
    emoji: "💾",
    description: "Nostalgia for the 90s/00s.",
    memberCount: 63,
    category: "wellness",
    activity: "high",
  },
];

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState("Good afternoon");
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showRoomModal, setShowRoomModal] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [joinRoomId, setJoinRoomId] = useState("");

  const updateGreeting = (hours: number) => {
    if (hours < 12) setGreeting("Good morning");
    else if (hours < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  };

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(now);
    updateGreeting(now.getHours());

    const interval = setInterval(() => {
      const updated = new Date();
      setCurrentTime(updated);
      updateGreeting(updated.getHours());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!currentTime) return null;

  return (
    <main className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-md px-5 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex items-start justify-between">
          {/* Left Side - Greeting + Time */}
          <div>
            <h1 className="text-2xl font-bold text-stone-100">{greeting}.</h1>

            <p className="text-xs text-stone-500">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              •{" "}
              {currentTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>

          {/* Right Side - Room Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoomModal(true)}
              className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 rounded-full text-white transition"
            >
              🎥 Room
            </button>
          </div>
        </header>

        {/* ✅ STORIES (ONLY ONCE) */}
        <MoodStory />

        {/* DAILY DROP */}
        <DailyDropCard drop={TODAY_DROP} />

        {/* SPACES */}
        <SpacesGrid spaces={SPACES} />

        {/* Footer */}
        <footer className="text-center pt-6">
          <p className="text-xs text-stone-600">Designed for calm.</p>
        </footer>

        <RoomModal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
        />
      </div>
    </main>
  );
}
