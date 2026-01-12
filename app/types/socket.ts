import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer, Socket } from "socket.io";

/* ---------------- TYPES ---------------- */

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export interface Message {
  id: string;
  text?: string;
  content?: string;
  senderId: string;
  receiverId: string;
  timestamp: string | Date;
  chatId?: string;
  conversationId?: string;
  read?: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
  type?: 'text' | 'image' | 'file';
  attachments?: string[];
  replyToId?: string;
  seenBy?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  typing?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- SOCKET SERVER INIT ---------------- */

export function initSocket(res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log("Socket.IO server already running");
    return res.socket.server.io;
  }

  console.log("🚀 Initializing Socket.IO server...");

  const io = new SocketIOServer(res.socket.server, {
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? ["https://onevika.vercel.app"] 
        : ["http://localhost:3001", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  res.socket.server.io = io;

  /* ---------------- SOCKET EVENTS ---------------- */

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    console.log("🟢 Socket connected:", socket.id, "User ID:", userId || 'Unknown');

    // Store user socket for reference
    socket.data.userId = userId;

    // Join user's personal room
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
      
      // Broadcast user is online
      socket.broadcast.emit("user_status", {
        userId,
        isOnline: true,
        socketId: socket.id
      });
    }

    /* -------------------- CUSTOM EVENTS -------------------- */
    
    /* USER JOINS SYSTEM */
    socket.on("join_user", (joinUserId: string) => {
      console.log(`📥 User ${joinUserId} joined via socket ${socket.id}`);
      socket.join(`user_${joinUserId}`);
      
      // Set user ID if not already set
      if (!socket.data.userId) {
        socket.data.userId = joinUserId;
      }
    });

    /* JOIN CHAT ROOM */
    socket.on("join_chat", (chatId: string) => {
      if (!chatId) {
        console.error("❌ No chatId provided for join_chat");
        return;
      }
      
      socket.join(chatId);
      console.log(`💬 Socket ${socket.id} joined chat: ${chatId}`);
    });

    /* LEAVE CHAT ROOM */
    socket.on("leave_chat", (chatId: string) => {
      socket.leave(chatId);
      console.log(`🚪 Socket ${socket.id} left chat: ${chatId}`);
    });

    /* SEND MESSAGE */
    socket.on("send_message", (message: Message) => {
      console.log("📨 Send message event received:", message);
      
      // Ensure message has required fields
      const fullMessage: Message = {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        // Ensure both text and content fields exist for compatibility
        text: message.text || message.content || '',
        content: message.content || message.text || '',
        chatId: message.chatId || message.conversationId,
        conversationId: message.conversationId || message.chatId,
      };
      
      const chatId = fullMessage.chatId;
      const receiverId = fullMessage.receiverId;
      
      if (!chatId) {
        console.error("❌ No chatId/conversationId in message");
        return;
      }
      
      console.log(`📤 Broadcasting message to chat ${chatId}:`, fullMessage.id);
      
      // Emit to sender for confirmation
      socket.emit("message_sent", {
        ...fullMessage,
        status: 'delivered'
      });
      
      // Send to receiver's personal room
      if (receiverId) {
        socket.to(`user_${receiverId}`).emit("receive_message", {
          ...fullMessage,
          status: 'delivered'
        });
      }
      
      // Send to the chat room
      socket.to(chatId).emit("receive_message", {
        ...fullMessage,
        status: 'delivered'
      });
    });

    /* MESSAGE READ */
    socket.on("mark_as_read", (data: { 
      messageId: string; 
      userId: string;
      chatId?: string;
      conversationId?: string;
    }) => {
      const { messageId, userId: markingUserId, chatId, conversationId } = data;
      const targetChatId = chatId || conversationId;
      
      console.log(`📖 Marking message ${messageId} as read by ${markingUserId} in chat ${targetChatId}`);
      
      if (targetChatId) {
        // Broadcast to chat room
        socket.to(targetChatId).emit("message_read", {
          messageId,
          userId: markingUserId,
          chatId: targetChatId,
          timestamp: new Date().toISOString()
        });
      }
    });

    /* TYPING INDICATOR */
    socket.on("typing", (data: { 
      userId: string; 
      chatId: string; 
      isTyping: boolean;
    }) => {
      const { userId: typingUserId, chatId, isTyping } = data;
      
      console.log(`⌨️ User ${typingUserId} ${isTyping ? 'is typing' : 'stopped typing'} in chat ${chatId}`);
      
      // Send typing indicator to everyone in chat except sender
      socket.to(chatId).emit("typing", {
        userId: typingUserId,
        chatId,
        isTyping
      });
    });

    /* DELETE MESSAGE */
    socket.on("delete_message", (data: { 
      messageId: string; 
      chatId: string;
    }) => {
      const { messageId, chatId } = data;
      
      console.log(`🗑️ Deleting message ${messageId} from chat ${chatId}`);
      
      socket.to(chatId).emit("message_deleted", {
        messageId,
        chatId
      });
    });

    /* GET ONLINE USERS */
    socket.on("get_online_users", () => {
      // This would typically query a database of online users
      // For now, we'll send back the user's own status
      if (userId) {
        socket.emit("online_users", [userId]);
      }
    });

    /* DISCONNECT */
    socket.on("disconnect", (reason: string) => {
      console.log("🔴 Socket disconnected:", socket.id, "Reason:", reason);
      
      const disconnectedUserId = socket.data.userId;
      
      if (disconnectedUserId) {
        // Broadcast user is offline
        socket.broadcast.emit("user_status", {
          userId: disconnectedUserId,
          isOnline: false,
          socketId: socket.id
        });
      }
    });

    /* ERROR HANDLING */
    socket.on("error", (error: any) => {
      console.error(`❌ Socket error from ${socket.id}:`, error);
    });
  });

  console.log("✅ Socket.IO server initialized successfully");
  return io;
}