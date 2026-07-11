"use client";

const VOICE_INCOMING_SRC = "/sounds/voiceincoming.mp3";
const VIDEO_INCOMING_SRC = "/sounds/voice5.mp3";
const OUTGOING_RING_SRC = "/sounds/outgoingring.mp3";

let ringtone: HTMLAudioElement | null = null;
let currentSrc: string | null = null;
let currentKind: "voice-incoming" | "video-incoming" | "outgoing" | null = null;
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

function playManagedRingtone(
  src: string,
  kind: "voice-incoming" | "video-incoming" | "outgoing"
) {
  if (typeof window === "undefined") return;

  if (ringtone && currentSrc === src && currentKind === kind) {
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
  currentKind = kind;

  audio.play().catch(() => {
    installResumeHandler(audio);
  });
}

export function playVoiceIncoming() {
  playManagedRingtone(VOICE_INCOMING_SRC, "voice-incoming");
}

export function playVideoIncoming() {
  playManagedRingtone(VIDEO_INCOMING_SRC, "video-incoming");
}

export function playOutgoingRing() {
  playManagedRingtone(OUTGOING_RING_SRC, "outgoing");
}

export function stopOutgoingRing() {
  if (currentKind === "outgoing") {
    stopRingtone();
  }
}

export function stopRingtone() {
  removeResumeHandler();

  if (!ringtone) {
    currentSrc = null;
    currentKind = null;
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
    currentKind = null;
  }
}
