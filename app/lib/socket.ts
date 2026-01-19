import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
      {
        // ✅ IMPORTANT: use DEFAULT Socket.IO path
        // ❌ DO NOT set `path` unless server matches it
        transports: ["websocket"],

        // ✅ let it connect automatically
        autoConnect: true,

        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );
  }
  

  return socket;
};
