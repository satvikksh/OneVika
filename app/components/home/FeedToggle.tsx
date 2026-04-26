'use client';

import React from 'react';
import { Brain, FileText } from 'lucide-react';

interface FeedToggleProps {
  activeTab: 'thoughts' | 'posts';
  onTabChange: (tab: 'thoughts' | 'posts') => void;
}

export default function FeedToggle({ activeTab, onTabChange }: FeedToggleProps) {
  return (
    <div
      className="relative grid w-full grid-cols-2 rounded-full border border-stone-200 bg-white p-1 shadow-sm md:hidden dark:border-stone-800 dark:bg-stone-950"
      role="tablist"
      aria-label="Home feed"
    >
      <span
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-stone-950 transition-transform duration-200 dark:bg-white ${
          activeTab === 'posts' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'thoughts'}
        onClick={() => onTabChange('thoughts')}
        className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-medium transition-colors ${
          activeTab === 'thoughts'
            ? 'text-white dark:text-stone-950'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        <Brain className="w-4 h-4" />
        Thoughts
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'posts'}
        onClick={() => onTabChange('posts')}
        className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-medium transition-colors ${
          activeTab === 'posts'
            ? 'text-white dark:text-stone-950'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        <FileText className="w-4 h-4" />
        New Posts
      </button>
    </div>
  );
}
