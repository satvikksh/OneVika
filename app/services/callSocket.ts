"use client";

import { io, Socket } from "socket.io-client";
import type {
  CallInvitePayload,
  CallNetworkQualitySignal,
  CallParticipantSignal,
  CallSignalPayload,
} from "@/app/types/call";

/**
 * A dedicated Socket.IO connection for call signaling, kept separate from the
 * chat socket so calling never interferes with messaging. Both connections
 * share the same `user_<id>` room on the server.
 */
let socket: Socket | null = null;
let currentUserId: string | null = null;

export function getCallSocket(userId: string): Socket {
  if (socket && currentUserId === userId) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://127.0.0.1:3001";

  currentUserId = userId;
  socket = io(socketUrl, {
    path: "/socket.io",
    transports: ["websocket"],
    auth: { userId },
  });

  return socket;
}

export function disconnectCallSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
  }
}

/* ---------------- Emitters ---------------- */

export function emitCallInvite(payload: CallInvitePayload): void {
  socket?.emit("call:invite", payload);
}

export function emitCallAccept(payload: CallSignalPayload): void {
  socket?.emit("call:accept", payload);
}

export function emitCallReject(payload: CallSignalPayload): void {
  socket?.emit("call:reject", payload);
}

export function emitCallBusy(payload: CallSignalPayload): void {
  socket?.emit("call:busy", payload);
}

export function emitCallCancel(payload: CallSignalPayload): void {
  socket?.emit("call:cancel", payload);
}

export function emitCallEnd(payload: CallSignalPayload): void {
  socket?.emit("call:end", payload);
}

export function emitParticipantJoined(payload: CallParticipantSignal): void {
  socket?.emit("call:participant-joined", payload);
}

export function emitParticipantLeft(payload: CallParticipantSignal): void {
  socket?.emit("call:participant-left", payload);
}

export function emitNetworkQuality(payload: CallNetworkQualitySignal): void {
  socket?.emit("call:network-quality", payload);
}

export function emitCallSystemMessage(payload: {
  targets: string[];
  message: Record<string, unknown>;
}): void {
  socket?.emit("call:system-message", payload);
}
