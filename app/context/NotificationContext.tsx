"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext";
import { useSession } from "next-auth/react";

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
  const seenMessageIds = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!messages || !userId) return;

    if (!hasInitialized.current) {
      messages.forEach((message) => seenMessageIds.current.add(message.id));
      hasInitialized.current = true;
      return;
    }

    let nextUnreadCount = 0;
    for (const message of messages) {
      if (seenMessageIds.current.has(message.id)) {
        continue;
      }

      seenMessageIds.current.add(message.id);

      if (message.senderId !== userId) {
        nextUnreadCount += 1;
      }
    }

    if (nextUnreadCount > 0) {
      setUnreadNotifications((prev) => prev + nextUnreadCount);
    }
  }, [messages, session?.user?.id]);

  useEffect(() => {
    seenMessageIds.current.clear();
    hasInitialized.current = false;
    setUnreadNotifications(0);
  }, [session?.user?.id]);

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
