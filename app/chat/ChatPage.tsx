"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useSocket } from "../context/SocketContext";
import { Message, User } from "../types/socket";
import ChatSidebar from "./ChatSidebar";
import ChatTopBar from "./ChatTopBar";
import ChatArea from "./ChatArea";
import ContextMenu from "./ContextMenu";
import { readCachedChatState, writeCachedChatState } from "./chatLocalCache";
import { Users, Menu } from "lucide-react";
import { SecurityKey } from "../lib/securityQuestions";

type ChatPreferenceUpdate = {
  isPinned?: boolean;
  isArchived?: boolean;
  lock?: {
    enabled: boolean;
    password?: string;
    currentPassword?: string;
    visibility?: "blur" | "hidden";
    recovery?: {
      securityQuestion: SecurityKey;
      securityAnswer: string;
    };
  };
};

type UnlockChatResult = {
  success: boolean;
  error?: string;
};

type DeleteMessageScope = "self" | "everyone";
type ContextMenuTrigger =
  | React.MouseEvent
  | React.TouchEvent
  | { x: number; y: number };

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
} | null;

/* -------------------------------- SKELETON LOADER -------------------------------- */
const ChatSkeleton = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Top Bar Skeleton */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Placeholder */}
          <div className="lg:hidden w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR SKELETON (User List) 
           - Mobile: w-full (Takes full screen)
           - Desktop: w-80 (Fixed width)
        */}
        <div className="flex w-full lg:w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
             <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-3 w-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHAT AREA SKELETON 
           - Mobile: Hidden (hidden)
           - Desktop: Visible (lg:flex)
        */}
        <div className="hidden lg:flex flex-1 flex-col bg-gray-50 dark:bg-gray-950 relative">
          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* Incoming Message Skeleton */}
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0 mt-auto" />
              <div className="space-y-1">
                <div className="h-12 w-48 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-bl-none animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse ml-1" />
              </div>
            </div>

            {/* Outgoing Message Skeleton */}
            <div className="flex gap-3 max-w-[80%] ml-auto justify-end">
              <div className="space-y-1 items-end flex flex-col">
                <div className="h-16 w-64 bg-purple-100 dark:bg-purple-900/20 rounded-2xl rounded-br-none animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mr-1" />
              </div>
            </div>

            {/* Incoming Message Skeleton */}
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0 mt-auto" />
              <div className="space-y-1">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-bl-none animate-pulse" />
              </div>
            </div>
            
             {/* Outgoing Message Skeleton */}
             <div className="flex gap-3 max-w-[80%] ml-auto justify-end">
              <div className="space-y-1 items-end flex flex-col">
                <div className="h-10 w-40 bg-purple-100 dark:bg-purple-900/20 rounded-2xl rounded-br-none animate-pulse" />
              </div>
            </div>
          </div>

          {/* Input Area Skeleton */}
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({
  dialog,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  dialog: ConfirmDialogState;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!dialog) return null;

  const isDanger = dialog.tone !== "default";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close confirmation dialog"
      />
      <div className="relative z-[91] w-full max-w-md rounded-[28px] border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {dialog.title}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {dialog.description}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`rounded-2xl px-4 py-3 text-sm font-medium text-white transition disabled:opacity-60 ${
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Working..." : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------- HELPERS -------------------------------- */
const isValidObjectId = (id?: string) =>
  typeof id === "string" && id.length === 24;

type RawChatUser = Partial<User> & {
  _id?: string | { toString?: () => string };
};

const normalizeUsers = (users: RawChatUser[]): User[] =>
  users
    .map((u) => {
      const id =
        typeof u._id === "string"
          ? u._id
          : u._id?.toString?.();

      return id ? { ...u, id } : null;
    })
    .filter(Boolean) as User[];

const getMessageTimestamp = (message: Message) => {
  const rawTs = (message as Message & { createdAt?: string }).timestamp ?? (message as Message & { createdAt?: string }).createdAt;
  const ts = new Date(rawTs as string | Date).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

type ChatPageCache = {
  users: User[];
  selectedUserId: string | null;
};

type PendingAttachment = {
  file: File;
  previewUrl: string;
  type: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName: string;
  size: number;
};

let chatPageCache: ChatPageCache | null = null;

export default function ChatPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { 
    isConnected, 
    onlineUsers, 
    messages: socketMessages,
    sendMessage: socketSendMessage,
    removeMessage,
    emitMessageDelete,
    joinChat,
    leaveChat,
    markMessageAsRead,
    addMessages
  } = useSocket();

  // State
  const [users, setUsers] = useState<User[]>(() => chatPageCache?.users ?? []);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [typingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Chat UI state
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [deletingChatUserId, setDeletingChatUserId] = useState<string | null>(null);
  const [updatingChatUserId, setUpdatingChatUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  // Message status tracking - now tracked locally for UI
  const [messageStatus, setMessageStatus] = useState<Record<string, 'sending' | 'sent' | 'delivered' | 'read'>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const isInputFocusedRef = useRef(false);
  const chatAreaRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const textAreaObserverRef = useRef<MutationObserver | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedMessagesByUserRef = useRef<Set<string>>(new Set());
  const routeSelectionHandledRef = useRef(false);

  const mergeUserState = useCallback((userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              ...updates,
            }
          : user
      )
    );

    setSelectedUser((prev) =>
      prev?.id === userId
        ? {
            ...prev,
            ...updates,
          }
        : prev
    );
  }, []);

  const openConfirmDialog = useCallback((dialog: Exclude<ConfirmDialogState, null>) => {
    setConfirmDialog(dialog);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    if (isConfirmingAction) return;
    setConfirmDialog(null);
  }, [isConfirmingAction]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;

    try {
      setIsConfirmingAction(true);
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsConfirmingAction(false);
    }
  }, [confirmDialog]);

  /* ---------------------------- DISPATCH FOCUS EVENTS ---------------------------- */
  // Function to dispatch focus event to navbar
  const dispatchFocusEvent = useCallback((isFocused: boolean) => {
    const event = new CustomEvent('chatTextAreaFocus', { 
      detail: { isFocused } 
    });
    window.dispatchEvent(event);
  }, []);

  // Setup textarea focus/blur event listeners
  useEffect(() => {
    const setupTextAreaListeners = () => {
      const textAreas = document.querySelectorAll('textarea');
      
      const handleFocus = () => {
        dispatchFocusEvent(true);
        isInputFocusedRef.current = true;
      };
      
      const handleBlur = () => {
        dispatchFocusEvent(false);
        isInputFocusedRef.current = false;
      };

      textAreas.forEach(textarea => {
        textarea.addEventListener('focus', handleFocus);
        textarea.addEventListener('blur', handleBlur);
      });

      return () => {
        textAreas.forEach(textarea => {
          textarea.removeEventListener('focus', handleFocus);
          textarea.removeEventListener('blur', handleBlur);
        });
      };
    };

    // Initial setup
    const cleanup = setupTextAreaListeners();

    // Observe DOM changes for dynamically added textareas
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          cleanup();
          setupTextAreaListeners();
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    textAreaObserverRef.current = observer;

    // Cleanup on component unmount
    return () => {
      cleanup();
      if (textAreaObserverRef.current) {
        textAreaObserverRef.current.disconnect();
      }
      // Ensure navbar is shown when leaving chat
      dispatchFocusEvent(false);
    };
  }, [dispatchFocusEvent]);

  /* ---------------------------- DETECT MOBILE ---------------------------- */
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile && !selectedUser) {
        setShowMobileSidebar(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedUser]);

  /* ---------------------------- CLOSE DROPDOWN ON CLICK OUTSIDE ---------------------------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  /* ---------------------------- UPDATE SIDEBAR VISIBILITY ---------------------------- */
  useEffect(() => {
    if (isMobile) {
      if (selectedUser) {
        setShowMobileSidebar(false);
      } else {
        setShowMobileSidebar(true);
      }
    }
  }, [selectedUser, isMobile]);

  /* ---------------------------- HIDE NAVBAR ON SCROLL ---------------------------- */
  useEffect(() => {
    if (!isMobile || !selectedUser) return;

    const handleScroll = () => {
      const chatArea = chatAreaRef.current;
      if (!chatArea) return;

      const scrollTop = chatArea.scrollTop;
      const scrollDiff = scrollTop - lastScrollTopRef.current;
      
      if (scrollDiff > 10 && scrollTop > 100) {
        setIsNavbarHidden(true);
      } else if (scrollDiff < -10) {
        setIsNavbarHidden(false);
      }
      
      lastScrollTopRef.current = scrollTop;
    };

    const chatArea = chatAreaRef.current;
    if (chatArea) {
      chatArea.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (chatArea) {
        chatArea.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isMobile, selectedUser]);

  /* ---------------------------- CLOSE EMOJI PICKER ON CLICK OUTSIDE ---------------------------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  /* ------------------------------- FETCH USERS ------------------------------- */
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.id) return;

    const cachedUsers = chatPageCache?.users ?? [];
    const localCache = readCachedChatState(session.user.id);
    const localUsers = localCache?.users ?? [];

    if (cachedUsers.length > 0) {
      setUsers(cachedUsers);
      setLoadingUsers(false);
    } else if (localUsers.length > 0) {
      setUsers(localUsers);
      setLoadingUsers(false);
      chatPageCache = {
        users: localUsers,
        selectedUserId: localCache?.selectedUserId ?? null,
      };
    }

    (async () => {
      try {
        if (cachedUsers.length === 0 && localUsers.length === 0) {
          setLoadingUsers(true);
        }
        const res = await fetch("/api/user/chat");

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch users");
        }

        const data = await res.json();
        const normalized = normalizeUsers(data.users || []);
        setUsers(normalized);
      } catch (error) {
        console.error("Error fetching users:", error);
        if (cachedUsers.length === 0 && localUsers.length === 0) {
          setUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (!users.length) return;

    setUsers((prev) =>
      prev.map((user) => ({
        ...user,
        isOnline: onlineUsers.includes(user.id),
      }))
    );
  }, [onlineUsers]);

  useEffect(() => {
    if (!users.length) return;

    const selectedId = chatPageCache?.selectedUserId;
    if (!selectedId) return;

    const cachedSelection = users.find((u) => u.id === selectedId) ?? null;
    if (cachedSelection && (!cachedSelection.isLocked || cachedSelection.isUnlocked)) {
      setSelectedUser(cachedSelection);
    }
  }, [users]);

  useEffect(() => {
    if (users.length === 0) return;
    chatPageCache = {
      users,
      selectedUserId: selectedUser?.id ?? null,
    };
    if (session?.user?.id) {
      writeCachedChatState(session.user.id, {
        users,
        selectedUserId: selectedUser?.id ?? null,
        updatedAt: Date.now(),
      });
    }
  }, [users, selectedUser?.id, session?.user?.id]);

  useEffect(() => {
    if (!users.length) return;

    setUnreadByUser((prev) => {
      const next = { ...prev };
      users.forEach((user) => {
        if (typeof user.unreadCount === "number") {
          next[user.id] = user.unreadCount;
        } else if (!(user.id in next)) {
          next[user.id] = 0;
        }
      });
      return next;
    });
  }, [users]);

  useEffect(() => {
    const userIdFromRoute = searchParams.get("userId");
    if (!userIdFromRoute || !session?.user?.id) return;
    if (routeSelectionHandledRef.current) return;
    if (!isValidObjectId(userIdFromRoute)) return;

    const existing = users.find((u) => u.id === userIdFromRoute);
    if (existing) {
      if (!existing.isLocked || existing.isUnlocked) {
        setSelectedUser(existing);
      }
      routeSelectionHandledRef.current = true;
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/user/profile/${userIdFromRoute}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        const user = {
          id: data.id ?? data._id ?? userIdFromRoute,
          _id: data.id ?? data._id ?? userIdFromRoute,
          name: data.name ?? "Unknown",
          email: data.email ?? "",
          avatar: data.avatar ?? "",
          isPremium: Boolean(data.isPremium),
          isOnline: false,
          lastSeen: data.lastSeen ?? null,
        } as User;

        setUsers((prev) => {
          if (prev.some((u) => u.id === user.id)) return prev;
          return [user, ...prev];
        });
        setSelectedUser(user);
        routeSelectionHandledRef.current = true;
      } catch (error) {
        console.error("Failed to load chat target user:", error);
      }
    })();
  }, [searchParams, users, session?.user?.id]);

  /* ------------------------------- JOIN/LEAVE CHAT ROOMS ------------------------------- */
  useEffect(() => {
    if (!selectedUser || !session?.user?.id) return;

    const users = [session.user.id, selectedUser.id].sort();
    const chatId = `chat_${users[0]}_${users[1]}`;

    chatIdRef.current = chatId;
    joinChat(chatId);

    return () => {
      leaveChat(chatId);
    };
  }, [selectedUser?.id, session?.user?.id, joinChat, leaveChat]);

  /* ---------------------------- FETCH INITIAL MESSAGES ---------------------------- */
  const fetchInitialMessages = useCallback(
    async (userId: string) => {
      if (!session?.user?.id) return;

      try {
        setLoadingMessages(true);

        const res = await fetch(`/api/messages/by-user/${userId}`);
        const data = await res.json().catch(() => ({}));

        if (res.status === 423) {
          mergeUserState(userId, { isUnlocked: false });
          return false;
        }

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch messages");
        }

        addMessages(data.messages);
        return true;
      } catch (err) {
        console.error("Fetch initial messages failed:", err);
        return false;
      } finally {
        setLoadingMessages(false);
      }
    },
    [session?.user?.id, addMessages, mergeUserState]
  );

  useEffect(() => {
    if (!selectedUser?.id) return;
    if (loadedMessagesByUserRef.current.has(selectedUser.id)) return;

    let isMounted = true;

    (async () => {
      const didLoad = await fetchInitialMessages(selectedUser.id);

      if (!isMounted) return;

      if (didLoad) {
        loadedMessagesByUserRef.current.add(selectedUser.id);
        return;
      }

      loadedMessagesByUserRef.current.delete(selectedUser.id);
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedUser?.id, fetchInitialMessages]);

  /* ---------------------------- FILTER MESSAGES FOR SELECTED USER ---------------------------- */
  const currentUserId = session?.user?.id;
  
  // Filter messages for the selected user from SocketContext
  const filteredMessages = useMemo(
    () =>
      socketMessages.filter((msg) => {
        if (!selectedUser || !currentUserId) return false;

        return (
          (msg.senderId === currentUserId &&
            msg.receiverId === selectedUser.id) ||
          (msg.senderId === selectedUser.id &&
            msg.receiverId === currentUserId)
        );
      }),
    [socketMessages, selectedUser?.id, currentUserId]
  );

  // Sort messages by timestamp
  const sortedMessages = useMemo(
    () =>
      [...filteredMessages].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [filteredMessages]
  );

  /* ---------------------------- MARK MESSAGES AS READ ---------------------------- */
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    const unreadIncoming = sortedMessages.filter((m) => {
      const isIncoming =
        m.senderId === selectedUser.id && m.receiverId === currentUserId;
      const isRead = m.status === "read" || m.read === true;
      return isIncoming && !isRead;
    });

    if (unreadIncoming.length === 0) return;

    setUnreadByUser((prev) => ({ ...prev, [selectedUser.id]: 0 }));

    unreadIncoming.forEach((m) => markMessageAsRead(m.id));

    fetch(`/api/messages/by-user/${selectedUser.id}/read`, {
      method: "POST",
    }).catch((error) => {
      console.error("Failed to mark chat as read:", error);
    });
  }, [sortedMessages, selectedUser, currentUserId, markMessageAsRead]);

  useEffect(() => {
    const handleRealtimeMessage = (event: Event) => {
      const detail = (event as CustomEvent<Message>).detail;
      if (!detail || !currentUserId) return;
      if (detail.receiverId !== currentUserId) return;

      const senderId = detail.senderId;
      if (!senderId) return;

      const messageTs = new Date(detail.timestamp).toISOString();

      setUsers((prev) =>
        prev.map((user) =>
          user.id === senderId
            ? { ...user, lastMessageAt: messageTs }
            : user
        )
      );

      if (selectedUser?.id === senderId) return;

      setUnreadByUser((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] ?? 0) + 1,
      }));
    };

    window.addEventListener(
      "orbitbyte:newMessageNotification",
      handleRealtimeMessage as EventListener
    );

    return () => {
      window.removeEventListener(
        "orbitbyte:newMessageNotification",
        handleRealtimeMessage as EventListener
      );
    };
  }, [currentUserId, selectedUser?.id]);

  /* -------------------------------- TYPING -------------------------------- */
  const handleTyping = useCallback(() => {
    if (!selectedUser || !currentUserId || !chatIdRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [selectedUser, currentUserId]);

  /* ---------------------------- AUTO RESIZE TEXTAREA ---------------------------- */
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, []);

  /* ---------------------------- EMOJI HANDLING ---------------------------- */
  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const commonEmojis = ['😀', '😊', '😂', '❤️', '👍', '🙏', '🔥', '🎉', '🤔', '😎', '🥳', '😍', '🙌', '✨', '💯'];

  /* ---------------------------- FILE HANDLING ---------------------------- */
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearPendingAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileChange = useCallback((file: File | null) => {
    if (!file) return;

    setPendingAttachment((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      const mimeType = file.type || "application/octet-stream";
      const type = mimeType.startsWith("image/")
        ? "image"
        : mimeType.startsWith("video/")
          ? "video"
          : mimeType.startsWith("audio/")
            ? "audio"
            : "file";

      return {
        file,
        previewUrl: URL.createObjectURL(file),
        type,
        mimeType,
        fileName: file.name,
        size: file.size,
      };
    });

    setShowEmojiPicker(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  /* ------------------------------ SEND MESSAGE ------------------------------ */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (
      !selectedUser ||
      !currentUserId ||
      sendingMessage ||
      selectedUser.canMessage === false
    ) {
      return;
    }

    const messageText = newMessage.trim();
    if (!messageText && !pendingAttachment) {
      return;
    }
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    try {
      setSendingMessage(true);

      socketSendMessage({
        id: tempId,
        content: messageText,
        receiverId: selectedUser.id,
        senderId: currentUserId,
        replyToId: replyTo?.id,
        file: pendingAttachment?.file ?? null,
      });

      setNewMessage("");
      setReplyTo(null);
      setShowEmojiPicker(false);
      clearPendingAttachment();

      inputRef.current?.focus();
    } finally {
      setSendingMessage(false);
    }
  };

  /* ---------------------------- HANDLE ENTER KEY ---------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isMobile && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  /* ---------------------------- DELETE MESSAGE ---------------------------- */
  const removeMessagesForChat = useCallback(
    (chatUserId: string) => {
      if (!currentUserId) return;

      const relatedMessageIds = socketMessages
        .filter(
          (msg) =>
            (msg.senderId === currentUserId && msg.receiverId === chatUserId) ||
            (msg.senderId === chatUserId && msg.receiverId === currentUserId)
        )
        .map((msg) => msg.id);

      relatedMessageIds.forEach((id) => removeMessage(id));

      setMessageStatus((prev) => {
        if (relatedMessageIds.length === 0) return prev;

        const next = { ...prev };
        relatedMessageIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });

      setReplyTo((prev) =>
        prev && relatedMessageIds.includes(prev.id) ? null : prev
      );
    },
    [currentUserId, removeMessage, socketMessages]
  );

  const handleDeleteMessage = useCallback(
    async (message: Message, scope: DeleteMessageScope) => {
      try {
        if (message.id.startsWith("temp_")) {
          removeMessage(message.id);
        } else {
          const response = await fetch(
            `/api/messages/by-message/${message.id}?scope=${scope}`,
            {
              method: "DELETE",
            }
          );

          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error || "Failed to delete message");
          }

          removeMessage(message.id);

          if (scope === "everyone" && currentUserId) {
            emitMessageDelete({
              messageId: message.id,
              senderId: currentUserId,
              receiverId: message.receiverId,
            });
          }
        }

        setReplyTo((prev) => (prev?.id === message.id ? null : prev));
        setMessageStatus((prev) => {
          const updated = { ...prev };
          delete updated[message.id];
          return updated;
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        alert("Failed to delete message. Please try again.");
      }
    },
    [currentUserId, emitMessageDelete, removeMessage]
  );

  /* ---------------------------- CONTEXT MENU HANDLERS --------------------------- */
  const handleMessageContextMenu = (
    trigger: ContextMenuTrigger,
    message: Message
  ) => {
    let clientX: number;
    let clientY: number;

    if ("preventDefault" in trigger) {
      trigger.preventDefault();
    }

    if ("stopPropagation" in trigger) {
      trigger.stopPropagation();
    }

    if ("x" in trigger && "y" in trigger) {
      clientX = trigger.x;
      clientY = trigger.y;
    } else if ("touches" in trigger) {
      const touch = trigger.touches[0] ?? trigger.changedTouches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = trigger.clientX;
      clientY = trigger.clientY;
    }

    setContextMenu({
      message,
      position: { x: clientX, y: clientY },
    });
  };

  const handleDropdownClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calculate position to show context menu at the top
    const x = rect.left + rect.width / 2;
    const y = rect.top - 10;
    
    setContextMenu({
      message,
      position: { x, y },
    });
    setActiveDropdownId(null);
  };

  const handleMenuAction = async (action: string, message: Message) => {
    switch (action) {
      case "reply":
        setReplyTo(message);
        inputRef.current?.focus();
        break;
      case "copy":
        await navigator.clipboard.writeText(message.text || message.content || "");
        if (isMobile && "vibrate" in navigator) {
          navigator.vibrate(30);
        }
        break;
      case "copyLink": {
        if (!currentUserId) break;
        const chatUserId =
          message.senderId === currentUserId ? message.receiverId : message.senderId;
        const link = `${window.location.origin}/chat?userId=${chatUserId}#message-${message.id}`;
        await navigator.clipboard.writeText(link);
        break;
      }
      case "download": {
        const attachment = message.attachments?.[0];
        if (!attachment?.url) break;

        const link = document.createElement("a");
        link.href = attachment.url;
        link.download = attachment.fileName || "download";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
        break;
      }
      case "deleteSelf":
        openConfirmDialog({
          title: "Delete message for you?",
          description:
            "This message will be removed from your view only and can’t be recovered here.",
          confirmLabel: "Delete for me",
          tone: "danger",
          onConfirm: async () => {
            await handleDeleteMessage(message, "self");
          },
        });
        break;
      case "deleteEveryone":
        openConfirmDialog({
          title: "Delete message for everyone?",
          description:
            "This removes the message for both people. This action can’t be undone.",
          confirmLabel: "Delete for everyone",
          tone: "danger",
          onConfirm: async () => {
            await handleDeleteMessage(message, "everyone");
          },
        });
        break;
    }
    setContextMenu(null);
  };

  /* ---------------------------- UI HANDLERS --------------------------- */
  const updateChatPreferences = useCallback(
    async (user: User, updates: ChatPreferenceUpdate) => {
      if (!user?.id) return;

      try {
        setUpdatingChatUserId(user.id);

        const response = await fetch(`/api/messages/by-user/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to update chat preferences");
        }

        mergeUserState(user.id, data.preference ?? {});
      } finally {
        setUpdatingChatUserId(null);
      }
    },
    [mergeUserState]
  );

  const handleUnlockChat = useCallback(
    async (user: User, password: string): Promise<UnlockChatResult> => {
      if (!user?.id) {
        return { success: false, error: "Invalid chat selection" };
      }

      try {
        setUpdatingChatUserId(user.id);

        const response = await fetch(`/api/messages/by-user/${user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Failed to unlock chat",
          };
        }

        mergeUserState(user.id, data.preference ?? { isUnlocked: true });
        loadedMessagesByUserRef.current.delete(user.id);

        return { success: true };
      } catch (error) {
        console.error("Failed to unlock chat:", error);
        return { success: false, error: "Failed to unlock chat" };
      } finally {
        setUpdatingChatUserId(null);
      }
    },
    [mergeUserState]
  );

  const handleRemoveLock = useCallback(
    async (user: User, password: string) => {
      await updateChatPreferences(user, {
        lock: {
          enabled: false,
          password,
        },
      });
    },
    [updateChatPreferences]
  );

  const handleArchiveChat = useCallback(
    async (user: User, nextArchived = !user.isArchived) => {
      try {
        await updateChatPreferences(user, { isArchived: nextArchived });
      } catch (error) {
        console.error("Failed to update archive state:", error);
        alert("Failed to update this chat. Please try again.");
      }
    },
    [updateChatPreferences]
  );

  const handleBlockUser = useCallback(
    (user: User) => {
      if (!user?.id) return;

      openConfirmDialog({
        title: `Block ${user.name || "this user"}?`,
        description:
          "You won’t be able to send messages in this chat until the user is unblocked.",
        confirmLabel: "Block user",
        tone: "danger",
        onConfirm: async () => {
          try {
            setUpdatingChatUserId(user.id);

            const response = await fetch(`/api/user/profile/${user.id}`, {
              method: "POST",
            });
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
            };

            if (!response.ok) {
              throw new Error(data.error || "Failed to block user");
            }

            mergeUserState(user.id, {
              isBlocked: true,
              isBlockedByCurrentUser: true,
              canMessage: false,
            });
          } catch (error) {
            console.error("Failed to block user:", error);
            alert("Failed to block this user. Please try again.");
          } finally {
            setUpdatingChatUserId(null);
          }
        },
      });
    },
    [mergeUserState, openConfirmDialog]
  );

  const handleUnblockUser = useCallback(
    (user: User) => {
      if (!user?.id) return;

      openConfirmDialog({
        title: `Unblock ${user.name || "this user"}?`,
        description:
          "This restores messaging only if the other user has not blocked you.",
        confirmLabel: "Unblock user",
        tone: "default",
        onConfirm: async () => {
          try {
            setUpdatingChatUserId(user.id);

            const response = await fetch(`/api/user/profile/${user.id}`, {
              method: "DELETE",
            });
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
            };

            if (!response.ok) {
              throw new Error(data.error || "Failed to unblock user");
            }

            mergeUserState(user.id, {
              isBlockedByCurrentUser: false,
              isBlocked: Boolean(user.hasBlockedCurrentUser),
              canMessage: !user.hasBlockedCurrentUser,
            });
          } catch (error) {
            console.error("Failed to unblock user:", error);
            alert("Failed to unblock this user. Please try again.");
          } finally {
            setUpdatingChatUserId(null);
          }
        },
      });
    },
    [mergeUserState, openConfirmDialog]
  );

  const handleClearChat = useCallback(
    (user: User) => {
      if (!user?.id) return;

      openConfirmDialog({
        title: "Clear all chat messages?",
        description:
          "This will permanently remove every message in this chat for you.",
        confirmLabel: "Clear chat",
        tone: "danger",
        onConfirm: async () => {
          try {
            setDeletingChatUserId(user.id);

            const response = await fetch(`/api/messages/by-user/${user.id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scope: "messages" }),
            });
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
            };

            if (!response.ok) {
              throw new Error(data.error || "Failed to clear chat");
            }

            removeMessagesForChat(user.id);
            mergeUserState(user.id, {
              lastMessageAt: null,
              unreadCount: 0,
            });
            setUnreadByUser((prev) => ({ ...prev, [user.id]: 0 }));
            setContextMenu(null);
            setReplyTo(null);
          } catch (error) {
            console.error("Failed to clear chat:", error);
            alert("Failed to clear this chat. Please try again.");
          } finally {
            setDeletingChatUserId(null);
          }
        },
      });
    },
    [mergeUserState, openConfirmDialog, removeMessagesForChat]
  );

  const handleSelectUser = (user: User) => {
    if (!isValidObjectId(user.id)) {
      console.warn("Invalid user selection:", user);
      return;
    }

    if (user.isLocked && !user.isUnlocked) {
      return;
    }

    // Clear unread badge immediately when opening a chat.
    if (currentUserId) {
      const unreadForUser = socketMessages.filter((msg) => {
        const isIncoming =
          msg.senderId === user.id && msg.receiverId === currentUserId;
        const isRead = msg.status === "read" || msg.read === true;
        return isIncoming && !isRead;
      });

      if (unreadForUser.length > 0) {
        unreadForUser.forEach((msg) => markMessageAsRead(msg.id));
        fetch(`/api/messages/by-user/${user.id}/read`, {
          method: "POST",
        }).catch((error) => {
          console.error("Failed to mark chat as read:", error);
        });
      }

      setUnreadByUser((prev) => ({ ...prev, [user.id]: 0 }));
    }

    setSelectedUser(user);
    setReplyTo(null);
    setContextMenu(null);
    setShowEmojiPicker(false);
    clearPendingAttachment();
    
    if (isMobile) {
      setShowMobileSidebar(false);
    }
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setReplyTo(null);
    setContextMenu(null);
    setShowEmojiPicker(false);
    clearPendingAttachment();
    
    if (isMobile) {
      setShowMobileSidebar(true);
    }
  };

  const handleDeleteChat = useCallback(
    async (user: User) => {
      if (!user?.id) return;
      openConfirmDialog({
        title: `Delete chat with ${user.name || "this user"}?`,
        description:
          "This permanently removes the conversation, messages, and saved chat controls.",
        confirmLabel: "Delete chat",
        tone: "danger",
        onConfirm: async () => {
          try {
            setDeletingChatUserId(user.id);

            const response = await fetch(`/api/messages/by-user/${user.id}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scope: "conversation" }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data.error || "Failed to delete chat");
            }

            removeMessagesForChat(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setUnreadByUser((prev) => {
              const next = { ...prev };
              delete next[user.id];
              return next;
            });
            loadedMessagesByUserRef.current.delete(user.id);

            if (selectedUser?.id === user.id) {
              setSelectedUser(null);
              setReplyTo(null);
              setContextMenu(null);
              clearPendingAttachment();
              if (isMobile) {
                setShowMobileSidebar(true);
              }
            }
          } catch (error) {
            console.error("Failed to delete chat:", error);
            alert("Failed to delete chat. Please try again.");
          } finally {
            setDeletingChatUserId(null);
          }
        },
      });
    },
    [
      clearPendingAttachment,
      isMobile,
      openConfirmDialog,
      removeMessagesForChat,
      selectedUser?.id,
    ]
  );

  const toggleMobileSidebar = () => {
    setShowMobileSidebar((prev) => !prev);
  };

  /* ----------------------------- INPUT FOCUS HANDLERS ----------------------------- */
  const handleInputFocus = () => {
    isInputFocusedRef.current = true;
    // Dispatch focus event for navbar
    dispatchFocusEvent(true);
    
    if (isMobile) {
      setIsNavbarHidden(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleInputBlur = () => {
    isInputFocusedRef.current = false;
    
    // Clear any pending focus timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    
    // Delay blur event to handle quick taps
    focusTimeoutRef.current = setTimeout(() => {
      if (!isInputFocusedRef.current) {
        // Dispatch blur event for navbar
        dispatchFocusEvent(false);
        
        if (isMobile && !isTyping) {
          setIsNavbarHidden(false);
        }
      }
    }, 100);
  };

  /* ----------------------------- SCROLL TO BOTTOM ----------------------------- */
  useEffect(() => {
    if (sortedMessages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [sortedMessages]);

  /* ---------------------------- GET UNREAD COUNT ---------------------------- */
  const getUnreadCount = useCallback((userId: string) => {
    if (selectedUser?.id === userId) return 0;
    return unreadByUser[userId] ?? 0;
  }, [unreadByUser, selectedUser?.id]);

  const usersSortedByRecentMessage = useMemo(() => {
    if (!currentUserId) return users;

    const latestByUser = new Map<string, number>();

    socketMessages.forEach((msg) => {
      let otherUserId: string | null = null;
      if (msg.senderId === currentUserId) {
        otherUserId = msg.receiverId;
      } else if (msg.receiverId === currentUserId) {
        otherUserId = msg.senderId;
      }

      if (!otherUserId) return;

      const ts = getMessageTimestamp(msg);
      if (ts <= 0) return;

      const prev = latestByUser.get(otherUserId) ?? 0;
      if (ts > prev) {
        latestByUser.set(otherUserId, ts);
      }
    });

    return [...users].sort((a, b) => {
      const aArchived = Number(Boolean(a.isArchived));
      const bArchived = Number(Boolean(b.isArchived));
      if (aArchived !== bArchived) return aArchived - bArchived;

      const aPinned = Number(Boolean(a.isPinned));
      const bPinned = Number(Boolean(b.isPinned));
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aUnread = unreadByUser[a.id] ?? a.unreadCount ?? 0;
      const bUnread = unreadByUser[b.id] ?? b.unreadCount ?? 0;

      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;

      const aInitialTs = a.lastMessageAt
        ? new Date(a.lastMessageAt).getTime()
        : 0;
      const bInitialTs = b.lastMessageAt
        ? new Date(b.lastMessageAt).getTime()
        : 0;

      const aTs = Math.max(latestByUser.get(a.id) ?? 0, aInitialTs);
      const bTs = Math.max(latestByUser.get(b.id) ?? 0, bInitialTs);
      if (aTs !== bTs) return bTs - aTs;

      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [users, socketMessages, currentUserId, unreadByUser]);

  /* -------------------------------- LOADING -------------------------------- */
  // UPDATED: Using the new ChatSkeleton instead of the spinner
  if (status === "loading" || loadingUsers) {
    return <ChatSkeleton />;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <Users className="h-16 w-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to Chat
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to start chatting with your contacts
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl active:scale-95 font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Mobile Sidebar Toggle Button */}
      {isMobile && !selectedUser && (
        <button
          onClick={toggleMobileSidebar}
          className="fixed top-12 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg lg:hidden"
          aria-label="Open chats"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Fixed Chat Top Bar */}
      <ChatTopBar
        selectedUser={selectedUser}
        onBack={handleBackToUsers}
        typingUsers={typingUsers}
        isMobile={isMobile}
        isNavbarHidden={isNavbarHidden}
        onClearChat={() => {
          if (selectedUser) {
            handleClearChat(selectedUser);
          }
        }}
        onDeleteChat={() => {
          if (selectedUser) {
            void handleDeleteChat(selectedUser);
          }
        }}
        onArchiveChat={() => {
          if (selectedUser) {
            void handleArchiveChat(selectedUser);
          }
        }}
        onBlockUser={() => {
          if (selectedUser) {
            handleBlockUser(selectedUser);
          }
        }}
        onUnblockUser={() => {
          if (selectedUser) {
            handleUnblockUser(selectedUser);
          }
        }}
        isActionBusy={Boolean(
          selectedUser &&
            (deletingChatUserId === selectedUser.id ||
              updatingChatUserId === selectedUser.id)
        )}
      />

      {/* Main Content Area */}
      <div className="flex h-full pt-16">
        {/* Sidebar */}
        <ChatSidebar
          users={usersSortedByRecentMessage}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          loadingUsers={loadingUsers}
          isConnected={isConnected}
          onlineUsers={onlineUsers}
          typingUsers={typingUsers}
          getUnreadCount={getUnreadCount}
          onDeleteChat={handleDeleteChat}
          onArchiveChat={handleArchiveChat}
          onPinChat={(user, nextPinned) =>
            updateChatPreferences(user, { isPinned: nextPinned })
          }
          onLockChat={(user, lockDetails) =>
            updateChatPreferences(user, {
              lock: {
                enabled: true,
                password: lockDetails.password,
                currentPassword: lockDetails.currentPassword,
                visibility: lockDetails.visibility,
              },
            })
          }
          onRecoverLock={(user, recovery) =>
            updateChatPreferences(user, {
              lock: {
                enabled: true,
                password: recovery.password,
                visibility: recovery.visibility,
                recovery: {
                  securityQuestion: recovery.securityQuestion,
                  securityAnswer: recovery.securityAnswer,
                },
              },
            })
          }
          onRemoveLock={handleRemoveLock}
          onUnlockChat={handleUnlockChat}
          deletingChatUserId={deletingChatUserId}
          updatingChatUserId={updatingChatUserId}
          isMobile={isMobile}
          showMobileSidebar={showMobileSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
        />

        {/* Chat Area with Scrollable Messages and Fixed Input */}
        <div 
          ref={chatAreaRef} 
          className={`flex-1 flex flex-col h-full transition-all duration-300 ${
            isMobile && showMobileSidebar ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Use ChatArea Component */}
          <ChatArea
            selectedUser={selectedUser}
            loadingMessages={loadingMessages}
            messages={sortedMessages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            sendingMessage={sendingMessage}
            onSendMessage={handleSendMessage}
            handleTyping={handleTyping}
            handleInputFocus={handleInputFocus}
            handleInputBlur={handleInputBlur}
            inputRef={inputRef}
            fileInputRef={fileInputRef}
            handleFileSelect={handleFileSelect}
            handleFileChange={handleFileChange}
            pendingAttachment={pendingAttachment}
            clearPendingAttachment={clearPendingAttachment}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            emojiPickerRef={emojiPickerRef}
            handleEmojiClick={handleEmojiClick}
            commonEmojis={commonEmojis}
            handleMessageContextMenu={handleMessageContextMenu}
            handleDropdownClick={handleDropdownClick}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            messagesEndRef={messagesEndRef}
            hoveredMessageId={hoveredMessageId}
            setHoveredMessageId={setHoveredMessageId}
            activeDropdownId={activeDropdownId}
            setActiveDropdownId={setActiveDropdownId}
            dropdownRef={dropdownRef}
            session={session}
            messageStatus={messageStatus}
            isMobile={isMobile}
            handleKeyDown={handleKeyDown}
            isChatBlocked={Boolean(selectedUser?.isBlocked)}
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          message={contextMenu.message}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onAction={handleMenuAction}
          isCurrentUser={contextMenu.message.senderId === session?.user?.id}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog
        dialog={confirmDialog}
        isSubmitting={isConfirmingAction}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmAction}
      />

      {/* Global Styles */}
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 2px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
