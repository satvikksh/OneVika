"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import io, { type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextType {
  socket: typeof Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
});

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { data: session } = useSession();
  const socketRef = useRef< typeof Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;

    if (!socketRef.current) {
      const socket = io({
        path: "/api/socket",
        transports: ["websocket"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        socket.emit("join_user", session.user.id);
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
      });

      socket.on("user_status", ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
        setOnlineUsers((prev) =>
          isOnline
            ? [...new Set([...prev, userId])]
            : prev.filter((id) => id !== userId)
        );
      });
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [session?.user?.id]);

  return (
    <SocketContext.Provider
      value={{
        // eslint-disable-next-line react-hooks/refs
        socket: socketRef.current,
        isConnected,
        onlineUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
