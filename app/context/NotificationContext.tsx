"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

interface NotificationContextType {
  unreadNotifications: number;
  unreadMessages: number;
  clearNotifications: () => void;
  clearMessages: () => void;
}

type NotificationRow = {
  _id?: string;
  id?: string;
  isRead?: boolean;
};

type ChatListRow = {
  unreadCount?: number | string | null;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadNotifications: 0,
  unreadMessages: 0,
  clearNotifications: () => {},
  clearMessages: () => {},
});

const remember = (store: Set<string>, id?: string | null): boolean => {
  if (!id) return false;
  if (store.has(id)) return true;

  store.add(id);

  if (store.size > 300) {
    const first = store.values().next().value;
    if (first) store.delete(first);
  }

  return false;
};

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const seenMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user?.id) {
      queueMicrotask(() => {
        setUnreadNotifications(0);
        setUnreadMessages(0);
      });
      return;
    }

    let active = true;

    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;

        const rows: NotificationRow[] = await res.json();
        if (!active || !Array.isArray(rows)) return;

        rows.forEach((notification) => {
          const id = notification._id || notification.id;
          if (id) seenNotificationIds.current.add(id);
        });
        setUnreadNotifications(
          rows.filter((notification) => !notification.isRead).length
        );
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    }

    async function loadMessages() {
      try {
        const res = await fetch("/api/user/chat", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (!active || !Array.isArray(data.users)) return;

        const unread = data.users.reduce(
          (sum: number, user: ChatListRow) =>
            sum + (Number(user.unreadCount) || 0),
          0
        );

        setUnreadMessages(unread);
      } catch (error) {
        console.error("Failed to load unread messages:", error);
      }
    }

    void loadNotifications();
    void loadMessages();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const onNotification = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          _id?: string;
          id?: string;
          isRead?: boolean;
        }>
      ).detail;

      if (detail?.isRead) return;
      const id = detail?._id || detail?.id;
      if (remember(seenNotificationIds.current, id)) return;

      setUnreadNotifications((prev) => prev + 1);
    };

    const onMessage = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          _id?: string;
          id?: string;
        }>
      ).detail;

      const id = detail?._id || detail?.id;
      if (remember(seenMessageIds.current, id)) return;

      setUnreadMessages((prev) => prev + 1);
    };

    const onNotificationRemoved = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          count?: number;
        }>
      ).detail;

      setUnreadNotifications((prev) =>
        Math.max(0, prev - (detail?.count ?? 1))
      );
    };

    window.addEventListener("orbitbyte:newNotification", onNotification);
    window.addEventListener("orbitbyte:newMessageNotification", onMessage);
    window.addEventListener(
      "orbitbyte:notificationRemoved",
      onNotificationRemoved
    );

    return () => {
      window.removeEventListener("orbitbyte:newNotification", onNotification);
      window.removeEventListener("orbitbyte:newMessageNotification", onMessage);
      window.removeEventListener(
        "orbitbyte:notificationRemoved",
        onNotificationRemoved
      );
    };
  }, []);

  useEffect(() => {
    seenNotificationIds.current.clear();
    seenMessageIds.current.clear();
  }, [session?.user?.id]);

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
}

export function useNotifications() {
  return useContext(NotificationContext);
}
