"use client";

import React, { useState, useEffect } from 'react';
import MoodSelector from './components/home/MoodSelector';
import DailyDropCard from './components/home/DailyDropCard';
import SpacesGrid from './components/home/SpacesGrid';
import { DailyDrop, Space } from './types/home';

// --- MOCK DATA ---
// In a real app, these would be fetched via `await fetch(...)`

const TODAY_DROP: DailyDrop = {
  id: 'drop-101',
  date: new Date().toISOString(),
  prompt: "What is a small win you had this week that went unnoticed?",
  totalAnswers: 142,
};

const SPACES: Space[] = [
  {
    id: 's1',
    name: 'Lo-Fi Study',
    emoji: '🎧',
    description: 'Quiet focus room. No talking, just vibes.',
    memberCount: 87,
    category: 'wellness',
    activity: 'medium'
  },
  {
    id: 's2',
    name: 'Midnight Thoughts',
    emoji: '🌌',
    description: 'Deep conversations only. Open 24/7.',
    memberCount: 42,
    category: 'wellness',
    activity: 'low'
  },
  {
    id: 's3',
    name: 'Pet Parade',
    emoji: '🐾',
    description: 'Wholesome content only.',
    memberCount: 156,
    category: 'wellness',
    activity: 'high'
  },
  {
    id: 's4',
    name: 'Retro Tech',
    emoji: '💾',
    description: 'Nostalgia for the 90s/00s web.',
    memberCount: 63,
    category: 'wellness',
    activity: 'medium'
  },
];

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('Good afternoon');

  // Format date to "Saturday, Oct 14" format
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Format time to "2:30 PM" format
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Update greeting based on time of day
  const updateGreeting = (hours: number) => {
    if (hours < 12) {
      setGreeting('Good morning');
    } else if (hours < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  };

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      updateGreeting(now.getHours());
    }, 60000); // Update every minute

    // Initial greeting update
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateGreeting(currentTime.getHours());

    return () => clearInterval(interval);
  }, []);

  // Update space activity and member counts randomly to simulate real-time changes
  useEffect(() => {
    const simulateActivity = setInterval(() => {
      // This would be replaced with real API calls in production
      SPACES.forEach(space => {
        // Simulate small member count changes
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        space.memberCount = Math.max(0, space.memberCount + change);
        
        // Simulate activity level changes
        const activityLevels = ['low', 'medium', 'high'] as const;
        if (Math.random() > 0.8) { // 20% chance to change activity
          space.activity = activityLevels[Math.floor(Math.random() * 3)];
        }
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(simulateActivity);
  }, []);

  return (
    <main className="min-h-screen bg-dark flex justify-center selection:bg-stone-200">
      {/* Mobile Container Constraint */}
      <div className="w-full max-w-md px-6 py-8 flex flex-col h-full">
        
        {/* Header / Greeting */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-100">{greeting}.</h1>
            <div className="flex items-center gap-2">
              <p className="text-stone-400 text-sm">{formatDate(currentTime)}</p>
              <span className="text-stone-600">•</span>
              <p className="text-stone-400 text-sm">{formatTime(currentTime)}</p>
            </div>
          </div>
          {/* <div className="h-10 w-10 bg-stone-200 rounded-full overflow-hidden border-2 border-white shadow-sm"> */}
            {/* Placeholder Avatar */}
            {/* <div className="w-full h-full bg-gradient-to-tr from-indigo-200 to-emerald-100" /> */}
          {/* </div> */}
        </header>

        {/* 1. Mood Entry */}
        <MoodSelector 
          onMoodSelect={(mood) => {
            console.log('User mood:', mood);
            // In a real app, you would send this to your backend
            // Example: await fetch('/api/mood', { method: 'POST', body: JSON.stringify({ mood, timestamp: new Date() }) })
          }} 
        />

        {/* 2. Daily Drop (Core Feature) */}
        <DailyDropCard />

        {/* 3. Topic Spaces */}
        <SpacesGrid spaces={SPACES} />

        {/* Footer / End of content indicator */}
        <div className="text-center mt-auto py-8">
          <p className="text-stone-300 text-xs uppercase tracking-widest font-semibold">
            Live • Updated just now
          </p>
        </div>
      </div>
    </main>
  );
}