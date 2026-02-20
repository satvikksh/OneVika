"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `/api/notifications?userId=${session.user.id}`
        );
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

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      {loading ? (
        <p>Loading...</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n._id}
            className={`p-3 mb-3 rounded-lg shadow ${
              n.isRead ? "bg-gray-100" : "bg-blue-50"
            }`}
          >
            <p className="font-medium">{n.message}</p>
            <p className="text-xs text-gray-500">
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
