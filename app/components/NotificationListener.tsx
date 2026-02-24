"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/app/lib/socket";
import { requestFCMToken } from "@/app/lib/firebase";

export default function NotificationListener() {
  const { data: session } = useSession();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const broadcastNotification = (payload: any) => {
    window.dispatchEvent(
      new CustomEvent("orbitbyte:newNotification", {
        detail: payload,
      })
    );
  };

  useEffect(() => {
    const setupPush = async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (!("serviceWorker" in navigator)) return;

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") return;

      const token = await requestFCMToken();
      if (!token) return;

      await fetch("/api/save-fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    };

    if (session?.user?.id) {
      setupPush();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = getSocket();
    const joinUserRoom = () => {
      socket.emit("join", session.user.id);
    };

    socket.on("connect", joinUserRoom);
    if (socket.connected) {
      joinUserRoom();
    }

    socket.on("receiveNotification", (data) => {
      playSound();

      window.dispatchEvent(
        new CustomEvent("orbitbyte:addNavbarNotification", {
          detail: data,
        })
      );

      broadcastNotification(data);
    });

    return () => {
      socket.off("connect", joinUserRoom);
      socket.off("receiveNotification");
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const handleNewMessage = (event: any) => {
      const msg = event.detail;

      if (!window.location.pathname.includes("/chat")) {
        playSound();
      }

      const payload = {
        _id: msg.id,
        message: "New message received",
        isRead: false,
        createdAt: new Date(),
        type: "message",
      };

      window.dispatchEvent(
        new CustomEvent("orbitbyte:addNavbarNotification", {
          detail: payload,
        })
      );
    };

    window.addEventListener(
      "orbitbyte:newMessageNotification",
      handleNewMessage
    );

    return () => {
      window.removeEventListener(
        "orbitbyte:newMessageNotification",
        handleNewMessage
      );
    };
  }, []);

  return <audio ref={audioRef} src="/sounds/notify1.wav" preload="auto" />;
}
