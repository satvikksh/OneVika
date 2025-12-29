"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Zap,
  Brain,
  Shield,
  Clock,
  Trash2,
  Eye,
} from "lucide-react";

/* =======================
   TYPES
======================= */
type NotificationType = "info" | "warning" | "success" | "system";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  time: string;
  read: boolean;
}

/* =======================
   DEMO DATA
======================= */
const initialNotifications: Notification[] = [
  {
    id: "n1",
    title: "Neural Nexus Active",
    message: "A new Brain Room has gone live: Future of Tourist Safety.",
    type: "info",
    time: "2 minutes ago",
    read: false,
  },
  {
    id: "n2",
    title: "Quantum Construct Stabilized",
    message: "Probability Engine reached 92% stability.",
    type: "success",
    time: "10 minutes ago",
    read: false,
  },
  {
    id: "n3",
    title: "Security Clearance Required",
    message: "Void Architecture requires Level 5 access.",
    type: "warning",
    time: "1 hour ago",
    read: true,
  },
  {
    id: "n4",
    title: "System Update",
    message: "Neural graph performance optimizations deployed.",
    type: "system",
    time: "Yesterday",
    read: true,
  },
];

/* =======================
   ICON MAP
======================= */
const typeIcon = {
  info: <Brain className="w-5 h-5 text-indigo-400" />,
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  system: <Zap className="w-5 h-5 text-purple-400" />,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-950/40 to-purple-950/30 text-white px-6 py-16">
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3">
              <Bell className="w-8 h-8 text-indigo-400" />
              Notifications
            </h1>
            <p className="text-white/60 mt-2">
              System alerts, neural activity, and quantum events
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
              Unread:{" "}
              <span className="text-indigo-400 font-bold">
                {unreadCount}
              </span>
            </div>
            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 transition"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="max-w-4xl mx-auto space-y-4">
        {notifications.length === 0 && (
          <div className="text-center py-20 text-white/60">
            <Shield className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
            No notifications detected.
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            className={`group relative rounded-2xl border border-white/10 backdrop-blur-xl p-6 transition ${
              n.read
                ? "bg-white/5"
                : "bg-gradient-to-r from-indigo-600/10 to-purple-600/10"
            }`}
          >
            <div className="flex gap-4 items-start">
              {/* ICON */}
              <div className="mt-1">{typeIcon[n.type]}</div>

              {/* CONTENT */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {n.title}
                  </h3>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    <Clock className="w-3 h-3" />
                    {n.time}
                  </span>
                </div>

                <p className="text-sm text-white/70 mt-1">
                  {n.message}
                </p>

                {/* ACTIONS */}
                <div className="flex gap-4 mt-4 text-sm">
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Eye className="w-4 h-4" />
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* UNREAD GLOW */}
            {!n.read && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-xl pointer-events-none" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
