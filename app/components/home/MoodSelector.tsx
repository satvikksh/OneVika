'use client';

import React, { useState, useEffect } from 'react';
import { MoodOption, MoodSelectorProps } from '../../types/home';

const MOODS: MoodOption[] = [
  { id: 'low', emoji: '🌧️', label: 'Stormy', value: 1, color: 'from-blue-400 to-indigo-500', description: 'Feeling heavy or drained' },
  { id: 'meh', emoji: '🌥️', label: 'Cloudy', value: 2, color: 'from-gray-400 to-slate-500', description: 'A bit gray or uncertain' },
  { id: 'calm', emoji: '🌿', label: 'Calm', value: 3, color: 'from-green-400 to-emerald-500', description: 'Peaceful and grounded' },
  { id: 'good', emoji: '☀️', label: 'Sunny', value: 4, color: 'from-yellow-400 to-orange-500', description: 'Bright and positive' },
  { id: 'hyped', emoji: '✨', label: 'Radiant', value: 5, color: 'from-purple-400 to-pink-500', description: 'Energetic and inspired' },
];

export default function MoodSelector({ onMoodSelect }: MoodSelectorProps) {
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [hoveredMoodId, setHoveredMoodId] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [pulseIndex, setPulseIndex] = useState(-1);
  const [energyLevel, setEnergyLevel] = useState(0);

  // Create a gentle pulsing effect on idle
  useEffect(() => {
    if (selectedMoodId || hoveredMoodId) return;
    
    const interval = setInterval(() => {
      setPulseIndex(prev => (prev + 1) % MOODS.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [selectedMoodId, hoveredMoodId]);

  const handleSelect = (mood: MoodOption) => {
    setSelectedMoodId(mood.id);
    setEnergyLevel(mood.value);
    setShowDescription(true);
    
    // Visual feedback
    if (onMoodSelect) {
      setTimeout(() => {
        onMoodSelect(mood);
        setSelectionConfirmed(true);
        
        // Auto-hide confirmation after 3 seconds
        setTimeout(() => setSelectionConfirmed(false), 3000);
      }, 300);
    }
  };

  const handleReset = () => {
    setSelectedMoodId(null);
    setHoveredMoodId(null);
    setShowDescription(false);
    setSelectionConfirmed(false);
    setEnergyLevel(0);
  };

  const handleSkip = () => {
    setSelectedMoodId('skipped');
    setTimeout(() => {
      if (onMoodSelect) {
        // onMoodSelect({ id: 'skipped', emoji: '➡️', label: 'Skipped', value: 0 });
      }
    }, 300);
  };

  const selectedMood = MOODS.find(m => m.id === selectedMoodId);
  const hoveredMood = MOODS.find(m => m.id === hoveredMoodId);

  // Calculate energy bar width
  const energyBarWidth = `${(energyLevel / 5) * 100}%`;

  return (
    <section className="w-full py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div>
          <h2 className="text-xl font-serif text-stone-300">How's your energy today?</h2>
          <p className="text-stone-500 text-sm mt-1">Choose what resonates • Optional</p>
        </div>
        {selectedMoodId && selectedMoodId !== 'skipped' && (
          <button 
            onClick={handleReset}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors px-3 py-1 hover:bg-stone-100 rounded-full"
          >
            Change
          </button>
        )}
      </div>

      {/* Mood Selection Grid */}
      {selectedMoodId !== 'skipped' ? (
        <div className="relative">
          {/* Energy Level Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-stone-500 mb-2">
              <span>Low</span>
              <span>High</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r from-blue-400 via-green-400 to-yellow-400 transition-all duration-700 ease-out`}
                style={{ width: energyBarWidth }}
              />
            </div>
          </div>

          {/* Mood Options */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {MOODS.map((mood, index) => {
              const isSelected = selectedMoodId === mood.id;
              const isHovered = hoveredMoodId === mood.id;
              const shouldPulse = pulseIndex === index && !selectedMoodId && !hoveredMoodId;
              
              return (
                <button
                  key={mood.id}
                  onClick={() => handleSelect(mood)}
                  onMouseEnter={() => setHoveredMoodId(mood.id)}
                  onMouseLeave={() => setHoveredMoodId(null)}
                  className={`
                    relative flex flex-col items-center justify-center
                    p-4 rounded-2xl transition-all duration-300
                    ${isSelected 
                      ? `bg-gradient-to-br ${mood.color} text-white shadow-lg scale-105` 
                      : 'bg-white hover:bg-stone-50 border border-stone-100'
                    }
                    ${isHovered && !isSelected ? 'scale-105 shadow-md' : ''}
                    ${shouldPulse ? 'animate-pulse' : ''}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400
                  `}
                  aria-label={`Select ${mood.label} mood`}
                >
                  {/* Glow effect for selected */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br opacity-30 blur-md rounded-2xl" />
                  )}
                  
                  <span className={`text-3xl mb-2 transition-transform duration-300 ${isSelected ? 'scale-125' : ''}`}>
                    {mood.emoji}
                  </span>
                  
                  <span className={`text-xs font-medium transition-all duration-300 ${isSelected ? 'text-white opacity-90' : 'text-stone-600'}`}>
                    {mood.label}
                  </span>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                      <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Description Panel */}
          {(showDescription && selectedMood) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
              <div className="bg-gradient-to-br from-stone-50 to-white border border-stone-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedMood.color} flex items-center justify-center`}>
                    <span className="text-2xl">{selectedMood.emoji}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-stone-800">{selectedMood.label}</h3>
                    <p className="text-stone-600 text-sm">{selectedMood.description}</p>
                  </div>
                </div>
                
                {/* Energy level indicator */}
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all duration-500 ${i < selectedMood.value 
                        ? `bg-gradient-to-r ${selectedMood.color}` 
                        : 'bg-stone-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Message */}
          {selectionConfirmed && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 mb-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 text-center">
                <p className="text-green-700 font-medium flex items-center justify-center gap-2">
                  <span className="text-lg">✓</span>
                  Mood recorded. Thanks for checking in.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Skip for now</span>
              <span className="text-xs opacity-60">→</span>
            </button>
            
            {selectedMood && (
              <button
                onClick={() => {
                  // In real app, could save to profile or trigger next action
                  alert(`Saved "${selectedMood.label}" mood to your day`);
                }}
                className="flex-1 py-4 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl font-medium text-sm hover:shadow-lg active:scale-[0.98] transition-all"
              >
                Save & Continue
              </button>
            )}
          </div>
        </div>
      ) : (
        // Skipped State
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-sky-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">☁️</span>
            </div>
            
            <h3 className="text-lg font-medium text-stone-800 mb-2">No worries</h3>
            <p className="text-stone-600 text-sm mb-6">
              You can set your mood anytime from your profile or come back tomorrow.
            </p>
            
            <button
              onClick={handleReset}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-2xl font-medium text-sm hover:shadow-lg active:scale-[0.98] transition-all"
            >
              Set Mood Now
            </button>
          </div>
        </div>
      )}

      {/* Mood History Preview (Optional) */}
      {selectedMoodId && selectedMoodId !== 'skipped' && (
        <div className="mt-8 pt-6 border-t border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-stone-700">Your energy this week</h4>
            <span className="text-xs text-stone-400">View history</span>
          </div>
          
          <div className="flex items-end justify-between h-12">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Today'].map((day, i) => {
              const height = i === 4 ? selectedMood?.value * 8 : [3, 4, 2, 3][i] * 8;
              const isToday = i === 4;
              
              return (
                <div key={day} className="flex flex-col items-center">
                  <div 
                    className={`w-8 rounded-t-lg transition-all duration-700 ${
                      isToday 
                        ? `bg-gradient-to-t ${selectedMood?.color}`
                        : 'bg-gradient-to-t from-stone-200 to-stone-300'
                    }`}
                    style={{ height: `${height}px` }}
                  />
                  <span className={`text-xs mt-2 ${isToday ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Micro-interaction Hint */}
      {!selectedMoodId && (
        <div className="mt-6 text-center">
          <p className="text-xs text-stone-400 animate-pulse">
            💡 Tap or hover to preview moods
          </p>
        </div>
      )}
    </section>
  );
}