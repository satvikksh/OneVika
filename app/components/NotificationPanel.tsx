"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Bell,
  Bot,
  CheckCheck,
  Crown,
  Heart,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneMissed,
  Reply,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useNotifications } from "@/app/context/NotificationContext";

type NotificationSender = {
  _id?: string;
  id?: string;
  name?: string;
  image?: string | null;
  avatar?: string | null;
};

export type OrbitNotification = {
  _id: string;
  senderId?: string | NotificationSender | null;
  type?: string;
  title?: string | null;
  message: string;
  url?: string | null;
  isRead?: boolean;
  createdAt: string | Date;
  callType?: "audio" | "video" | null;
};

type NotificationPanelProps = {
  compact?: boolean;
  className?: string;
  onNavigate?: () => void;
};

type FilterTab = "all" | "unread" | "mentions";

const tabs: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
];

const iconMap = {
  message: MessageSquare,
  follow: UserPlus,
  "follow-request": UserPlus,
  "follow-accepted": UserPlus,
  like: Heart,
  comment: MessageCircle,
  reply: Reply,
  mention: AtSign,
  story: Sparkles,
  "story-view": Sparkles,
  "story-reply": Reply,
  call: Phone,
  "audio-call": Phone,
  "video-call": Video,
  "missed-call": PhoneMissed,
  "group-invite": Users,
  premium: Crown,
  system: Bell,
  ai: Bot,
  thought: Sparkles,
};

const toneMap: Record<string, string> = {
  message: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  follow: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  like: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  comment: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  reply: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  mention: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  story: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  call: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  premium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  system: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  ai: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
};

const getSender = (notification: OrbitNotification) => {
  const sender = notification.senderId;
  return typeof sender === "object" && sender ? sender : null;
};

const getSenderId = (notification: OrbitNotification) => {
  const sender = notification.senderId;
  if (!sender) return "";
  return typeof sender === "string" ? sender : sender._id || sender.id || "";
};

const normalizeType = (notification: OrbitNotification) => {
  const message = notification.message.toLowerCase();
  if (notification.type === "call" && message.includes("missed")) return "missed-call";
  if (notification.type === "call" && notification.callType === "video") return "video-call";
  if (notification.type === "call") return "audio-call";
  if (message.includes("mention")) return "mention";
  if (message.includes("reply")) return notification.type === "story" ? "story-reply" : "reply";
  if (message.includes("request")) return "follow-request";
  if (message.includes("accepted")) return "follow-accepted";
  if (message.includes("group")) return "group-invite";
  return notification.type || "system";
};

const getTitle = (notification: OrbitNotification) => {
  if (notification.title?.trim()) return notification.title.trim();
  const type = normalizeType(notification);

  if (type === "missed-call") return "Missed Call";
  if (type === "video-call") return "Video Call";
  if (type === "audio-call") return "Audio Call";
  if (type === "message") return "New Message";
  if (type === "follow") return "New Follower";
  if (type === "follow-request") return "Follow Request";
  if (type === "follow-accepted") return "Follow Accepted";
  if (type === "like") return "New Like";
  if (type === "comment") return "New Comment";
  if (type === "reply") return "New Reply";
  if (type === "mention") return "Mention";
  if (type === "story-view") return "Story View";
  if (type === "story-reply") return "Story Reply";
  if (type === "premium") return "Premium";
  if (type === "ai" || type === "thought") return "Orbito AI";
  return "Notification";
};

const getToneKey = (type: string) => {
  if (type.includes("call")) return "call";
  if (type.startsWith("follow")) return "follow";
  if (type.startsWith("story")) return "story";
  if (type === "thought") return "ai";
  return type;
};

const relativeTime = (value: string | Date) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (!Number.isFinite(date.getTime())) return "";
  if (diffMs < minute) return "now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getGroupLabel = (value: string | Date) => {
  const date = new Date(value);
  const startOfDay = (input: Date) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const today = startOfDay(new Date());
  const notificationDay = startOfDay(date);
  const dayMs = 24 * 60 * 60 * 1000;

  if (notificationDay === today) return "Today";
  if (notificationDay === today - dayMs) return "Yesterday";
  if (notificationDay > today - 7 * dayMs) return "Earlier";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
};

const resolveNotificationUrl = (notification: OrbitNotification) => {
  if (typeof notification.url === "string" && notification.url.trim()) {
    return notification.url;
  }

  const senderId = getSenderId(notification);
  const type = normalizeType(notification);

  if (type.startsWith("follow") && senderId) return `/profile/${senderId}`;
  if (type.startsWith("story")) return "/feed";
  if (type === "message") return senderId ? `/chat?userId=${senderId}` : "/chat";
  if (type.includes("call")) return "/chat";
  if (type === "premium") return "/profile#premium-membership";
  if (type === "ai" || type === "thought") return "/neural-nexus";
  return "/notifications";
};

export default function NotificationPanel({
  compact = false,
  className = "",
  onNavigate,
}: NotificationPanelProps) {
  const router = useRouter();
  const { clearNotifications } = useNotifications();
  const [notifications, setNotifications] = useState<OrbitNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const addRealtimeNotification = useCallback((notification: OrbitNotification) => {
    if (!notification?._id && !notification?.message) return;

    const normalized = {
      ...notification,
      _id: notification._id || `local-${Date.now()}`,
      createdAt: notification.createdAt || new Date(),
      isRead: false,
    };

    setNotifications((prev) => {
      if (prev.some((item) => item._id === normalized._id)) return prev;
      return [normalized, ...prev];
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const data = await res.json();

        if (!active) return;
        setNotifications(Array.isArray(data) ? data : []);
      } catch {
        if (active) setNotifications([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      addRealtimeNotification(
        (event as CustomEvent<OrbitNotification>).detail
      );
    };

    window.addEventListener("orbitbyte:newNotification", handleRealtime);
    return () => {
      window.removeEventListener("orbitbyte:newNotification", handleRealtime);
    };
  }, [addRealtimeNotification]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((notification) => !notification.isRead);
    }

    if (activeTab === "mentions") {
      return notifications.filter((notification) => normalizeType(notification) === "mention");
    }

    return notifications;
  }, [activeTab, notifications]);

  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce<Array<{ label: string; items: OrbitNotification[] }>>(
      (groups, notification) => {
        const label = getGroupLabel(notification.createdAt);
        const existing = groups.find((group) => group.label === label);

        if (existing) {
          existing.items.push(notification);
        } else {
          groups.push({ label, items: [notification] });
        }

        return groups;
      },
      []
    );
  }, [filteredNotifications]);

  const markNotificationRead = async (notification: OrbitNotification) => {
    if (notification.isRead) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item._id === notification._id ? { ...item, isRead: true } : item
      )
    );
    window.dispatchEvent(
      new CustomEvent("orbitbyte:notificationRemoved", { detail: { count: 1 } })
    );

    try {
      await fetch(`/api/notifications/${notification._id}`, {
        method: "PATCH",
      });
    } catch {
      // Keep the optimistic read state; the next page load will reconcile.
    }
  };

  const handleNotificationClick = async (notification: OrbitNotification) => {
    await markNotificationRead(notification);
    const targetUrl = resolveNotificationUrl(notification);
    onNavigate?.();

    if (targetUrl !== "/notifications") {
      router.push(targetUrl);
    }
  };

  const handleMarkAllRead = async () => {
    const count = unreadCount;
    if (count === 0) return;

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
    clearNotifications();

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
    } catch {
      // Keep the optimistic state; the next fetch will reconcile.
    }
  };

  const handleDeleteNotification = async (
    event: MouseEvent<HTMLButtonElement>,
    notification: OrbitNotification
  ) => {
    event.stopPropagation();
    const wasUnread = !notification.isRead;
    setDismissingIds((prev) => new Set(prev).add(notification._id));

    window.setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((item) => item._id !== notification._id)
      );
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification._id);
        return next;
      });
    }, 180);

    if (wasUnread) {
      window.dispatchEvent(
        new CustomEvent("orbitbyte:notificationRemoved", { detail: { count: 1 } })
      );
    }

    try {
      await fetch(`/api/notifications/${notification._id}`, {
        method: "DELETE",
      });
    } catch {
      // The item is already removed locally for a snappy panel.
    }
  };

  return (
    <section
      className={`overflow-hidden border border-gray-200/80 bg-white shadow-2xl shadow-black/10 dark:border-gray-800 dark:bg-gray-950 ${compact ? "rounded-2xl" : "rounded-3xl"} ${className}`}
    >
      <div className="border-b border-gray-100 bg-white/95 p-4 dark:border-gray-800 dark:bg-gray-950/95">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-950">
              <Bell size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-gray-950 dark:text-white">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recent activity across OrbitByte
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            <CheckCheck size={14} />
            Mark All Read
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-full bg-gray-100 p-1 dark:bg-gray-900">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-9 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${compact ? "max-h-[28rem]" : "max-h-[calc(100dvh-14rem)]"} overflow-y-auto p-3`}>
        {loading ? (
          <div className="space-y-3 p-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"
              />
            ))}
          </div>
        ) : groupedNotifications.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-300">
              <Bell size={28} />
            </span>
            <h3 className="text-base font-bold text-gray-950 dark:text-white">
              No notifications yet
            </h3>
            <p className="mt-1 max-w-60 text-sm text-gray-500 dark:text-gray-400">
              New activity will appear here as soon as it arrives.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map((notification) => {
                    const type = normalizeType(notification);
                    const Icon = iconMap[type as keyof typeof iconMap] || Bell;
                    const sender = getSender(notification);
                    const avatar = sender?.image || sender?.avatar;
                    const tone = toneMap[getToneKey(type)] || toneMap.system;
                    const isDismissing = dismissingIds.has(notification._id);

                    return (
                      <div
                        key={notification._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => void handleNotificationClick(notification)}
                        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void handleNotificationClick(notification);
                          }
                        }}
                        className={`group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] ${
                          notification.isRead
                            ? "border-transparent bg-gray-50/80 dark:bg-gray-900/60"
                            : "border-sky-200 bg-sky-50/70 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/10"
                        } ${isDismissing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
                      >
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={sender?.name || "Notification sender"}
                            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-950"
                          />
                        ) : (
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
                            <Icon size={19} />
                          </span>
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-bold text-gray-950 dark:text-white">
                              {getTitle(notification)}
                            </span>
                            <span className="shrink-0 text-xs font-medium text-gray-400">
                              {relativeTime(notification.createdAt)}
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {notification.message}
                          </span>
                        </span>

                        <span className="flex shrink-0 flex-col items-center gap-3">
                          {!notification.isRead && (
                            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/40" />
                          )}
                          <button
                            type="button"
                            onClick={(event) => void handleDeleteNotification(event, notification)}
                            className="rounded-full p-1.5 text-gray-400 opacity-0 transition hover:bg-white hover:text-red-500 group-hover:opacity-100 dark:hover:bg-gray-800"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
