import io, { Socket } from "socket.io-client";

let socket: typeof Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      {
        path: "/api/socket",
        transports: ["websocket"],
        autoConnect: false, // IMPORTANT
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );
  }

  return socket;
};
