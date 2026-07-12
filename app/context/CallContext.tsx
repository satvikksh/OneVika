"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "./SocketContext";
import { useLiveKitRoom } from "../hooks/useLiveKitRoom";
import {
  playOutgoingRing,
  playVideoIncoming,
  playVoiceIncoming,
  stopRingtone,
} from "../lib/ringtone";
import type {
  ActiveCallState,
  CallAcceptPayload,
  CallCancelPayload,
  CallEndPayload,
  CallInvitePayload,
  CallParticipantPayload,
  CallParticipantRef,
  CallRejectPayload,
  CallRingingPayload,
} from "../types/call";

interface StartCallOptions {
  video: boolean;
  conversationId?: string;
  groupName?: string;
}

interface CallContextValue {
  activeCall: ActiveCallState | null;
  incomingCall: CallInvitePayload | null;
  startCall: (targets: CallParticipantRef[], options: StartCallOptions) => Promise<void>;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  cancelOutgoingCall: () => void;
  endCall: () => void;
  tiles: ReturnType<typeof useLiveKitRoom>["tiles"];
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isSpeakerEnabled: boolean;
  isSpeakerToggleSupported: boolean;
  isScreenShareEnabled: boolean;
  isScreenShareSupported: boolean;
  screenShareError: string | null;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  toggleScreenShare: () => void;
  connectError: string | null;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const { isConnected, emitEvent, subscribeEvent } = useSocket();

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInvitePayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  // Guards against acting on a call that already ended.
  const activeCallIdRef = useRef<string | null>(null);
  const missedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, []);

  const resetCallState = useCallback(() => {
    stopRingtone();
    if (missedTimerRef.current) {
      window.clearTimeout(missedTimerRef.current);
      missedTimerRef.current = null;
    }
    activeCallIdRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setToken(null);
    setLivekitUrl(null);
  }, []);

  const fetchTokenAndConnect = useCallback(
    async (roomId: string) => {
      try {
        const res = await fetch("/api/calls/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.token) {
          throw new Error(data?.error || "Failed to get call token");
        }
        setToken(data.token);
        setLivekitUrl(data.url);
      } catch (error) {
        console.error("[Call] Failed to fetch LiveKit token:", error);
        resetCallState();
      }
    },
    [resetCallState]
  );

  useEffect(() => {
    if (!userId || typeof window === "undefined" || activeCallIdRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const callId = params.get("incomingCall");
    const shouldAccept = params.get("acceptCall") === "1";
    if (!callId || !shouldAccept) return;

    let cancelled = false;

    const acceptPwaCall = async () => {
      try {
        const res = await fetch("/api/calls/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.token || data?.status !== "Ringing") {
          throw new Error(data?.error || "Call is no longer active");
        }
        if (cancelled) return;

        activeCallIdRef.current = data.callId;
        setActiveCall({
          callId: data.callId,
          roomId: data.roomId,
          roomName: data.roomName,
          video: data.callType === "video",
          callType: data.callType === "video" ? "video" : "audio",
          isGroup: Array.isArray(data.receiverIds) && data.receiverIds.length > 1,
          conversationId: data.conversationId,
          status: "connecting",
          participants: [],
        });
        setIncomingCall(null);
        setToken(data.token);
        setLivekitUrl(data.url);
        emitEvent("call:accepted", { callId: data.callId, userId, roomId: data.roomId } as CallAcceptPayload);
        emitEvent("call:participant-joined", {
          callId: data.callId,
          userId,
          roomId: data.roomId,
        } as CallParticipantPayload);
      } catch (error) {
        console.error("[Call] Failed to accept PWA call:", error);
        resetCallState();
      } finally {
        params.delete("acceptCall");
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
        );
      }
    };

    void acceptPwaCall();

    return () => {
      cancelled = true;
    };
  }, [userId, emitEvent, resetCallState]);

  const finishCallRecord = useCallback(
    async (
      call: Pick<ActiveCallState, "callId" | "roomId">,
      status: "Missed" | "Rejected" | "Completed" | "Cancelled"
    ) => {
      try {
        await fetch("/api/calls/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId: call.callId, roomId: call.roomId, status }),
        });
      } catch (error) {
        console.error("[Call] Failed to finish call record:", error);
      }
    },
    []
  );

  const startCall = useCallback(
    async (targets: CallParticipantRef[], options: StartCallOptions) => {
      if (!userId || activeCallIdRef.current || targets.length === 0) return;

      try {
        const res = await fetch("/api/calls/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverIds: targets.map((target) => target.id),
            callType: options.video ? "video" : "audio",
            conversationId: options.conversationId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.callId || !data?.roomId || !data?.roomName) {
          throw new Error(data?.error || "Failed to start call");
        }

      const payload: CallInvitePayload = {
        callId: data.callId,
        roomId: data.roomId,
        roomName: data.roomName,
        fromUserId: userId,
        fromUserName: session?.user?.name ?? "Someone",
        fromAvatar: session?.user?.image ?? null,
        toUserIds: targets.map((t) => t.id),
        isGroup: targets.length > 1,
        video: options.video,
        callType: options.video ? "video" : "audio",
        conversationId: data.conversationId || options.conversationId,
        groupName: options.groupName,
        participants: targets,
      };

      activeCallIdRef.current = data.callId;
      setActiveCall({
        callId: data.callId,
        roomId: data.roomId,
        roomName: data.roomName,
        video: options.video,
        callType: options.video ? "video" : "audio",
        isGroup: targets.length > 1,
        conversationId: data.conversationId || options.conversationId,
        status: "ringing-outgoing",
        participants: targets,
      });

      playOutgoingRing();
      emitEvent("call:incoming", payload);

      if (data.token && data.url) {
        setToken(data.token);
        setLivekitUrl(data.url);
      } else {
        void fetchTokenAndConnect(data.roomId);
      }

      missedTimerRef.current = window.setTimeout(() => {
        emitEvent("call:missed", { callId: data.callId, userId });
        void finishCallRecord({ callId: data.callId, roomId: data.roomId }, "Missed");
        resetCallState();
      }, 45_000);
      } catch (error) {
        console.error("[Call] Failed to start call:", error);
        resetCallState();
      }
    },
    [userId, session, emitEvent, fetchTokenAndConnect, finishCallRecord, resetCallState]
  );

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !userId) return;
    const { callId, roomName } = incomingCall;

    activeCallIdRef.current = callId;
    setActiveCall({
      callId,
      roomId: incomingCall.roomId,
      roomName,
      video: incomingCall.video,
      callType: incomingCall.callType,
      isGroup: incomingCall.isGroup,
      conversationId: incomingCall.conversationId,
      status: "connecting",
      participants: [
        {
          id: incomingCall.fromUserId,
          name: incomingCall.fromUserName,
          avatar: incomingCall.fromAvatar,
        },
        ...(incomingCall.participants ?? []),
      ],
    });
    setIncomingCall(null);
    stopRingtone();

    emitEvent("call:accepted", { callId, userId, roomId: incomingCall.roomId } as CallAcceptPayload);
    emitEvent("call:participant-joined", {
      callId,
      userId,
      roomId: incomingCall.roomId,
    } as CallParticipantPayload);
    void fetchTokenAndConnect(incomingCall.roomId);
  }, [incomingCall, userId, emitEvent, fetchTokenAndConnect]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall || !userId) return;
    emitEvent("call:rejected", {
      callId: incomingCall.callId,
      userId,
      reason: "declined",
    } as CallRejectPayload);
    void finishCallRecord(incomingCall, "Rejected");
    stopRingtone();
    setIncomingCall(null);
  }, [incomingCall, userId, emitEvent, finishCallRecord]);

  const cancelOutgoingCall = useCallback(() => {
    if (!activeCall || !userId) return;
    emitEvent("call:cancelled", {
      callId: activeCall.callId,
      userId,
    } as CallCancelPayload);
    void finishCallRecord(activeCall, "Cancelled");
    resetCallState();
  }, [activeCall, userId, emitEvent, finishCallRecord, resetCallState]);

  const endCall = useCallback(() => {
    if (!activeCall || !userId) return;
    emitEvent("call:ended", {
      callId: activeCall.callId,
      userId,
      roomId: activeCall.roomId,
    } as CallEndPayload);
    emitEvent("call:participant-left", {
      callId: activeCall.callId,
      userId,
      roomId: activeCall.roomId,
    } as CallParticipantPayload);
    void finishCallRecord(activeCall, "Completed");
    resetCallState();
  }, [activeCall, userId, emitEvent, finishCallRecord, resetCallState]);

  // --- Incoming signaling ---
  useEffect(() => {
    if (!isConnected || !userId) return;

    const unsubInvite = subscribeEvent("call:incoming", (payload: CallInvitePayload) => {
      if (!payload.toUserIds?.includes(userId)) return;
      // Already on a call: auto-decline so the caller isn't left hanging.
      if (activeCallIdRef.current) {
        emitEvent("call:busy", {
          callId: payload.callId,
          userId,
          reason: "busy",
        } as CallRejectPayload);
        return;
      }
      if (payload.video) {
        playVideoIncoming();
      } else {
        playVoiceIncoming();
      }
      setIncomingCall(payload);
      emitEvent("call:ringing", { callId: payload.callId, userId } as CallRingingPayload);
    });

    const unsubRinging = subscribeEvent("call:ringing", (payload: CallRingingPayload) => {
      if (payload.callId !== activeCallIdRef.current) return;
      setActiveCall((prev) => (prev ? { ...prev, status: "ringing-outgoing" } : prev));
    });

    const unsubAccept = subscribeEvent("call:accepted", (payload: CallAcceptPayload) => {
      if (payload.callId !== activeCallIdRef.current) return;
      stopRingtone();
      if (missedTimerRef.current) {
        window.clearTimeout(missedTimerRef.current);
        missedTimerRef.current = null;
      }
      setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : prev));
    });

    const unsubReject = subscribeEvent("call:rejected", (payload: CallRejectPayload) => {
      if (payload.callId !== activeCallIdRef.current) return;
      // For 1:1 calls a single reject ends things. For group calls you may
      // want to just remove that participant instead of tearing down the
      // whole call — extend here if needed.
      if (activeCall && !activeCall.isGroup) {
        stopRingtone();
        resetCallState();
      }
    });

    const unsubBusy = subscribeEvent("call:busy", (payload: CallRejectPayload) => {
      if (payload.callId === activeCallIdRef.current) {
        if (activeCall) {
          void finishCallRecord(activeCall, "Rejected");
        }
        resetCallState();
      }
    });

    const unsubCancel = subscribeEvent("call:cancelled", (payload: CallCancelPayload) => {
      if (incomingCall?.callId === payload.callId) {
        stopRingtone();
        setIncomingCall(null);
      }
    });

    const unsubMissed = subscribeEvent("call:missed", (payload: CallCancelPayload) => {
      if (incomingCall?.callId === payload.callId) {
        stopRingtone();
        setIncomingCall(null);
      }
      if (payload.callId === activeCallIdRef.current) {
        if (activeCall) {
          void finishCallRecord(activeCall, "Missed");
        }
        resetCallState();
      }
    });

    const unsubEnd = subscribeEvent("call:ended", (payload: CallEndPayload) => {
      if (incomingCall?.callId === payload.callId) {
        stopRingtone();
        setIncomingCall(null);
      }
      if (payload.callId === activeCallIdRef.current) {
        resetCallState();
      }
    });

    return () => {
      unsubInvite();
      unsubRinging();
      unsubAccept();
      unsubReject();
      unsubBusy();
      unsubCancel();
      unsubMissed();
      unsubEnd();
    };
  }, [
    isConnected,
    userId,
    subscribeEvent,
    emitEvent,
    activeCall,
    incomingCall,
    finishCallRecord,
    resetCallState,
  ]);

  const {
    tiles,
    isMicEnabled,
    isCameraEnabled,
    isSpeakerEnabled,
    isSpeakerToggleSupported,
    isScreenShareEnabled,
    isScreenShareSupported,
    screenShareError,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    toggleScreenShare,
    error,
    isConnected: roomConnected,
  } =
    useLiveKitRoom({
      token,
      url: livekitUrl,
      video: activeCall?.video ?? false,
    });

  // Flip status to "connected" once our own media is up, in case the other
  // side already accepted before we finished connecting.
  useEffect(() => {
    if (roomConnected && activeCall && activeCall.status !== "connected") {
      setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : prev));
    }
  }, [roomConnected, activeCall]);

  const value = useMemo<CallContextValue>(
    () => ({
      activeCall,
      incomingCall,
      startCall,
      acceptIncomingCall,
      rejectIncomingCall,
      cancelOutgoingCall,
      endCall,
      tiles,
      isMicEnabled,
      isCameraEnabled,
      isSpeakerEnabled,
      isSpeakerToggleSupported,
      isScreenShareEnabled,
      isScreenShareSupported,
      screenShareError,
      toggleMic,
      toggleCamera,
      toggleSpeaker,
      toggleScreenShare,
      connectError: error,
    }),
    [
      activeCall,
      incomingCall,
      startCall,
      acceptIncomingCall,
      rejectIncomingCall,
      cancelOutgoingCall,
      endCall,
      tiles,
      isMicEnabled,
      isCameraEnabled,
      isSpeakerEnabled,
      isSpeakerToggleSupported,
      isScreenShareEnabled,
      isScreenShareSupported,
      screenShareError,
      toggleMic,
      toggleCamera,
      toggleSpeaker,
      toggleScreenShare,
      error,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return ctx;
}
