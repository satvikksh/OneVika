"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import { useSession } from "next-auth/react";
import { Message } from "../types/socket";

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
  const { socket } = useSocket();
  const { data: session } = useSession();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    // 🔔 NEW MESSAGE ARRIVED
    socket.on("new_notification", ({ message }: { message: Message }) => {
      // do NOT count messages sent by yourself
      if (message.senderId !== session.user.id) {
        setUnreadNotifications((prev) => prev + 1);
      }
    });

    return () => {
      socket.off("new_notification");
    };
  }, [socket, session?.user?.id]);

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
