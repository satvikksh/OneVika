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
import { Users, Loader2, Menu } from "lucide-react";

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

/* -------------------------------- HELPERS -------------------------------- */
const isValidObjectId = (id?: string) =>
  typeof id === "string" && id.length === 24;

const normalizeUsers = (users: any[]): User[] =>
  users
    .map((u) => {
      const id =
        typeof u._id === "string"
          ? u._id
          : u._id?.toString?.();

      return id ? { ...u, id } : null;
    })
    .filter(Boolean) as User[];

type ChatPageCache = {
  users: User[];
  selectedUserId: string | null;
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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
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

    const cachedUsers = chatPageCache?.users ?? [];
    if (cachedUsers.length > 0) {
      setUsers(cachedUsers);
      setLoadingUsers(false);
      return;
    }

    (async () => {
      try {
        setLoadingUsers(true);
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
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [status]);

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
    if (cachedSelection) {
      setSelectedUser(cachedSelection);
    }
  }, [users]);

  useEffect(() => {
    if (users.length === 0) return;
    chatPageCache = {
      users,
      selectedUserId: selectedUser?.id ?? null,
    };
  }, [users, selectedUser?.id]);

  useEffect(() => {
    const userIdFromRoute = searchParams.get("userId");
    if (!userIdFromRoute || !session?.user?.id) return;
    if (routeSelectionHandledRef.current) return;
    if (!isValidObjectId(userIdFromRoute)) return;

    const existing = users.find((u) => u.id === userIdFromRoute);
    if (existing) {
      setSelectedUser(existing);
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
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch messages");
        }

        // Push DB MESSAGES INTO SOCKET STATE
        addMessages(data.messages);
      } catch (err) {
        console.error("Fetch initial messages failed:", err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [session?.user?.id, addMessages]
  );

  useEffect(() => {
    if (!selectedUser?.id) return;
    if (loadedMessagesByUserRef.current.has(selectedUser.id)) return;

    loadedMessagesByUserRef.current.add(selectedUser.id);
    fetchInitialMessages(selectedUser.id);
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

    unreadIncoming.forEach((m) => markMessageAsRead(m.id));

    fetch(`/api/messages/by-user/${selectedUser.id}/read`, {
      method: "POST",
    }).catch((error) => {
      console.error("Failed to mark chat as read:", error);
    });
  }, [sortedMessages, selectedUser, currentUserId, markMessageAsRead]);

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

  /* ------------------------------ SEND MESSAGE ------------------------------ */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (
      !newMessage.trim() ||
      !selectedUser ||
      !currentUserId ||
      sendingMessage
    ) {
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    try {
      setSendingMessage(true);

      socketSendMessage({
        id: tempId,
        content: messageText,
        receiverId: selectedUser.id,
        senderId: currentUserId,
      });

      setNewMessage("");
      setReplyTo(null);
      setShowEmojiPicker(false);

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
  const handleDeleteMessage = async (message: Message) => {
    try {
      if (message.id.startsWith('temp_')) {
        removeMessage(message.id);
      } else {
        const response = await fetch(`/api/messages/by-message/${message.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || "Failed to delete message");
        }

        removeMessage(message.id);
        if (currentUserId) {
          emitMessageDelete({
            messageId: message.id,
            senderId: currentUserId,
            receiverId: message.receiverId,
          });
        }
      }
      
      // Remove from message status tracking
      setMessageStatus(prev => {
        const updated = { ...prev };
        delete updated[message.id];
        return updated;
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  };

  /* ---------------------------- CONTEXT MENU HANDLERS --------------------------- */
  const handleMessageContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    message: Message
  ) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX, clientY;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
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
        await navigator.clipboard.writeText(message.text || message.content || '');
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
        break;
      case "forward":
        alert("Forward functionality coming soon!");
        break;
      case "pin":
        try {
          await fetch(`/api/messages/by-message/${message.id}/pin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error pinning message:", error);
        }
        break;
      case "star":
        try {
          await fetch(`/api/messages/by-message/${message.id}/star`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error starring message:", error);
        }
        break;
      case "edit":
        const currentText = message.text || message.content || '';
        const newText = prompt("Edit your message:", currentText);
        if (newText !== null && newText !== currentText) {
          try {
            await fetch(`/api/messages/by-message/${message.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: newText }),
            });
          } catch (error) {
            console.error("Error editing message:", error);
          }
        }
        break;
      case "report":
        try {
          await fetch(`/api/messages/by-message/${message.id}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Inappropriate content" }),
          });
          alert("Message reported successfully");
        } catch (error) {
          console.error("Error reporting message:", error);
          alert("Failed to report message");
        }
        break;
      case "delete":
        if (window.confirm("Delete this message?\n\nThis action cannot be undone.")) {
          await handleDeleteMessage(message);
        }
        break;
      case "info":
        alert(`Message Info:\n\nID: ${message.id}\nSent: ${new Date(message.timestamp).toLocaleString()}\nStatus: ${message.status || 'unknown'}`);
        break;
    }
    setContextMenu(null);
  };

  /* ---------------------------- UI HANDLERS --------------------------- */
  const handleSelectUser = (user: User) => {
    if (!isValidObjectId(user.id)) {
      console.warn("Invalid user selection:", user);
      return;
    }

    setSelectedUser(user);
    setReplyTo(null);
    setContextMenu(null);
    setShowEmojiPicker(false);
    
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
    
    if (isMobile) {
      setShowMobileSidebar(true);
    }
  };

  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
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
    if (!currentUserId) return 0;
    
    const userMessages = socketMessages.filter(msg => 
      msg.senderId === userId && 
      msg.receiverId === currentUserId && 
      msg.status !== 'read' &&
      msg.read !== true
    );
    return userMessages.length;
  }, [socketMessages, currentUserId]);

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

      const ts = new Date(msg.timestamp).getTime();
      if (Number.isNaN(ts)) return;

      const prev = latestByUser.get(otherUserId) ?? 0;
      if (ts > prev) {
        latestByUser.set(otherUserId, ts);
      }
    });

    return [...users].sort((a, b) => {
      const aTs = latestByUser.get(a.id) ?? 0;
      const bTs = latestByUser.get(b.id) ?? 0;
      return bTs - aTs;
    });
  }, [users, socketMessages, currentUserId]);

  // Group consecutive messages from same sender
  const groupedMessages = sortedMessages.reduce((acc, msg, idx) => {
    const prevMsg = sortedMessages[idx - 1];
    const isGrouped = prevMsg && 
      prevMsg.senderId === msg.senderId && 
      new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 60000;
    
    acc.push({ ...msg, isGrouped });
    return acc;
  }, [] as (Message & { isGrouped?: boolean })[]);

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
