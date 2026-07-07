const emitToUsers = (io, targets, event, payload) => {
    const uniqueTargets = Array.from(new Set((targets || []).map((id) => id?.toString?.()).filter(Boolean)));
    uniqueTargets.forEach((userId) => {
        io.to(`user_${userId}`).emit(event, payload);
    });
};
export function registerCallHandlers({ io, socket, activeUsers, pushNotificationToUser, }) {
    // Caller starts ringing the recipient(s).
    socket.on("call:invite", (payload) => {
        if (!payload?.callId || !payload?.roomName || !payload?.from?.id)
            return;
        const targets = payload.isGroup
            ? payload.memberIds || []
            : payload.to?.id
                ? [payload.to.id]
                : [];
        if (targets.length === 0)
            return;
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
    socket.on("call:accept", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:accepted", payload);
    });
    // Recipient declines the call.
    socket.on("call:reject", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:rejected", payload);
    });
    // Recipient is already on another call.
    socket.on("call:busy", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:busy", payload);
    });
    // Caller cancels before it is answered.
    socket.on("call:cancel", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:cancelled", payload);
        // A cancelled unanswered call surfaces to recipients as a missed call.
        emitToUsers(io, payload.targets, "call:missed", payload);
    });
    // Either side ends an ongoing call.
    socket.on("call:end", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:ended", payload);
    });
    // Participant presence within an active room.
    socket.on("call:participant-joined", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:participant-joined", payload);
    });
    socket.on("call:participant-left", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:participant-left", payload);
    });
    // Network quality relay for the peer's connection indicator.
    socket.on("call:network-quality", (payload) => {
        if (!payload?.callId)
            return;
        emitToUsers(io, payload.targets, "call:network-quality", payload);
    });
    // After a call ends, the finalizing client asks the server to broadcast the
    // persisted "call summary" chat message so both chat views update live. The
    // server relays it as a normal receive_message (server-controlled, so it is
    // not subject to sender validation).
    socket.on("call:system-message", (payload) => {
        if (!payload?.message)
            return;
        emitToUsers(io, payload.targets, "receive_message", payload.message);
    });
}
