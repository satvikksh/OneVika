'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DailyDropCardProps } from '../../types/home';

export default function DailyDropCard({ drop }: DailyDropCardProps) {
  const [state, setState] = useState<'idle' | 'answering' | 'submitted' | 'skipped' | 'viewing'>('idle');
  const [answer, setAnswer] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Mock responses from other users
  const mockResponses = [
    { id: 1, text: "I'm starting my day with 5 minutes of meditation and a cup of tea ☕", author: "Alex", likes: 12, emoji: "🧘" },
    { id: 2, text: "Going for a walk without my phone today!", author: "Jordan", likes: 8, emoji: "🚶" },
    { id: 3, text: "Writing down 3 things I'm grateful for this morning", author: "Taylor", likes: 15, emoji: "📝" },
    { id: 4, text: "Taking 10 deep breaths before checking my emails", author: "Casey", likes: 6, emoji: "💨" },
  ];

  useEffect(() => {
    if (state === 'answering' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state]);

  const handleAnswerClick = () => {
    setState('answering');
    // Small haptic feedback simulation
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleSubmitAnswer = () => {
    if (answer.trim().length > 0) {
      setState('submitted');
      setShowConfetti(true);
      
      // Hide confetti after animation
      setTimeout(() => setShowConfetti(false), 2000);
      
      // In real app, send to API
      console.log('Answer submitted:', answer);
    }
  };

  const handleSkip = () => {
    setState('skipped');
    // Gentle animation effect
    const card = document.querySelector('.daily-drop-card');
    if (card) {
      card.classList.add('animate-pulse');
      setTimeout(() => card.classList.remove('animate-pulse'), 500);
    }
  };

  const handleViewOthers = () => {
    setState('viewing');
  };

  const handleBack = () => {
    setState('idle');
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnswer(value);
    setCharacterCount(value.length);
  };

  // Character count color based on length
  const getCountColor = () => {
    if (characterCount === 0) return 'text-stone-400';
    if (characterCount < 50) return 'text-blue-500';
    if (characterCount < 150) return 'text-green-500';
    return 'text-orange-500';
  };

  // Confetti effect component
  const Confetti = () => (
    <div className="confetti-container absolute inset-0 overflow-hidden pointer-events-none z-10">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="confetti absolute w-2 h-2 opacity-0"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6'][Math.floor(Math.random() * 4)],
            animation: `confetti-fall ${0.5 + Math.random()}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );

  // ANSERING STATE
  if (state === 'answering') {
    return (
      <div className="daily-drop-card relative w-full my-6">
        {/* {showConfetti && <Confetti />} */}
        
        <div className="relative overflow-hidden bg-gradient-to-br from-white to-stone-50 border border-stone-200 rounded-[2rem] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
          <button
            onClick={handleBack}
            className="absolute top-6 left-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors z-20"
          >
            ←
          </button>
          
          <div className="text-center mb-6 pt-4">
            <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent text-xs font-bold tracking-widest uppercase">
              Your Turn
            </span>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-lg">💭</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-stone-800">Today's Prompt</h3>
                <p className="text-sm text-stone-500">Share your thoughts</p>
              </div>
            </div>
            <p className="text-xl font-serif text-stone-800 leading-relaxed px-2">
              {drop.prompt}
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={handleAnswerChange}
                placeholder="Start typing your response..."
                className="w-full h-40 p-4 bg-stone-50 border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
                maxLength={300}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={`text-xs font-medium ${getCountColor()}`}>
                  {characterCount}/300
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${characterCount > 0 ? 'bg-blue-500 text-white scale-110' : 'bg-stone-200 text-stone-400'}`}>
                  {characterCount > 0 ? '✨' : '✏️'}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitAnswer}
                disabled={answer.trim().length === 0}
                className={`flex-1 py-4 rounded-2xl font-medium text-sm transition-all ${answer.trim().length > 0 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl active:scale-[0.98]' 
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {answer.trim().length > 0 ? 'Share Response' : 'Write something first'}
              </button>
              
              <button
                onClick={handleBack}
                className="px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEWING OTHERS STATE
  if (state === 'viewing') {
    return (
      <div className="daily-drop-card w-full my-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-stone-100 to-white border border-stone-200 rounded-[2rem] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
          <button
            onClick={handleBack}
            className="absolute top-6 left-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
          >
            ←
          </button>
          
          <div className="text-center mb-8 pt-4">
            <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent text-xs font-bold tracking-widest uppercase">
              Community Responses
            </span>
            <h3 className="text-2xl font-serif text-stone-800 mt-2 mb-1">{drop.prompt}</h3>
            <p className="text-stone-500 text-sm">{mockResponses.length} responses</p>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {mockResponses.map((response) => (
              <div
                key={response.id}
                className="bg-white/80 p-4 rounded-2xl border border-stone-100 hover:border-stone-200 transition-all hover:shadow-sm group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="text-lg">{response.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-800">{response.author}</span>
                      <span className="text-xs text-stone-400">•</span>
                      <span className="text-xs text-stone-400">{response.likes} appreciations</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed">{response.text}</p>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-red-400 transition-colors group-hover:scale-110">
                    ♡
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-stone-100">
            <button
              onClick={() => setState('answering')}
              className="w-full py-4 bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl font-medium text-sm hover:shadow-lg active:scale-[0.98] transition-all"
            >
              Add Your Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUBMITTED STATE
  if (state === 'submitted') {
    return (
      <div className="daily-drop-card w-full my-6">
        {/* {showConfetti && <Confetti />} */}
        
        <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-[2rem] p-8 text-center shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
          <div className="animate-bounce-slow mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🌱</span>
            </div>
          </div>
          
          <h3 className="text-2xl font-serif text-stone-800 mb-3">Thought Planted</h3>
          <p className="text-stone-600 mb-6 max-w-xs mx-auto">
            Your response has been added to the garden. Check back tomorrow for the next drop.
          </p>
          
          <div className="space-y-4">
            <div className="bg-white/70 p-4 rounded-xl border border-green-100">
              <p className="text-stone-700 italic text-sm">"{answer.substring(0, 100)}{answer.length > 100 ? '...' : ''}"</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleViewOthers}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 active:scale-[0.98] transition-all"
              >
                Read Others
              </button>
              <button
                onClick={() => {
                  setState('answering');
                  setAnswer('');
                }}
                className="px-6 py-3 bg-white text-green-600 border border-green-200 rounded-xl font-medium text-sm hover:bg-green-50 active:scale-[0.98] transition-all"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SKIPPED STATE
  if (state === 'skipped') {
    return (
      <div className="daily-drop-card w-full my-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-[2rem] p-8 text-center shadow-[0_8px_40px_rgb(0,0,0,0.04)] animate-pulse-once">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-sky-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🍃</span>
            </div>
          </div>
          
          <h3 className="text-xl font-medium text-stone-800 mb-3">Come back anytime</h3>
          <p className="text-stone-600 mb-8">
            No pressure. This space will be here when you're ready.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setState('idle')}
              className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-2xl font-medium text-sm hover:shadow-lg active:scale-[0.98] transition-all"
            >
              Try Again
            </button>
            <button
              onClick={handleViewOthers}
              className="flex-1 py-4 bg-white text-blue-600 border border-blue-200 rounded-2xl font-medium text-sm hover:bg-blue-50 active:scale-[0.98] transition-all"
            >
              Just Read
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT IDLE STATE
  return (
    <section className="daily-drop-card w-full my-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-stone-100 to-white border border-stone-200 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-shadow duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <span className="text-sm">💧</span>
            </div>
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent text-xs uppercase tracking-widest font-bold">
              Daily Drop
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400 text-xs">•</span>
            <span className="text-stone-400 text-xs">{drop.totalAnswers} responses</span>
          </div>
        </div>

        {/* Prompt */}
        <h3 className="text-2xl font-serif text-stone-800 leading-snug mb-8 animate-slide-up">
          {drop.prompt}
        </h3>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={handleAnswerClick}
            className="w-full py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-stone-50 rounded-2xl font-medium text-sm hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            <span>Share Your Thoughts</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={handleViewOthers}
              className="flex-1 py-4 bg-gradient-to-r from-stone-100 to-stone-50 text-stone-700 rounded-2xl font-medium text-sm hover:bg-stone-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>👁</span>
              <span>Read {drop.totalAnswers}</span>
            </button>
            <button 
              onClick={handleSkip}
              className="px-6 py-4 text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors hover:bg-stone-100 rounded-2xl active:scale-[0.98]"
            >
              Skip
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}