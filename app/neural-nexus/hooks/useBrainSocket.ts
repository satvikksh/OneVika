"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { NeuralNode, NeuralLink } from "../../types/neural";

const SOCKET_URL = "http://localhost:3001";

export function useBrainSocket(roomId: string) {
  const [nodes, setNodes] = useState<NeuralNode[]>([]);
  const [links, setLinks] = useState<NeuralLink[]>([]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL);

    socket.emit("join-room", {
      roomId,
      user: {
        id: crypto.randomUUID(),
        name: "Anonymous Mind",
      },
    });

    socket.on("room-users", (users) => {
      const brainNodes: NeuralNode[] = users.map((u: any) => ({
        id: u.id,
        label: u.name,
        strength: 1,
      }));

      const brainLinks: NeuralLink[] = brainNodes
        .slice(1)
        .map((n) => ({
          source: brainNodes[0].id,
          target: n.id,
        }));

      setNodes(brainNodes);
      setLinks(brainLinks);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return { nodes, links };
}
