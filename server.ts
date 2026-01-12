import { createServer } from "http";
import { Server, Socket } from "socket.io";

/* -------------------- TYPES -------------------- */
type TempMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  chatId: string;
  timestamp: number;
  seen: boolean;
};

/* -------------------- CONFIG -------------------- */
const PORT = 3001;
const TEMP_TTL = 24 * 60 * 60 * 1000; // 24 hours

/* -------------------- IN-MEMORY STORES -------------------- */

// userId -> socketIds
const activeConnections = new Map<string, Set<string>>();

// userId -> temp messages
const tempMessages = new Map<string, TempMessage[]>();

/* -------------------- SERVER -------------------- */
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://onevika.vercel.app"],
    credentials: true,
  },
  transports: ["websocket"], // 🔥 important
});

/* -------------------- CLEANUP TIMER (TTL) -------------------- */
setInterval(() => {
  const now = Date.now();

  for (const [userId, messages] of tempMessages.entries()) {
    const valid = messages.filter(
      m => now - m.timestamp < TEMP_TTL
    );

    if (valid.length === 0) {
      tempMessages.delete(userId);
    } else {
      tempMessages.set(userId, valid);
    }
  }
}, 60 * 1000); // every 1 minute

/* -------------------- SOCKET LOGIC -------------------- */
io.on("connection", (socket: Socket) => {
  const userId = socket.handshake.query.userId as string;

  console.log("✅ Socket connected:", socket.id, "User:", userId);

  /* -------- Register user -------- */
  if (userId) {
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId)!.add(socket.id);

    socket.join(`user_${userId}`);

    // 🔥 Send stored messages (if any)
    const stored = tempMessages.get(userId);
    if (stored && stored.length > 0) {
      socket.emit("initial_messages", stored);
    }
  }

  /* -------- Send Message -------- */
  socket.on("send_message", (message: TempMessage) => {
    const receiverSockets = activeConnections.get(message.receiverId);

    const fullMessage: TempMessage = {
      ...message,
      timestamp: Date.now(),
      seen: false,
    };

    if (!receiverSockets || receiverSockets.size === 0) {
      // 🔥 Receiver OFFLINE → store
      const list = tempMessages.get(message.receiverId) || [];
      list.push(fullMessage);
      tempMessages.set(message.receiverId, list);
    } else {
      // Receiver ONLINE → deliver
      socket.to(`user_${message.receiverId}`).emit("receive_message", fullMessage);
    }

    // Confirmation to sender
    socket.emit("message_sent", fullMessage);
  });

  /* -------- Mark messages as seen + delete -------- */
  socket.on("messages_seen", ({ chatId }) => {
    if (!userId) return;

    const list = tempMessages.get(userId);
    if (!list) return;

    tempMessages.set(
      userId,
      list.filter(m => m.chatId !== chatId)
    );
  });

  /* -------- Disconnect -------- */
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);

    if (userId) {
      const set = activeConnections.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          activeConnections.delete(userId);
        }
      }
    }
  });
});

/* -------------------- START SERVER -------------------- */
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server running on http://localhost:${PORT}`);
});