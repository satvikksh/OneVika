"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    MeteredFrame?: any;
  }
}

export function useAudioCall(roomName: string) {
  const frameRef = useRef<any>(null);

  const [inCall, setInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

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

      frameRef.current.init(
        {
            roomURL: "https://onevika.metered.live/c2tyhqg7hl",
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
    try {
      frameRef.current?.leave();
    } catch {}
    setInCall(false);
  };

  return {
    startCall,
    endCall,
    inCall,
    loading,
    isReady,
  };
}
