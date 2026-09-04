"use client";

import { useState, useEffect } from "react";
import MoodStory from "./components/home/MoodStory";
import NewPosts from "./components/home/NewPosts";
import Thoughts from "./components/home/Thoughts";
import FeedToggle from "./components/home/FeedToggle";
import RoomModal from "./components/room/RoomModal";
import { useUserAvatar } from "@/app/hooks/useUserAvatar";
import { PremiumAmbient } from "@/app/components/premium-ambient";

/* ============================
   SHARED UI HELPERS
============================ */
function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export default function Home() {
  const { isPremium } = useUserAvatar();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState("Good afternoon");
  const [activeTab, setActiveTab] = useState<"thoughts" | "posts">("thoughts");
  const [showRoomModal, setShowRoomModal] = useState(false);

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
    <main className="relative overflow-hidden min-h-screen dark:bg-black bg-black transition-colors text-stone-100 flex justify-center">
      <PremiumAmbient />

      <div className="w-full max-w-7xl px-5 py-8 flex flex-col gap-8 relative z-10">
        {/*
            Header
        */}
        <header className="flex items-start justify-between">
          {/* Left Side - Greeting + Time */}
          <div>
            <h1 className="text-2xl font-bold text-stone-100">
              {greeting}.
            </h1>

            <p className={cx("text-xs", isPremium ? "text-amber-200/90" : "text-stone-400")}>
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
            {isPremium && (
              <div
                aria-hidden
                className="mt-2 h-px w-16 rounded-full bg-gradient-to-r from-[#e6c35c] via-[#d4a72c] to-transparent"
              />
            )}
          </div>

          {/* Right Side - Room Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoomModal(true)}
              className={cx(
                "text-xs px-3 py-1.5 rounded-full text-white transition",
                isPremium
                  ? "bg-gradient-to-r from-[#caa03d] via-[#b8860b] to-[#8a6404] hover:from-[#b8860b] hover:to-[#6f5203] shadow-[0_0_0_1px_rgba(184,134,11,0.25),0_6px_18px_-6px_rgba(184,134,11,0.45)]"
                  : "bg-gradient-to-r from-black-600 to-green-600 hover:from-gray-800 hover:to-green-700"
              )}
            >
              🎥 Talk in
            </button>
          </div>
        </header>

        <section>
          <MoodStory />
        </section>

        <section className="flex flex-col gap-5">
          <FeedToggle activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="grid gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start">
            <div className={activeTab === "posts" ? "hidden md:block" : "block"}>
              <Thoughts />
            </div>

            <div className={activeTab === "thoughts" ? "hidden md:block" : "block"}>
              <NewPosts />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-6">
          <p className="text-xs text-stone-500">Designed by Satvik's Group.</p>
        </footer>

        <RoomModal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
        />
      </div>
    </main>
  );
}