"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "../context/SocketContext";
import { Message, User } from "../types/socket";
import Image from "next/image";
import {
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  User as UserIcon,
  Users,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

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



const formatTime = (ts?: string) => {
  if (!ts) return "Just now";
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return "Just now";
  }
};

/* -------------------------------- MAIN COMPONENT -------------------------------- */

export default function ChatPage() {
  const { data: session, status } = useSession();
  const { socket, isConnected, onlineUsers } = useSocket();

  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleBackToUsers = () => {
  setSelectedUser(null);
  setShowMobileSidebar(true);
};


  /* ------------------------------- FETCH USERS ------------------------------- */

  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      try {
        setLoadingUsers(true);
        const res = await fetch("/api/user");
        
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

  /* ------------------------------ FETCH MESSAGES ----------------------------- */
useEffect(() => {
  if (
    !selectedUser ||
    typeof selectedUser.id !== "string" ||
    selectedUser.id.length !== 24 || // Mongo ObjectId length
    !session?.user?.id
  ) {
    return;
  }

  (async () => {
    try {
      setLoadingMessages(true);

      const res = await fetch(`/api/messages/${selectedUser.id}`);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch messages");
      }

      setMessages(data.messages || []);
    } catch (err) {
      console.error("Fetch messages failed:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  })();
}, [selectedUser, session?.user?.id]);



  /* ------------------------------- SOCKET EVENTS ------------------------------ */

 useEffect(() => {
  if (
    !socket ||
    !isValidObjectId(session?.user?.id) ||
    !isValidObjectId(selectedUser?.id)
  ) {
    return;
  }

  socket.emit("join_conversation", selectedUser?.id);

  // ✅ RECEIVE NEW MESSAGE
  socket.on("receive_message", (msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  });

  // ✅ SEEN STATUS UPDATE
  socket.on("messages_seen", (ids: string[]) => {
    setMessages((prev) =>
      prev.map((m) =>
        ids.includes(m.id) ? { ...m, read: true } : m
      )
    );
  });

  return () => {
    socket.off("receive_message");
    socket.off("messages_seen");
  };
}, [socket, selectedUser?.id, session?.user?.id]);


/* ----------------------------- MARK SEEN (REAL-TIME) ----------------------------- */

useEffect(() => {
  if (
    !socket ||
    !selectedUser ||
    !isValidObjectId(selectedUser.id) ||
    messages.length === 0
  ) {
    return;
  }

  // messages sent BY selectedUser that are NOT read yet
  const unseenIds = messages
    .filter(
      (m) =>
        m.senderId === selectedUser.id &&
        m.read === false &&
        typeof m.id === "string"
    )
    .map((m) => m.id);

  if (unseenIds.length === 0) return;

  // 🔔 Notify socket (real-time seen update)
  socket.emit("mark_seen", {
    conversationId: selectedUser.id,
    messageIds: unseenIds,
  });

  // 🔄 Persist seen status in DB
  fetch(`/api/messages/${selectedUser.id}/read`, {
    method: "POST",
  }).catch((err) => console.error("Mark seen failed:", err));
}, [messages, selectedUser, socket]);

  /* ------------------------------ ONLINE STATUS ------------------------------ */

  useEffect(() => {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        isOnline: onlineUsers.includes(u.id),
      }))
    );
  }, [onlineUsers]);

  /* ----------------------------- MARK AS READ ----------------------------- */

  const markMessagesAsRead = async (userId: string) => {
    try {
      await fetch(`/api/messages/${userId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      setMessages(prev => 
        prev.map(msg => 
          msg.senderId === userId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  /* -------------------------------- TYPING -------------------------------- */

  const handleTyping = useCallback(() => {
    if (!socket || !selectedUser || !session?.user?.id) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit("typing", {
      conversationId: selectedUser.id,
      userId: session.user.id,
      isTyping: true,
    });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        conversationId: selectedUser.id,
        userId: session.user.id,
        isTyping: false,
      });
    }, 1000);
  }, [socket, selectedUser, session?.user?.id]);

  /* ------------------------------ SEND MESSAGE ------------------------------ */

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !session?.user?.id || sendingMessage) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const optimisticMessage: Message = {
      id: tempId,
      text: messageText,
      senderId: session.user.id,
      receiverId: selectedUser.id,
      conversationId: selectedUser.id,
      timestamp: new Date().toISOString(),
      read: false,
    };

    try {
      setSendingMessage(true);
      setNewMessage("");

      setMessages(prev => [...prev, optimisticMessage]);

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          receiverId: selectedUser.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();

      if (data.message?.id) {
        setMessages(prev =>
          prev.map(msg => (msg.id === tempId ? data.message : msg))
        );

        if (socket) {
          socket.emit("send_message", {
            conversationId: selectedUser.id,
            message: data.message,
            sender: {
              id: session.user.id,
              name: session.user.name || "User",
              avatar: session.user.image || "",
            },
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev =>
        prev.map(msg => (msg.id === tempId ? { ...msg, failed: true } : msg))
      );
      alert("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  /* -------------------------------- SCROLL -------------------------------- */

useEffect(() => {
  if (messages.length > 0) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [messages.length]);


  /* -------------------------------- FILTER -------------------------------- */

  const filteredUsers = users.filter(
    (u) =>
      u &&
      u.id &&
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /* ----------------------------- UNREAD COUNT ----------------------------- */

 const getUnreadCount = (userId: string) =>
  messages.some(m => m.senderId === userId && !m.read) ? 1 : 0;


  /* --------------------------- SELECT USER --------------------------- */

  const handleSelectUser = (user: User) => {
  if (!isValidObjectId(user.id)) {
    console.warn("Blocked invalid user selection:", user);
    return;
  }

  setSelectedUser(user);
  setShowMobileSidebar(false);
};


  /* -------------------------------- LOADING -------------------------------- */

  if (status === "loading" || loadingUsers) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <Users className="h-16 w-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to Chat
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to start chatting
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------- UI -------------------------------- */

  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
      {/* SIDEBAR - Hidden on mobile when chat is open */}
      <aside className={`${
        showMobileSidebar ? 'flex' : 'hidden'
      } lg:flex w-full lg:w-80 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col h-full`}>
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {users.length}
              </span>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable Users List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No users found" : "No users available"}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              if (!user?.id) return null;

              const unreadCount = getUnreadCount(user.id);
              const isSelected = selectedUser?.id === user.id;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className={`w-full flex items-center gap-3 p-4 transition-colors ${
                    isSelected
                      ? "bg-purple-100 dark:bg-purple-900/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.name || "User"}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                    </div>
                    {user.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.name || "Unknown"}
                      </p>
                      {user.lastSeen && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(user.lastSeen)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email || ""}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded-full flex-shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Fixed Current User - Hidden on mobile */}
        {/* <div className="hidden lg:block flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                {session.user?.image ? (
                  <Image
                    src={session.user?.image}
                    alt={session.user?.name || "You"}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {session.user?.name || "You"}
                
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>
        </div> */}
      </aside>

      {/* CHAT AREA - Full screen on mobile when user selected */}
      <main className={`${
        !showMobileSidebar || selectedUser ? 'flex' : 'hidden'
      } lg:flex flex-1 flex-col h-full min-w-0`}>
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <Send className="w-24 h-24 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a user from the sidebar to start chatting
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* FIXED TOP BAR */}
            <div className="flex-shrink-0">
              <header className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={handleBackToUsers}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                      {selectedUser.avatar ? (
                        <Image
                          src={selectedUser.avatar}
                          alt={selectedUser.name}
                          width={40}
                          height={40}
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {selectedUser.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {selectedUser.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">
                      {selectedUser.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {typingUsers.has(selectedUser.id)
                        ? "typing..."
                        : selectedUser.isOnline
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Video size={20} />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Info size={20} />
                  </button>
                </div>
              </header>
            </div>

            {/* SCROLLABLE MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-gray-900">
              <div className="p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[50vh]">
                    <div className="text-center">
                      <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        No messages yet
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Start a conversation with {selectedUser.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    if (!m?.id) return null;
                    
                    const mine = m.senderId === session.user?.id;
                    
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                            mine
                              ? "bg-purple-600 text-white rounded-br-none"
                              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow-sm"
                          }`}
                        >
                          <p className="break-words">{m.text}</p>
                          <div className="text-xs mt-1 flex gap-1 items-center opacity-80">
                            <span>{formatTime(m.timestamp)}</span>
                            {mine &&
                              (m.read ? (
                                <CheckCheck size={12} className="text-blue-300" />
                              ) : (
                                <Check size={12} />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* FIXED MESSAGE INPUT */}
            <div className="flex-shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2"
              >
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                  disabled={sendingMessage}
                >
                  <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                <input
                  type="text"
                  className="flex-1 px-4 py-2 sm:py-3 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 dark:text-white disabled:opacity-50"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  disabled={sendingMessage}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                  disabled={sendingMessage}
                >
                  <Smile size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-purple-600 text-white p-2 sm:px-4 sm:py-3 rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex-shrink-0"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}