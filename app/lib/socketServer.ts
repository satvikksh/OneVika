// lib/socket-server.ts or app/lib/socket-server.ts
import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket } from "socket.io";

// Define interfaces for message handling
export interface Message {
  _id: string;
  id?: string;
  conversationId?: string;
  chatId?: string;
  senderId: string;
  receiverId: string;
  content?: string;
  text?: string;
  timestamp: Date | string;
  seenBy: string[];
  status?: "sending" | "sent" | "delivered" | "read";
  type?: 'text' | 'image' | 'file';
}

export interface SocketMessagePayload {
  conversationId?: string;
  chatId?: string;
  message: Message;
}

export interface SocketSeenPayload {
  conversationId?: string;
  chatId?: string;
  messageId: string;
  userId: string;
}

// Store active connections
const activeConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds
const userRooms = new Map<string, Set<string>>(); // userId -> Set of chatIds
const chatRooms = new Map<string, Set<string>>(); // chatId -> Set of socketIds

class SocketServer {
  private static instance: SocketServer;
  private io: IOServer | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }
    return SocketServer.instance;
  }

  public initialize(server: HTTPServer): IOServer {
    if (this.isInitialized && this.io) {
      return this.io;
    }

    console.log("🚀 Initializing Socket.IO server...");

    this.io = new IOServer(server, {
      path: "/api/socket",
      cors: {
         origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    this.isInitialized = true;
    
    console.log("✅ Socket.IO server initialized successfully");
    return this.io;
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      const userId = socket.handshake.query.userId as string;
      console.log(`🔌 New socket connection: ${socket.id} | User: ${userId || 'Unknown'}`);

      // Store user connection
      if (userId) {
        if (!activeConnections.has(userId)) {
          activeConnections.set(userId, new Set());
        }
        activeConnections.get(userId)!.add(socket.id);
        
        // Join user's personal room
        socket.join(`user_${userId}`);
        
        // Notify everyone about user online status
        this.io?.emit("user_status", {
          userId,
          isOnline: true,
          socketId: socket.id
        });
        
        console.log(`👤 User ${userId} is now online (${activeConnections.get(userId)!.size} connections)`);
      }

      // User joins the system
      socket.on("join_user", (joinUserId: string) => {
        console.log(`📥 User ${joinUserId} joined via socket ${socket.id}`);
        socket.join(`user_${joinUserId}`);
        
        // Notify about user's online status
        this.io?.emit("user_status", {
          userId: joinUserId,
          isOnline: true,
          socketId: socket.id
        });
      });

      // Join a specific chat room
      socket.on("join_chat", (chatId: string) => {
        if (!chatId) {
          console.error("❌ No chatId provided for join_chat");
          return;
        }
        
        socket.join(chatId);
        
        // Track user's chat rooms
        if (userId) {
          if (!userRooms.has(userId)) {
            userRooms.set(userId, new Set());
          }
          userRooms.get(userId)!.add(chatId);
        }
        
        // Track chat room members
        if (!chatRooms.has(chatId)) {
          chatRooms.set(chatId, new Set());
        }
        chatRooms.get(chatId)!.add(socket.id);
        
        console.log(`💬 Socket ${socket.id} joined chat: ${chatId}`);
      });

      // Leave a chat room
      socket.on("leave_chat", (chatId: string) => {
        socket.leave(chatId);
        
        // Remove from tracking
        if (userId) {
          userRooms.get(userId)?.delete(chatId);
        }
        chatRooms.get(chatId)?.delete(socket.id);
        
        console.log(`🚪 Socket ${socket.id} left chat: ${chatId}`);
      });

      // Send a message
     socket.on("send_message", (data, ack) => {
  try {
    const message = data.message || data;
    const chatId = message.chatId || message.conversationId;
    const receiverId = message.receiverId;

    if (!chatId) {
      ack?.({ ok: false, error: "Missing chatId" });
      return;
    }

    const fullMessage = {
      ...message,
      status: "delivered",
      timestamp: new Date().toISOString(),
    };

    socket.to(chatId).emit("receive_message", fullMessage);

    if (receiverId) {
      socket.to(`user_${receiverId}`).emit("receive_message", fullMessage);
    }

    socket.emit("message_sent", fullMessage);

    // 🔥 ACK BACK TO CLIENT
    ack?.({ ok: true });
  } catch (err) {
    ack?.({ ok: false, error: "send failed" });
  }
});


      // Mark message as read
      socket.on("mark_as_read", (payload: SocketSeenPayload) => {
        const { messageId, userId: markingUserId, chatId, conversationId } = payload;
        const targetChatId = chatId || conversationId;
        
        console.log(`📖 Marking message ${messageId} as read by ${markingUserId} in chat ${targetChatId}`);
        
        if (targetChatId) {
          socket.to(targetChatId).emit("message_read", {
            messageId,
            userId: markingUserId,
            chatId: targetChatId
          });
        }
      });

      // Typing indicator
      socket.on("typing", (data: { userId: string; chatId: string; isTyping: boolean }) => {
        const { userId: typingUserId, chatId, isTyping } = data;
        
        console.log(`⌨️ User ${typingUserId} ${isTyping ? 'is typing' : 'stopped typing'} in chat ${chatId}`);
        
        socket.to(chatId).emit("typing", {
          userId: typingUserId,
          chatId,
          isTyping
        });
      });

      // Get online users
      socket.on("get_online_users", () => {
        const onlineUserIds = Array.from(activeConnections.keys());
        socket.emit("online_users", onlineUserIds);
      });

      // Delete message
      socket.on("delete_message", (payload: { messageId: string; chatId: string }) => {
        const { messageId, chatId } = payload;
        
        console.log(`🗑️ Deleting message ${messageId} from chat ${chatId}`);
        
        socket.to(chatId).emit("message_deleted", {
          messageId,
          chatId
        });
      });

      // Disconnect handler
      socket.on("disconnect", (reason) => {
        console.log(`🔴 Socket disconnected: ${socket.id} | Reason: ${reason}`);
        
        // Remove socket from active connections
        if (userId) {
          const userSockets = activeConnections.get(userId);
          if (userSockets) {
            userSockets.delete(socket.id);
            
            // If user has no more connections, mark as offline
            if (userSockets.size === 0) {
              activeConnections.delete(userId);
              this.io?.emit("user_status", {
                userId,
                isOnline: false,
                socketId: socket.id
              });
              console.log(`👤 User ${userId} is now offline`);
            }
          }
        }
        
        // Remove socket from all chat rooms
        chatRooms.forEach((sockets, chatId) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            chatRooms.delete(chatId);
          }
        });
      });

      // Error handler
      socket.on("error", (error) => {
        console.error(`❌ Socket error from ${socket.id}:`, error);
      });
    });

    // Server-wide error handling
    this.io.engine.on("connection_error", (err) => {
      console.error("❌ Socket.IO connection error:", err);
    });
  }

  public getIO(): IOServer {
    if (!this.io) {
      throw new Error("Socket.IO server not initialized. Call initialize() first.");
    }
    return this.io;
  }

  public isReady(): boolean {
    return this.isInitialized && this.io !== null;
  }

  public getStats() {
    return {
      totalConnections: this.io?.engine.clientsCount || 0,
      activeUsers: activeConnections.size,
      chatRooms: chatRooms.size,
      userRooms: userRooms.size,
    };
  }
}

// Export singleton instance
export const socketServer = SocketServer.getInstance();

// For backward compatibility
export function initSocketServer(server: HTTPServer): IOServer {
  return socketServer.initialize(server);
}

export function getIO(): IOServer {
  return socketServer.getIO();
}