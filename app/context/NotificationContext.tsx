"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  const { data: session } = useSession();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    let active = true;

    const loadUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${session.user.id}`, {
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

    loadUnread();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const handleRealtimeNotification = () => {
      setUnreadNotifications((prev) => prev + 1);
    };

    window.addEventListener(
      "orbitbyte:newNotification",
      handleRealtimeNotification as EventListener
    );

    return () => {
      window.removeEventListener(
        "orbitbyte:newNotification",
        handleRealtimeNotification as EventListener
      );
    };
  }, []);

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
