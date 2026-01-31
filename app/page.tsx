"use client";
import React from 'react';
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
    memberCount: 0,
    category: 'wellness',
    activity: 'low'
  },
  {
    id: 's2',
    name: 'Midnight Thoughts',
    emoji: '🌌',
    description: 'Deep conversations only. Open 24/7.',
    memberCount: 0,
    category: 'wellness',
    activity: 'low'
  },
  {
    id: 's3',
    name: 'Pet Parade',
    emoji: '🐾',
    description: 'Wholesome content only.',
    memberCount: 0,
    category: 'wellness',
    activity: 'low'
  },
  {
    id: 's4',
    name: 'Retro Tech',
    emoji: '💾',
    description: 'Nostalgia for the 90s/00s web.',
    memberCount: 0,
    category: 'wellness',
    activity: 'low'
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-dark flex justify-center selection:bg-stone-200">
      {/* Mobile Container Constraint */}
      <div className="w-full max-w-md px-6 py-8 flex flex-col h-full">
        
        {/* Header / Greeting */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-stone-100">Good afternoon.</h1>
            <p className="text-stone-400 text-sm">Saturday, Oct 14</p>
          </div>
          <div className="h-10 w-10 bg-stone-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
             {/* Placeholder Avatar */}
             <div className="w-full h-full bg-gradient-to-tr from-indigo-200 to-emerald-100" />
          </div>
        </header>

        {/* 1. Mood Entry */}
        <MoodSelector 
          onMoodSelect={(mood) => {
            'use client';
            console.log('User mood:', mood);
          }} 
        />

        {/* 2. Daily Drop (Core Feature) */}
        <DailyDropCard drop={TODAY_DROP} />

        {/* 3. Topic Spaces */}
        <SpacesGrid spaces={SPACES} />

        {/* Footer / End of content indicator */}
        <div className="text-center mt-auto py-8">
          <p className="text-stone-300 text-xs uppercase tracking-widest font-semibold">
            You are all caught up
          </p>
        </div>

      </div>
    </main>
  );
}