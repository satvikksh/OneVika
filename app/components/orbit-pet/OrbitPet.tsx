"use client";

import React, { useEffect, useMemo, useState } from "react";

export type OrbitPetKind = "dog" | "cat" | "rabbit";

type OrbitPetConfig = {
  id: OrbitPetKind;
  emoji: string;
  name: string;
  description: string;
  personality: string;
};

export const ORBIT_PET_STORAGE_KEY = "orbitbyte.orbitPet.v1";
export const DEFAULT_ORBIT_PET: OrbitPetKind = "dog";

export const ORBIT_PETS: OrbitPetConfig[] = [
  {
    id: "dog",
    emoji: "🐶",
    name: "Dog",
    description: "Friendly, loyal, and always ready to welcome you back.",
    personality: "Friendly",
  },
  {
    id: "cat",
    emoji: "🐱",
    name: "Cat",
    description: "Calm, cozy, and fond of slow blinks between posts.",
    personality: "Calm",
  },
  {
    id: "rabbit",
    emoji: "🐰",
    name: "Rabbit",
    description: "Bright, energetic, and quick to hop into your day.",
    personality: "Energetic",
  },
];

const GREETINGS = [
  "Hi 👋",
  "Welcome back!",
  "Have a great day!",
  "Good to see you!",
  "You got this!",
];

export function normalizeOrbitPet(value: unknown): OrbitPetKind {
  return ORBIT_PETS.some((pet) => pet.id === value) ? (value as OrbitPetKind) : DEFAULT_ORBIT_PET;
}

export function getOrbitPetConfig(kind: OrbitPetKind) {
  return ORBIT_PETS.find((pet) => pet.id === kind) ?? ORBIT_PETS[0];
}

export default function OrbitPet({
  kind = DEFAULT_ORBIT_PET,
  preview = false,
  className = "",
}: {
  kind?: OrbitPetKind;
  preview?: boolean;
  className?: string;
}) {
  const [awake, setAwake] = useState(preview);
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [isVisible, setIsVisible] = useState(true);
  const pet = useMemo(() => getOrbitPetConfig(kind), [kind]);

  useEffect(() => {
    const handleVisibility = () => setIsVisible(document.visibilityState === "visible");
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (preview || !awake) return;
    const timer = window.setTimeout(() => setAwake(false), 5200);
    return () => window.clearTimeout(timer);
  }, [awake, preview, kind]);

  const wakePet = () => {
    if (preview) return;
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
    setAwake(true);
  };

  return (
    <button
      type="button"
      onClick={wakePet}
      aria-label={`Orbit Pet ${pet.name}. ${awake ? greeting : "Sleeping"}`}
      className={`orbit-pet group relative shrink-0 select-none rounded-[1.6rem] border border-white/50 bg-white/70 p-2.5 text-left shadow-[0_16px_45px_rgba(15,23,42,0.14)] outline-none backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,0.18)] focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-white/10 dark:bg-white/[0.07] ${awake ? "orbit-pet--awake" : "orbit-pet--sleeping"} ${isVisible ? "" : "orbit-pet--paused"} ${preview ? "pointer-events-none w-full" : "w-[5.5rem] sm:w-[6.25rem]"} ${className}`}
    >
      <span
        className={`orbit-pet-bubble absolute -left-2 -top-3 z-10 max-w-[8rem] rounded-2xl border border-white/60 bg-white px-3 py-1.5 text-xs font-black text-stone-900 shadow-lg dark:border-white/10 dark:bg-stone-950 dark:text-white ${awake ? "opacity-100" : "opacity-0"}`}
      >
        {greeting}
      </span>
      <span className="orbit-pet-zzz absolute right-2 top-1 text-[10px] font-black text-indigo-400 dark:text-amber-200">
        Zzz
      </span>
      <span className="block">
        {kind === "cat" ? <CatPet /> : kind === "rabbit" ? <RabbitPet /> : <DogPet />}
      </span>
      <span className="mx-auto mt-1 block h-2 w-14 rounded-full bg-black/10 blur-[2px] dark:bg-black/50" />
      {preview && (
        <span className="mt-3 block text-center text-xs font-bold text-stone-500 dark:text-stone-400">
          {pet.personality}
        </span>
      )}
      <OrbitPetStyles />
    </button>
  );
}

function DogPet() {
  return (
    <svg viewBox="0 0 120 104" role="img" aria-hidden="true" className="h-auto w-full">
      <defs>
        <linearGradient id="dogBody" x1="22" x2="92" y1="20" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D49A" />
          <stop offset="1" stopColor="#C98238" />
        </linearGradient>
        <linearGradient id="dogEar" x1="24" x2="44" y1="22" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B4D24" />
          <stop offset="1" stopColor="#5E351F" />
        </linearGradient>
      </defs>
      <path className="orbit-tail dog-tail" d="M84 63C106 50 104 78 88 72" fill="none" stroke="#8B4D24" strokeWidth="9" strokeLinecap="round" />
      <ellipse className="orbit-body" cx="61" cy="68" rx="34" ry="23" fill="url(#dogBody)" />
      <path className="orbit-ear left-ear" d="M31 30C18 34 16 56 31 64C39 55 41 40 31 30Z" fill="url(#dogEar)" />
      <path className="orbit-ear right-ear" d="M83 30C97 34 99 56 84 64C76 55 74 40 83 30Z" fill="url(#dogEar)" />
      <circle className="orbit-head" cx="57" cy="42" r="29" fill="url(#dogBody)" />
      <path d="M45 38C45 32 50 27 57 27C64 27 69 32 69 38C65 36 50 36 45 38Z" fill="#FFE8BF" opacity=".72" />
      <g className="orbit-eyes">
        <path className="sleep-eye" d="M43 43Q49 48 55 43" fill="none" stroke="#3A2418" strokeWidth="4" strokeLinecap="round" />
        <path className="sleep-eye" d="M62 43Q68 48 74 43" fill="none" stroke="#3A2418" strokeWidth="4" strokeLinecap="round" />
        <circle className="awake-eye blink-eye" cx="49" cy="43" r="3.6" fill="#2D1D15" />
        <circle className="awake-eye blink-eye" cx="68" cy="43" r="3.6" fill="#2D1D15" />
      </g>
      <path d="M57 48L52 54H63Z" fill="#3A2418" />
      <path d="M52 58Q58 64 65 58" fill="none" stroke="#3A2418" strokeWidth="3" strokeLinecap="round" />
      <path className="orbit-paw wave-paw" d="M34 68Q20 61 21 48" fill="none" stroke="#F2BD77" strokeWidth="10" strokeLinecap="round" />
      <path d="M51 88Q49 98 40 96" fill="none" stroke="#7B4524" strokeWidth="8" strokeLinecap="round" />
      <path d="M73 88Q77 99 86 95" fill="none" stroke="#7B4524" strokeWidth="8" strokeLinecap="round" />
      <circle cx="37" cy="55" r="5" fill="#FFE2B4" opacity=".65" />
      <circle cx="78" cy="55" r="5" fill="#FFE2B4" opacity=".65" />
    </svg>
  );
}

function CatPet() {
  return (
    <svg viewBox="0 0 120 104" role="img" aria-hidden="true" className="h-auto w-full">
      <defs>
        <linearGradient id="catBody" x1="22" x2="92" y1="22" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D8DDE8" />
          <stop offset="1" stopColor="#7D8AA0" />
        </linearGradient>
      </defs>
      <path className="orbit-tail cat-tail" d="M84 69C110 75 101 38 85 50" fill="none" stroke="#738095" strokeWidth="8" strokeLinecap="round" />
      <ellipse className="orbit-body cat-body" cx="58" cy="70" rx="35" ry="22" fill="url(#catBody)" />
      <path className="orbit-ear left-ear" d="M34 29L43 8L53 32Z" fill="#9EA9BA" />
      <path className="orbit-ear right-ear" d="M71 31L82 8L88 34Z" fill="#7D8AA0" />
      <path d="M39 28L43 18L48 30Z" fill="#F3B5BD" opacity=".75" />
      <path d="M76 29L81 18L84 31Z" fill="#F3B5BD" opacity=".75" />
      <circle className="orbit-head" cx="61" cy="43" r="29" fill="url(#catBody)" />
      <g className="orbit-eyes">
        <path className="sleep-eye" d="M45 44Q51 48 57 44" fill="none" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
        <path className="sleep-eye" d="M66 44Q72 48 78 44" fill="none" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
        <path className="awake-eye blink-eye" d="M49 39V47" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
        <path className="awake-eye blink-eye" d="M72 39V47" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M61 49L56 54H66Z" fill="#E98996" />
      <path d="M56 59Q62 63 68 59" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
      <path className="orbit-paw wave-paw" d="M38 70Q27 64 28 52" fill="none" stroke="#AEB8C8" strokeWidth="9" strokeLinecap="round" />
      <path d="M35 53H20M36 59H20M82 53H100M81 59H99" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

function RabbitPet() {
  return (
    <svg viewBox="0 0 120 104" role="img" aria-hidden="true" className="h-auto w-full">
      <defs>
        <linearGradient id="rabbitBody" x1="28" x2="88" y1="16" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D9E1F2" />
        </linearGradient>
      </defs>
      <path className="orbit-ear rabbit-ear-left" d="M42 34C31 15 34 4 44 4C55 6 54 24 50 39Z" fill="url(#rabbitBody)" />
      <path className="orbit-ear rabbit-ear-right" d="M70 35C78 14 90 5 96 13C102 24 85 37 75 43Z" fill="url(#rabbitBody)" />
      <path d="M43 29C39 17 41 11 45 11C50 14 48 25 46 32Z" fill="#F6B8C4" opacity=".72" />
      <path d="M76 32C82 21 89 16 92 19C95 26 85 33 79 37Z" fill="#F6B8C4" opacity=".72" />
      <ellipse className="orbit-body rabbit-body" cx="60" cy="70" rx="36" ry="22" fill="url(#rabbitBody)" />
      <circle className="orbit-head" cx="58" cy="44" r="29" fill="url(#rabbitBody)" />
      <g className="orbit-eyes">
        <path className="sleep-eye" d="M43 43Q49 48 55 43" fill="none" stroke="#253047" strokeWidth="4" strokeLinecap="round" />
        <path className="sleep-eye" d="M62 43Q68 48 74 43" fill="none" stroke="#253047" strokeWidth="4" strokeLinecap="round" />
        <circle className="awake-eye blink-eye" cx="49" cy="43" r="3.4" fill="#253047" />
        <circle className="awake-eye blink-eye" cx="68" cy="43" r="3.4" fill="#253047" />
      </g>
      <path d="M58 49L53 54H63Z" fill="#F08FA2" />
      <path d="M53 59Q59 63 65 59" fill="none" stroke="#253047" strokeWidth="3" strokeLinecap="round" />
      <circle cx="36" cy="56" r="5" fill="#F8B8C7" opacity=".5" />
      <circle cx="80" cy="56" r="5" fill="#F8B8C7" opacity=".5" />
      <path className="orbit-paw wave-paw" d="M35 70Q24 62 27 51" fill="none" stroke="#EEF2FA" strokeWidth="9" strokeLinecap="round" />
      <path d="M47 88Q42 98 33 94" fill="none" stroke="#D9E1F2" strokeWidth="8" strokeLinecap="round" />
      <path d="M73 88Q80 98 89 93" fill="none" stroke="#D9E1F2" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function OrbitPetStyles() {
  return (
    <style jsx global>{`
      .orbit-pet * {
        transform-box: fill-box;
        transform-origin: center;
      }
      .orbit-body {
        animation: orbitPetBreath 3.4s ease-in-out infinite;
      }
      .orbit-head {
        animation: orbitPetNod 3.4s ease-in-out infinite;
      }
      .orbit-ear {
        animation: orbitPetEar 4.8s ease-in-out infinite;
      }
      .orbit-tail {
        animation: orbitPetSleepTail 4.5s ease-in-out infinite;
      }
      .orbit-pet-zzz {
        animation: orbitPetZzz 2.9s ease-in-out infinite;
      }
      .orbit-pet-bubble {
        transform: translateY(4px) scale(0.96);
        transition: opacity 180ms ease, transform 180ms ease;
      }
      .orbit-pet--awake .orbit-pet-bubble {
        transform: translateY(0) scale(1);
      }
      .awake-eye {
        opacity: 0;
      }
      .orbit-pet--awake .sleep-eye {
        opacity: 0;
      }
      .orbit-pet--awake .awake-eye {
        opacity: 1;
      }
      .orbit-pet--awake .blink-eye {
        animation: orbitPetBlink 3.8s ease-in-out infinite;
      }
      .orbit-pet--awake .orbit-body {
        animation: orbitPetWake 700ms ease-out both, orbitPetHappy 1.7s ease-in-out 800ms infinite;
      }
      .orbit-pet--awake .rabbit-body {
        animation: orbitPetHop 1.15s ease-in-out infinite;
      }
      .orbit-pet--awake .cat-body {
        animation: orbitPetStretch 1.8s ease-in-out infinite;
      }
      .orbit-pet--awake .orbit-tail {
        animation: orbitPetHappyTail 520ms ease-in-out infinite;
      }
      .orbit-pet--awake .cat-tail {
        animation: orbitPetCatTail 1.6s ease-in-out infinite;
      }
      .orbit-pet--awake .wave-paw {
        animation: orbitPetWave 850ms ease-in-out infinite;
        transform-origin: 70% 88%;
      }
      .orbit-pet--awake .rabbit-ear-left,
      .orbit-pet--awake .rabbit-ear-right {
        animation: orbitPetRabbitEar 900ms ease-in-out infinite;
      }
      .orbit-pet--paused *,
      .orbit-pet--paused .orbit-pet-zzz {
        animation-play-state: paused !important;
      }
      @keyframes orbitPetBreath {
        0%, 100% { transform: scaleY(1) translateY(0); }
        50% { transform: scaleY(0.965) translateY(1px); }
      }
      @keyframes orbitPetNod {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(1.5px) rotate(-1deg); }
      }
      @keyframes orbitPetEar {
        0%, 85%, 100% { transform: rotate(0deg); }
        90% { transform: rotate(-4deg); }
      }
      @keyframes orbitPetSleepTail {
        0%, 82%, 100% { transform: rotate(0deg); }
        88% { transform: rotate(9deg); }
        94% { transform: rotate(-7deg); }
      }
      @keyframes orbitPetZzz {
        0% { opacity: 0; transform: translate3d(0, 6px, 0) scale(.84); }
        30% { opacity: .85; }
        100% { opacity: 0; transform: translate3d(-12px, -18px, 0) scale(1.08); }
      }
      @keyframes orbitPetWake {
        0% { transform: scaleY(.94) translateY(3px); }
        58% { transform: scaleY(1.08) translateY(-4px); }
        100% { transform: scaleY(1) translateY(0); }
      }
      @keyframes orbitPetHappy {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      @keyframes orbitPetHop {
        0%, 100% { transform: translateY(0); }
        45% { transform: translateY(-6px); }
      }
      @keyframes orbitPetStretch {
        0%, 100% { transform: scaleX(1) translateY(0); }
        48% { transform: scaleX(1.08) translateY(1px); }
      }
      @keyframes orbitPetHappyTail {
        0%, 100% { transform: rotate(-14deg); }
        50% { transform: rotate(15deg); }
      }
      @keyframes orbitPetCatTail {
        0%, 100% { transform: rotate(0deg); }
        45% { transform: rotate(11deg); }
      }
      @keyframes orbitPetWave {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-24deg); }
      }
      @keyframes orbitPetRabbitEar {
        0%, 100% { transform: rotate(-2deg); }
        50% { transform: rotate(8deg); }
      }
      @keyframes orbitPetBlink {
        0%, 88%, 94%, 100% { transform: scaleY(1); }
        91% { transform: scaleY(.12); }
      }
      @media (prefers-reduced-motion: reduce) {
        .orbit-pet *,
        .orbit-pet-zzz {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}
