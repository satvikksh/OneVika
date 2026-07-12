"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/app/lib/socket";
import { requestFCMToken } from "@/app/lib/firebase";

type NotificationPayload = {
  _id?: string;
  id?: string;
  message?: string;
  title?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string | Date;
};

type MessageNotificationPayload = {
  id?: string;
  _id?: string;
};

export default function NotificationListener() {
  const { data: session } = useSession();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const broadcastNotification = (payload: NotificationPayload) => {
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
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type === "OPEN_URL" && data.url) {
        router.push(data.url);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [router]);

  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      const msg = (event as CustomEvent<MessageNotificationPayload>).detail;

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

  return <audio ref={audioRef} src="/sounds/notify5.mp3" preload="auto" />;
}
