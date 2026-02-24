"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface NotificationContextType {
  unreadNotifications: number;
  unreadMessages: number;
  clearNotifications: () => void;
  clearMessages: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadNotifications: 0,
  unreadMessages: 0,
  clearNotifications: () => {},
  clearMessages: () => {},
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { data: session } = useSession();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    let active = true;

    const loadUnread = async () => {
      try {
        const res = await fetch(`/api/notifications`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const rows = await res.json();
        if (!active || !Array.isArray(rows)) return;

        const unread = rows.filter((n: any) => !n.isRead).length;
        setUnreadNotifications(unread);
      } catch {
        // ignore initial load failures
      }
    };

    const loadUnreadMessages = async () => {
      try {
        const res = await fetch(`/api/user/chat`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data?.users)) return;

        const unread = data.users.reduce(
          (sum: number, user: any) => sum + (Number(user?.unreadCount) || 0),
          0
        );
        setUnreadMessages(unread);
      } catch {
        // ignore initial load failures
      }
    };

    loadUnread();
    loadUnreadMessages();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const handleRealtimeNotification = () => {
      setUnreadNotifications((prev) => prev + 1);
    };
    const handleNewMessageNotification = () => {
      setUnreadMessages((prev) => prev + 1);
    };

    const handleNotificationRemoved = (event: Event) => {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      const count = detail?.count ?? 1;
      setUnreadNotifications((prev) => Math.max(0, prev - count));
    };

    window.addEventListener(
      "orbitbyte:newNotification",
      handleRealtimeNotification as EventListener
    );
    window.addEventListener(
      "orbitbyte:newMessageNotification",
      handleNewMessageNotification as EventListener
    );
    window.addEventListener(
      "orbitbyte:notificationRemoved",
      handleNotificationRemoved as EventListener
    );

    return () => {
      window.removeEventListener(
        "orbitbyte:newNotification",
        handleRealtimeNotification as EventListener
      );
      window.removeEventListener(
        "orbitbyte:newMessageNotification",
        handleNewMessageNotification as EventListener
      );
      window.removeEventListener(
        "orbitbyte:notificationRemoved",
        handleNotificationRemoved as EventListener
      );
    };
  }, []);

  const clearNotifications = () => setUnreadNotifications(0);
  const clearMessages = () => setUnreadMessages(0);

  return (
    <NotificationContext.Provider
      value={{
        unreadNotifications,
        unreadMessages,
        clearNotifications,
        clearMessages,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
