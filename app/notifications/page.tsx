"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type NotificationSender = {
  _id?: string;
  id?: string;
};

type AppNotification = {
  _id: string;
  senderId?: string | NotificationSender | null;
  type?: "like" | "comment" | "follow" | "message" | "story" | "thought" | "call" | "premium";
  message: string;
  url?: string | null;
  isRead?: boolean;
  createdAt: string | Date;
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications`, { cache: "no-store" });
        const data = await res.json();

        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          console.error("Invalid response:", data);
          setNotifications([]);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [session]);

  const getSenderId = (notification: AppNotification) => {
    const sender = notification?.senderId;
    if (!sender) return "";
    if (typeof sender === "string") return sender;
    return sender?._id || sender?.id || "";
  };

  const resolveNotificationUrl = (notification: AppNotification) => {
    if (typeof notification?.url === "string" && notification.url.trim()) {
      return notification.url;
    }

    const senderId = getSenderId(notification);

    if (notification?.type === "follow" && senderId) {
      return `/profile/${senderId}`;
    }

    if (notification?.type === "story") {
      return "/feed";
    }

    if (notification?.type === "thought") {
      return "/neural-nexus";
    }

    if (notification?.type === "message") {
      return senderId ? `/chat?userId=${senderId}` : "/chat";
    }

    if (notification?.type === "premium" && session?.user?.id) {
      return `/profile/${session.user.id}#premium-membership`;
    }

    return "/notifications";
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    const targetUrl = resolveNotificationUrl(notification);

    try {
      await fetch(`/api/notifications/${notification._id}`, {
        method: "DELETE",
      });

      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      window.dispatchEvent(
        new CustomEvent("orbitbyte:notificationRemoved", { detail: { count: 1 } })
      );
    } catch {
      // still navigate even if delete fails
    }

    if (targetUrl !== "/notifications") {
      router.push(targetUrl);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-black dark:text-white">Notifications</h1>

      {loading ? (
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">No notifications yet</p>
      ) : (
        notifications.map((n) => (
          <button
            key={n._id}
            onClick={() => handleNotificationClick(n)}
            className={`p-3 mb-3 rounded-lg shadow ${
              n.isRead
                ? "bg-gray-100 dark:bg-gray-800"
                : "bg-blue-50 dark:bg-blue-950/40"
            } text-left w-full hover:opacity-90 transition-opacity border border-gray-200 dark:border-gray-700`}
          >
            <p className="font-medium text-black dark:text-white">{n.message}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </button>
        ))
      )}
    </div>
  );
}
