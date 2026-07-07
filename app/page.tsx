"use client";

import React, { useState, useEffect } from "react";
import MoodStory from "./components/home/MoodStory";
import NewPosts from "./components/home/NewPosts";
import Thoughts from "./components/home/Thoughts";
import FeedToggle from "./components/home/FeedToggle";

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState("Good afternoon");
  const [activeTab, setActiveTab] = useState<"thoughts" | "posts">("thoughts");

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
    <main className="min-h-screen bg-stone-60 text-stone-950 transition-colors dark:bg-black dark:text-stone-100 flex justify-center">
      <div className="w-full max-w-7xl px-5 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex items-start justify-between">
          {/* Left Side - Greeting + Time */}
          <div>
            <h1 className="text-2xl font-bold text-stone-950 dark:text-stone-100">{greeting}.</h1>

            <p className="text-xs text-stone-500 dark:text-stone-500">
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
        </header>

        {/* ✅ STORIES (ONLY ONCE) */}
        <MoodStory />

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
          <p className="text-xs text-stone-500 dark:text-stone-600">Designed by Satvik&#39;s Group.</p>
        </footer>
      </div>
    </main>
  );
}
