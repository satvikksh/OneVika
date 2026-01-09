"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "../context/SocketContext";
import { Message, User } from "../types/socket";
import ChatSidebar from "./ChatSidebar";
import ChatTopBar from "./ChatTopBar";
import ChatArea from "./ChatArea";
import ContextMenu from "./ContextMenu";
import { Users, Loader2, Menu, MoreVertical, ChevronDown, Check, CheckCheck, Send, Paperclip, Smile } from "lucide-react";

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

export default function ChatPage() {
  const { data: session, status } = useSession();
  const { socket, isConnected, onlineUsers } = useSocket();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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

  // Message status tracking
  const [messageStatus, setMessageStatus] = useState<Record<string, 'sending' | 'sent' | 'delivered' | 'read'>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const isInputFocusedRef = useRef(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      !isValidObjectId(selectedUser.id) ||
      !session?.user?.id
    ) {
      return;
    }

    (async () => {
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/messages/by-user/${selectedUser.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch messages");
        }

        const fetchedMessages = data.messages || [];
        setMessages(fetchedMessages);
        
        // Initialize message statuses
        const statuses: Record<string, 'sending' | 'sent' | 'delivered' | 'read'> = {};
        fetchedMessages.forEach((msg: Message) => {
          if (msg.senderId === session.user.id) {
            // For messages we sent
            if (msg.read) {
              statuses[msg.id] = 'read';
            } else {
              statuses[msg.id] = 'delivered';
            }
          }
        });
        setMessageStatus(statuses);
      } catch (err) {
        console.error("Fetch messages failed:", err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    })();
  }, [selectedUser, session?.user?.id]);

  /* ------------------------------- SOCKET EVENTS ------------------------------ */
  useEffect(() => {
    if (!socket || !selectedUser || !session?.user?.id) return;

    socket.emit("join_conversation", {
      senderId: session.user.id,
      receiverId: selectedUser.id,
    });

    const handleReceiveMessage = (msg: Message) => {
      if (
        msg.senderId === selectedUser.id ||
        msg.receiverId === selectedUser.id
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleMessagesSeen = (ids: string[]) => {
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m))
      );
      
      // Update message status to 'read'
      setMessageStatus(prev => {
        const updated = { ...prev };
        ids.forEach(id => {
          if (updated[id]) {
            updated[id] = 'read';
          }
        });
        return updated;
      });
    };

    const handleMessageDelivered = (messageId: string) => {
      // Update message status to 'delivered'
      setMessageStatus(prev => ({
        ...prev,
        [messageId]: 'delivered'
      }));
    };

    const handleMessageDeleted = (deletedMessageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessageId));
      setMessageStatus(prev => {
        const updated = { ...prev };
        delete updated[deletedMessageId];
        return updated;
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("messages_seen", handleMessagesSeen);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [socket, selectedUser, session?.user?.id]);

  /* ----------------------------- MARK AS READ ----------------------------- */
  useEffect(() => {
    if (!selectedUser || !socket || messages.length === 0) return;

    const unseenIds = messages
      .filter((m) => m.senderId === selectedUser.id && !m.read)
      .map((m) => m.id);

    if (unseenIds.length === 0) return;

    setMessages((prev) =>
      prev.map((m) =>
        unseenIds.includes(m.id) ? { ...m, read: true } : m
      )
    );

    socket.emit("mark_seen", {
      conversationId: selectedUser.id,
      messageIds: unseenIds,
    });

    fetch(`/api/messages/by-user/${selectedUser.id}/read`, {
      method: "POST",
    }).catch(console.error);
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

    setIsTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        conversationId: selectedUser.id,
        userId: session.user.id,
        isTyping: false,
      });
      setIsTyping(false);
    }, 1000);
  }, [socket, selectedUser, session?.user?.id]);

  /* ---------------------------- HANDLE ENTER KEY ---------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isMobile && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', file);
      event.target.value = '';
    }
  };

  /* ------------------------------ SEND MESSAGE ------------------------------ */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (
      !newMessage.trim() ||
      !selectedUser ||
      !session?.user?.id ||
      sendingMessage
    )
      return;

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
        status: ""
    };

    try {
      setSendingMessage(true);
      setNewMessage("");
      setMessages((prev) => [...prev, optimisticMessage]);
      setReplyTo(null);
      setShowEmojiPicker(false);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = '44px';
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          receiverId: selectedUser.id,
          replyToId: replyTo?.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();

      if (data.message?.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? data.message : msg))
        );
        
        setMessageStatus(prev => ({
          ...prev,
          [data.message.id]: 'sent'
        }));

        // Remove temp status
        setMessageStatus(prev => {
          const updated = { ...prev };
          delete updated[tempId];
          return updated;
        });

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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, failed: true, error: "Failed to send" } : msg
        )
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /* ---------------------------- DELETE MESSAGE ---------------------------- */
  const handleDeleteMessage = async (message: Message) => {
    try {
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      
      if (!message.id.startsWith('temp-')) {
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

        if (socket && selectedUser) {
          socket.emit("delete_message", {
            messageId: message.id,
            conversationId: selectedUser.id,
          });
        }
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      setMessages((prev) => [...prev, message]);
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
    const y = rect.top - 10; // Position above the dropdown
    
    setContextMenu({
      message,
      position: { x, y },
    });
    setActiveDropdownId(null); // Close dropdown after clicking
  };

  const handleMenuAction = async (action: string, message: Message) => {
    switch (action) {
      case "reply":
        setReplyTo(message);
        inputRef.current?.focus();
        break;
      case "copy":
        await navigator.clipboard.writeText(message.text);
        if (isMobile && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
        break;
      case "forward":
        alert("Forward functionality coming soon!");
        break;
      case "pin":
        try {
        //   setMessages((prev) =>
        //     prev.map((msg) =>
        //       msg.id === message.id ? { ...msg, isPinned: !msg.isPinned } : msg
        //     )
        //   );
          
          await fetch(`/api/messages/by-message/${message.id}/pin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // body: JSON.stringify({ pinned: !message.isPinned }),
          });
        } catch (error) {
          console.error("Error pinning message:", error);
        }
        break;
      case "star":
        try {
        //   setMessages((prev) =>
        //     prev.map((msg) =>
        //       msg.id === message.id ? { ...msg, isStarred: !msg.isStarred } : msg
        //     )
        //   );
          
          await fetch(`/api/messages/by-message/${message.id}/star`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // body: JSON.stringify({ starred: !message.isStarred }),
          });
        } catch (error) {
          console.error("Error starring message:", error);
        }
        break;
      case "edit":
        const newText = prompt("Edit your message:", message.text);
        if (newText !== null && newText !== message.text) {
          try {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message.id ? { ...msg, text: newText, edited: true } : msg
              )
            );
            
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
        alert(`Message Info:\n\nID: ${message.id}\nSent: ${new Date(message.timestamp).toLocaleString()}\nStatus: ${message.read ? 'Read' : 'Delivered'}`);
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
    if (isMobile) {
      setIsNavbarHidden(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleInputBlur = () => {
    isInputFocusedRef.current = false;
    if (isMobile && !isTyping) {
      setTimeout(() => {
        if (!isInputFocusedRef.current) {
          setIsNavbarHidden(false);
        }
      }, 300);
    }
  };

  /* ----------------------------- SCROLL TO BOTTOM ----------------------------- */
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loadingMessages]);

  const getUnreadCount = (userId: string) =>
    messages.filter((m) => m.senderId === userId && !m.read).length;

  // Group consecutive messages from same sender
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const prevMsg = messages[idx - 1];
    const isGrouped = prevMsg && prevMsg.senderId === msg.senderId && 
      new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 60000;
    
    acc.push({ ...msg, isGrouped });
    return acc;
  }, [] as (Message & { isGrouped?: boolean })[]);

  /* ---------------------------- MESSAGE STATUS INDICATOR --------------------------- */
  const MessageStatusIndicator = ({ messageId, isCurrentUser }: { messageId: string, isCurrentUser: boolean }) => {
    const status = messageStatus[messageId];
    
    if (!isCurrentUser || !status) return null;

    return (
      <div className="flex items-center justify-end ml-2">
        {status === 'sending' && (
          <div className="flex items-center text-gray-400">
            <Check size={12} />
          </div>
        )}
        {status === 'sent' && (
          <div className="flex items-center text-gray-400">
            <Check size={12} />
          </div>
        )}
        {status === 'delivered' && (
          <div className="flex items-center text-gray-400">
            <CheckCheck size={12} />
          </div>
        )}
        {status === 'read' && (
          <div className="flex items-center text-blue-500">
            <CheckCheck size={12} />
          </div>
        )}
      </div>
    );
  };

  /* -------------------------------- LOADING -------------------------------- */
  if (status === "loading" || loadingUsers) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading chat...</p>
        </div>
      </div>
    );
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
          className="fixed top-20 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg lg:hidden"
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
          users={users}
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
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 pb-32">
            {selectedUser ? (
              loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedMessages.map((msg) => {
                    const isCurrentUser = msg.senderId === session?.user?.id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        <div className="relative group max-w-[70%]">
                          {/* Message Bubble */}
                          <div
                            className={`rounded-2xl px-4 py-3 ${
                              isCurrentUser
                                ? 'bg-purple-600 text-white rounded-br-none'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                            }`}
                            onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                          >
                            <div>{msg.text}</div>
                            
                            {/* Message timestamp and status */}
                            <div className="flex items-center justify-end mt-1">
                              <span className="text-xs opacity-75 mr-2">
                                {new Date(msg.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                   hour12: true 
                                })}
                                {/* {msg.edited && " (edited)"} */}
                              </span>
                              
                              {/* Read/unread indicators */}
                              {isCurrentUser && (
                                <MessageStatusIndicator messageId={msg.id} isCurrentUser={isCurrentUser} />
                              )}
                            </div>
                          </div>
                          
                          {/* Dropdown Arrow (only shows on hover) */}
                          {(hoveredMessageId === msg.id || activeDropdownId === msg.id) && (
                            <div 
                              ref={dropdownRef}
                              className={`absolute ${isCurrentUser ? 'left-0 -translate-x-8' : 'right-0 translate-x-8'} top-1/2 -translate-y-1/2`}
                            >
                              <button
                                onClick={(e) => handleDropdownClick(e, msg)}
                                className="p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
                                aria-label="Message options"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a chat to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Input Area at Bottom - FIXED POSITIONING */}
          {selectedUser && (
            <div className="fixed bottom-0 left-0 lg:left-80 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              {/* Reply Preview */}
              {replyTo && (
                <div className="px-4 pt-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-purple-200 dark:border-purple-800">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Replying to</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{replyTo.text}</p>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="ml-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              
              {/* Input Form with Sidebar - SEND BUTTON ON SIDE */}
              <div className="p-4">
                <div className="flex items-end space-x-3">
                  {/* Left Sidebar for additional actions */}
                  <div className="flex items-center space-x-2">
                    {/* File Upload */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    />
                    <button
                      type="button"
                      onClick={handleFileSelect}
                      className="p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label="Attach file"
                    >
                      <Paperclip size={20} />
                    </button>
                    
                    {/* Emoji Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Emoji"
                      >
                        <Smile size={20} />
                      </button>
                      
                      {showEmojiPicker && (
                        <div
                          ref={emojiPickerRef}
                          className="absolute bottom-full left-0 mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 w-105 z-50 animate-fadeIn"
                        >
                          <div className="grid grid-cols-5 gap-4">
                            {commonEmojis.map((emoji, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleEmojiClick(emoji)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-2xl w-12 h-12"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Text Area with Send Button on Side */}
                  <div className="flex-1 flex items-end space-x-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Type a message..."
                        className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{ minHeight: '30px', maxHeight: '50px' }}
                      />
                    </div>
                    
                    {/* Send Button on Side */}
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Desktop Hint */}
                {/* {!isMobile && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Press Enter to send • Shift+Enter for new line
                  </div>
                )} */}
              </div>
            </div>
          )}
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