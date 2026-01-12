"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import { useSession } from "next-auth/react";
import { Message } from "../types/socket";
import { m } from "framer-motion";

interface NotificationContextType {
  unreadNotifications: number;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadNotifications: 0,
  clearNotifications: () => {},
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { messages } = useSocket();
  const { data: session } = useSession();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!messages || !session?.user?.id) return;

    // 🔔 NEW MESSAGE ARRIVED
    // messages.on("new_notification", ({ message }: { message: Message }) => {
    //   // do NOT count messages sent by yourself
    //   if (message.senderId !== session.user.id) {
    //     setUnreadNotifications((prev) => prev + 1);
    //   }
    // });

    return () => {
      // messages.off("new_notification");
    };
  }, [messages, session?.user?.id]);

  const clearNotifications = () => setUnreadNotifications(0);

  return (
    <NotificationContext.Provider
      value={{ unreadNotifications, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
