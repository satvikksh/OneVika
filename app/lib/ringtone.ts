"use client";

const VOICE_INCOMING_SRC = "/sounds/voiceincoming.mp3";
const VIDEO_INCOMING_SRC = "/sounds/videoincoming.mp3";

let ringtone: HTMLAudioElement | null = null;
let currentSrc: string | null = null;
let resumeHandler: (() => void) | null = null;

function removeResumeHandler() {
  if (!resumeHandler || typeof window === "undefined") return;

  window.removeEventListener("pointerdown", resumeHandler);
  window.removeEventListener("touchstart", resumeHandler);
  window.removeEventListener("keydown", resumeHandler);
  resumeHandler = null;
}

function installResumeHandler(audio: HTMLAudioElement) {
  if (typeof window === "undefined" || resumeHandler) return;

  resumeHandler = () => {
    audio.play().then(removeResumeHandler).catch(() => {});
  };

  window.addEventListener("pointerdown", resumeHandler, { once: true });
  window.addEventListener("touchstart", resumeHandler, { once: true });
  window.addEventListener("keydown", resumeHandler, { once: true });
}

function playIncoming(src: string) {
  if (typeof window === "undefined") return;

  if (ringtone && currentSrc === src) {
    ringtone.currentTime = 0;
    void ringtone.play().catch(() => installResumeHandler(ringtone!));
    return;
  }

  stopRingtone();

  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 1;

  ringtone = audio;
  currentSrc = src;

  audio.play().catch(() => {
    installResumeHandler(audio);
  });
}

export function playVoiceIncoming() {
  playIncoming(VOICE_INCOMING_SRC);
}

export function playVideoIncoming() {
  playIncoming(VIDEO_INCOMING_SRC);
}

export function stopRingtone() {
  removeResumeHandler();

  if (!ringtone) {
    currentSrc = null;
    return;
  }

  try {
    ringtone.pause();
    ringtone.currentTime = 0;
    ringtone.loop = false;
    ringtone.removeAttribute("src");
    ringtone.load();
  } catch (error) {
    console.warn("[Ringtone] Failed to stop ringtone:", error);
  } finally {
    ringtone = null;
    currentSrc = null;
  }
}
