import type { Server, Socket } from "socket.io";

/**
 * Real-time signaling for the LiveKit calling system.
 *
 * The socket layer is a thin relay: media flows through LiveKit, while these
 * events coordinate ringing, accept/reject, and lifecycle between peers.
 * Persistence (Call records, call history, system messages) is handled by the
 * REST API in app/api/calls.
 */

interface CallPeer {
  id: string;
  name: string;
  avatar?: string | null;
}

interface CallInvitePayload {
  callId: string;
  roomName: string;
  callType: "audio" | "video";
  isGroup: boolean;
  conversationId?: string;
  from: CallPeer;
  to?: CallPeer;
  memberIds?: string[];
  groupName?: string;
  createdAt?: string;
}

interface CallSignalPayload {
  callId: string;
  roomName?: string;
  callType?: "audio" | "video";
  from: CallPeer;
  targets: string[];
  reason?: string;
}

interface CallParticipantSignal {
  callId: string;
  targets: string[];
  participant: CallPeer;
}

interface CallNetworkQualitySignal {
  callId: string;
  targets: string[];
  from: string;
  quality: number;
}

interface CallSocketDeps {
  io: Server;
  socket: Socket;
  activeUsers: Map<string, Set<string>>;
  pushNotificationToUser: (
    targetUserId: string,
    payload: {
      type?: string;
      title?: string;
      message: string;
      senderId?: string;
      url?: string;
    }
  ) => Promise<void>;
}

const emitToUsers = (
  io: Server,
  targets: string[] | undefined,
  event: string,
  payload: unknown
) => {
  const uniqueTargets = Array.from(
    new Set((targets || []).map((id) => id?.toString?.()).filter(Boolean))
  ) as string[];

  uniqueTargets.forEach((userId) => {
    io.to(`user_${userId}`).emit(event, payload);
  });
};

export function registerCallHandlers({
  io,
  socket,
  activeUsers,
  pushNotificationToUser,
}: CallSocketDeps): void {
  // Caller starts ringing the recipient(s).
  socket.on("call:invite", (payload: CallInvitePayload) => {
    if (!payload?.callId || !payload?.roomName || !payload?.from?.id) return;

    const targets = payload.isGroup
      ? payload.memberIds || []
      : payload.to?.id
        ? [payload.to.id]
        : [];

    if (targets.length === 0) return;

    emitToUsers(io, targets, "call:incoming", payload);

    // Let the caller know ringing has started.
    io.to(`user_${payload.from.id}`).emit("call:ringing", {
      callId: payload.callId,
      roomName: payload.roomName,
    });

    // Notify recipients who have no active socket (offline / background).
    targets.forEach((targetId) => {
      const isOnline = Boolean(activeUsers.get(targetId)?.size);
      if (!isOnline) {
        void pushNotificationToUser(targetId, {
          type: "call",
          title: `Incoming ${payload.callType} call`,
          message: `${payload.from.name} is calling you`,
          senderId: payload.from.id,
          url: "/chat",
        }).catch((error) => {
          console.error("[Call] push notification failed:", error);
        });
      }
    });
  });

  // Recipient accepts the call.
  socket.on("call:accept", (payload: CallSignalPayload) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:accepted", payload);
  });

  // Recipient declines the call.
  socket.on("call:reject", (payload: CallSignalPayload) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:rejected", payload);
  });

  // Recipient is already on another call.
  socket.on("call:busy", (payload: CallSignalPayload) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:busy", payload);
  });

  // Caller cancels before it is answered.
  socket.on("call:cancel", (payload: CallSignalPayload) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:cancelled", payload);

    // A cancelled unanswered call surfaces to recipients as a missed call.
    emitToUsers(io, payload.targets, "call:missed", payload);
  });

  // Either side ends an ongoing call.
  socket.on("call:end", (payload: CallSignalPayload) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:ended", payload);
  });

  // Participant presence within an active room.
  socket.on("call:participant-joined", (payload: CallParticipantSignal) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:participant-joined", payload);
  });

  socket.on("call:participant-left", (payload: CallParticipantSignal) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:participant-left", payload);
  });

  // Network quality relay for the peer's connection indicator.
  socket.on("call:network-quality", (payload: CallNetworkQualitySignal) => {
    if (!payload?.callId) return;
    emitToUsers(io, payload.targets, "call:network-quality", payload);
  });

  // After a call ends, the finalizing client asks the server to broadcast the
  // persisted "call summary" chat message so both chat views update live. The
  // server relays it as a normal receive_message (server-controlled, so it is
  // not subject to sender validation).
  socket.on(
    "call:system-message",
    (payload: { targets?: string[]; message?: Record<string, unknown> }) => {
      if (!payload?.message) return;
      emitToUsers(io, payload.targets, "receive_message", payload.message);
    }
  );
}
