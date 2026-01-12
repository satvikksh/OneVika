"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import io, { type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

// Define Message interface
interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  chatId?: string;
  type?: 'text' | 'image' | 'file';
  status?: "sending" | "sent" | "delivered" | "read";
  seenBy?: string[];
}



interface SocketContextType {
  isConnected: boolean;
  onlineUsers: string[];
  messages: Message[];
  sendMessage: (message: Partial<Message>) => void;
  addMessages: (messages: Message[]) => void;
  markMessageAsRead: (messageId: string) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  clearMessages: () => void;
  markChatMessagesSeen: (chatId: string) => void;

}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  onlineUsers: [],
  messages: [],
  sendMessage: () => {},
   addMessages: () => {},
  markMessageAsRead: () => {},
  joinChat: () => {},
  leaveChat: () => {},
  clearMessages: () => {},
  markChatMessagesSeen: () => {},
});

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { data: session } = useSession();
  const socketRef = useRef<typeof Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const markChatMessagesSeen = useCallback((chatId: string) => {
  const socket = socketRef.current;
  if (!socket) return;

  socket.emit("messages_seen", { chatId });
}, []);


  // Function to send a message
 const sendMessage = useCallback((message: Partial<Message>) => {
  const socket = socketRef.current;

  if (!socket) {
    console.error("Socket not initialized yet");
    return;
  }

 const fullMessage: Message = {
  id: message.id ?? crypto.randomUUID(), // ✅ respect existing ID
  content: message.content ?? "",
  senderId: session?.user?.id!,
  receiverId: message.receiverId!,
  chatId: message.chatId,
  timestamp: message.timestamp ?? new Date(),
  status: "sent",
  type: "text",
};


  // 🔥 DO NOT CHECK isConnected
 if (!socket.connected) {
  console.warn("Socket not connected yet, message skipped");
  return;
}

socket.emit("send_message", fullMessage);


  // Optimistic UI update
  setMessages(prev => [...prev, fullMessage]);
}, [session?.user?.id]);


  // Function to mark a message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("mark_as_read", {
        messageId,
        userId: session?.user?.id,
      });
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' as const } : msg
      ));
    }
  }, [isConnected, session?.user?.id]);

  // Function to join a specific chat room
 const joinChat = useCallback((chatId: string) => {
  const socket = socketRef.current;
  if (!socket) return;

  if (socket.connected) {
    socket.emit("join_chat", chatId);
  } else {
    socket.once("connect", () => {
      socket.emit("join_chat", chatId);
    });
  }
}, []);


  // Function to leave a chat room
  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leave_chat", chatId);
    }
  }, [isConnected]);

  // Function to clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
const addMessages = useCallback((incoming: Message[]) => {
  setMessages(prev => {
    const existingIds = new Set(prev.map(m => m.id));
    return [
      ...incoming.filter(m => !existingIds.has(m.id)),
      ...prev,
    ];
  });
}, []);


  useEffect(() => {
    if (!session?.user?.id) return;

    if (!socketRef.current) {
   const socket = io("http://localhost:3001", {
  path: "/socket.io",
  transports: ["websocket"],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  forceNew: true,
  auth: {
    userId: session.user.id,
  },
});


      socketRef.current = socket;

      // Connection events
      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        setIsConnected(true);
        socket.emit("join_user", session.user.id);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

     socket.on("connect_error", (err: { message: any; }) => {
  console.error("❌ Socket connect_error:", err.message);
});


      // User status events
      socket.on("user_status", ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
        console.log("User status update:", userId, isOnline);
        setOnlineUsers((prev) =>
          isOnline
            ? [...new Set([...prev, userId])]
            : prev.filter((id) => id !== userId)
        );
      });

      // Message events
      socket.on("receive_message", (newMessage: Message) => {
        console.log("Received new message:", newMessage);
        
        // Check if message already exists (to avoid duplicates)
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          
          return [...prev, { ...newMessage, status: 'delivered' as const }];
        });
      });

      socket.on("message_sent", (message: Message) => {
        console.log("Message sent confirmation:", message);
        // Update the message status to delivered
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'delivered' as const } : msg
        ));
      });

      socket.on("message_read", ({ messageId, userId }: { messageId: string; userId: string }) => {
        console.log("Message read by:", userId);
        // Update message status to read if it's from current user
        setMessages(prev => prev.map(msg => 
          msg.id === messageId && msg.senderId === session.user.id 
            ? { ...msg, status: 'read' as const } 
            : msg
        ));
      });

      socket.on("typing", ({ userId, chatId, isTyping }: { userId: string; chatId: string; isTyping: boolean }) => {
        console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'} in chat ${chatId}`);
        // You can add typing indicator state here if needed
      });

      socket.on("error", (error: { message: string }) => {
        console.error("Socket error:", error.message);
      });

      
    
    }

   return () => {
  if (socketRef.current) {
    socketRef.current.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    setOnlineUsers([]);
    // ✅ KEEP messages
  }
};
  }, [session?.user?.id]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isConnected,
    onlineUsers,
    messages,
    sendMessage,
    addMessages,
    markMessageAsRead,
    joinChat,
    leaveChat,
    clearMessages,
    markChatMessagesSeen,
  }), [
    isConnected,
    onlineUsers,
    messages,
    sendMessage,
    addMessages,
    markMessageAsRead,
    joinChat,
    leaveChat,
    clearMessages,
    markChatMessagesSeen,
  ]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);