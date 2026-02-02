'use client';

import React, { useState } from 'react';

type MoodSelectorProps = {
  onMoodChange?: (energy: number, label: string) => void;
};

export default function MoodSelector({ onMoodChange }: MoodSelectorProps) {
  const [energy, setEnergy] = useState(3);
  const [saving, setSaving] = useState(false);

  const getLabel = (v: number) => {
    if (v === 1) return 'Very Low';
    if (v === 2) return 'Low';
    if (v === 3) return 'Balanced';
    if (v === 4) return 'Good';
    return 'High';
  };

  async function saveMood(value: number) {
    setSaving(true);
    try {
      await fetch('/api/mood/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energy: value }),
      });

      onMoodChange?.(value, getLabel(value));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full max-w-md mx-auto py-6 space-y-6">

      {/* HEADER */}
      <div>
        <h2 className="text-xl font-serif text-white">
          How’s your energy today?
        </h2>
        <p className="text-sm text-stone-400">
          Slide to track your current headspace
        </p>
      </div>

      {/* SLIDER */}
      <div>
        <input
          type="range"
          min={1}
          max={5}
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          onMouseUp={() => saveMood(energy)}
          onTouchEnd={() => saveMood(energy)}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(
              to right,
              #60a5fa 0%,
              #34d399 ${energy * 20}%,
              #292524 ${energy * 20}%,
              #292524 100%
            )`,
          }}
        />

        <div className="flex justify-between mt-4 text-xs text-stone-400">
          <span>Low</span>
          <span className="text-white font-medium">
            {getLabel(energy)}
          </span>
          <span>High</span>
        </div>
      </div>

      {/* STATUS */}
      <div className="h-4">
        {saving && (
          <p className="text-xs text-stone-500 animate-pulse">
            Saving mood…
          </p>
        )}
      </div>
    </section>
  );
}
