"use client";

import { useEffect, useRef, useState } from "react";

interface MeteredFrameInstance {
  init(
    config: {
      roomURL: string;
      audio?: boolean;
      video?: boolean;
      [key: string]: unknown;
    },
    mountElement: HTMLElement
  ): void;
  leave(): void;
}

interface MeteredFrameConstructor {
  new (): MeteredFrameInstance;
}

declare global {
  interface Window {
    MeteredFrame?: MeteredFrameConstructor;
  }
}

export function useAudioCall(roomName: string) {
  const frameRef = useRef<MeteredFrameInstance | null>(null);

  const [inCall, setInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // ✅ Wait for SDK
  useEffect(() => {
    const timer = setInterval(() => {
      if (window.MeteredFrame && !frameRef.current) {
        frameRef.current = new window.MeteredFrame();
        setIsReady(true);
        clearInterval(timer);
        console.log("✅ Metered SDK ready");
      }
    }, 300);

    return () => clearInterval(timer);
  }, []);

  const scheduleRoomDeletion = async (roomId: string) => {
    try {
      await fetch("/api/metered", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scheduleDelete",
          roomName: roomId,
          deleteAfterHours: 24,
        }),
      });
    } catch (error) {
      console.error("Failed to schedule Metered room deletion:", error);
    }
  };

  // 📞 Start call
  const startCall = async () => {
    if (!isReady || !frameRef.current) {
      alert("Metered not ready yet");
      return;
    }

    try {
      setLoading(true);

      // 🎤 mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const sanitizedRoomName =
        roomName &&
        !roomName.includes("undefined") &&
        !roomName.includes("null")
          ? roomName
          : `audio-${Date.now()}`;

      let resolvedRoomId = sanitizedRoomName;

      try {
        const roomRes = await fetch("/api/metered", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: sanitizedRoomName }),
        });
        const roomData = await roomRes.json();
        if (roomRes.ok && roomData?.roomName) {
          resolvedRoomId = roomData.roomName;
        }
      } catch {
        // fallback to generated room id
      }

      setActiveRoomId(resolvedRoomId);
      try {
        localStorage.setItem("active_audio_room_id", resolvedRoomId);
      } catch {}

      frameRef.current.init(
        {
          roomURL: `https://onevika.metered.live/${resolvedRoomId}`,
          audio: true,
          video: false,
        },
        document.body
      );

      setInCall(true);
      console.log("📞 Audio call started");
    } catch (err) {
      console.error("❌ Call error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ❌ End call
  const endCall = () => {
    const roomIdToDelete = activeRoomId;

    if (roomIdToDelete) {
      void scheduleRoomDeletion(roomIdToDelete);
    }

    try {
      frameRef.current?.leave();
    } catch {}
    setActiveRoomId(null);
    try {
      localStorage.removeItem("active_audio_room_id");
    } catch {}

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("roomId")) {
        url.searchParams.delete("roomId");
        window.history.replaceState({}, "", url.toString());
      }
    }
    setInCall(false);
  };

  return {
    startCall,
    endCall,
    inCall,
    loading,
    isReady,
    activeRoomId,
  };
}
