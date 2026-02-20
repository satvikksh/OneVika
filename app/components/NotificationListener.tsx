"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/app/lib/socket";

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

      broadcastNotification(payload);
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

  return <audio ref={audioRef} src="/sounds/notify.wav" preload="auto" />;
}
