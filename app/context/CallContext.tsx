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
import { ConnectionQuality } from "livekit-client";
import { AnimatePresence } from "framer-motion";

import type {
  CallInvitePayload,
  CallPeer,
  CallState,
  CallType,
} from "@/app/types/call";
import { useLiveKit } from "@/app/hooks/useLiveKit";
import { useCallTimer } from "@/app/hooks/useCallTimer";
import { describeConnectionQuality, requestMediaPermissions } from "@/app/lib/livekit";
import { Ringtone } from "@/app/lib/ringtone";
import {
  createCallRequest,
  endCallRequest,
  fetchCallToken,
  markCallAnsweredRequest,
} from "@/app/services/callApi";
import {
  disconnectCallSocket,
  emitCallAccept,
  emitCallCancel,
  emitCallEnd,
  emitCallInvite,
  emitCallReject,
  emitCallBusy,
  emitCallSystemMessage,
  getCallSocket,
} from "@/app/services/callSocket";

import IncomingCallModal from "@/app/components/call/IncomingCallModal";
import OutgoingCall from "@/app/components/call/OutgoingCall";
import AudioCall from "@/app/components/call/AudioCall";
import VideoCall from "@/app/components/call/VideoCall";

type EndReason = "completed" | "missed" | "rejected" | "cancelled" | "busy";

interface ActiveCall {
  callId: string;
  roomName: string;
  callType: CallType;
  isGroup: boolean;
  direction: "incoming" | "outgoing";
  conversationId?: string;
  peer: CallPeer;
  memberIds: string[];
  groupName?: string;
}

export interface StartCallTarget {
  id: string;
  name: string;
  avatar?: string | null;
  isGroup?: boolean;
  conversationId?: string;
  memberIds?: string[];
  groupName?: string;
}

interface CallContextValue {
  callState: CallState;
  isBusy: boolean;
  startCall: (target: StartCallTarget, callType: CallType) => Promise<void>;
}

const CallContext = createContext<CallContextValue>({
  callState: "idle",
  isBusy: false,
  startCall: async () => undefined,
});

const RING_TIMEOUT_MS = 35_000;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const livekit = useLiveKit();
  const [callState, setCallState] = useState<CallState>("idle");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<CallInvitePayload | null>(null);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const ringtoneRef = useRef<Ringtone | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const activeCallRef = useRef<ActiveCall | null>(null);
  const incomingRef = useRef<CallInvitePayload | null>(null);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  const timer = useCallTimer(callState === "connected");

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const getRingtone = useCallback(() => {
    if (!ringtoneRef.current) {
      ringtoneRef.current = new Ringtone();
    }
    return ringtoneRef.current;
  }, []);

  const stopRingtone = useCallback(() => {
    ringtoneRef.current?.stop();
  }, []);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current != null) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const meAsPeer = useCallback((): CallPeer => {
    return {
      id: userId || "",
      name: session?.user?.name || "Me",
      avatar: session?.user?.image ?? null,
    };
  }, [userId, session?.user?.name, session?.user?.image]);

  const participantsOf = useCallback(
    (call: ActiveCall | null): string[] => {
      if (!call) return [];
      const ids = new Set<string>();
      if (userId) ids.add(userId);
      ids.add(call.peer.id);
      call.memberIds.forEach((id) => ids.add(id));
      return Array.from(ids).filter(Boolean);
    },
    [userId]
  );

  const resetCall = useCallback(() => {
    clearRingTimeout();
    stopRingtone();
    void livekit.disconnect();
    setActiveCall(null);
    setIncoming(null);
    setAccepting(false);
    setSpeakerEnabled(true);
    setCallState("idle");
  }, [clearRingTimeout, stopRingtone, livekit]);

  /** Finalize a call: persist end state, broadcast summary message, cleanup. */
  const finalizeCall = useCallback(
    async (call: ActiveCall | null, reason: EndReason) => {
      if (call) {
        try {
          const result = await endCallRequest({ callId: call.callId, reason });
          if (result.message) {
            emitCallSystemMessage({
              targets: participantsOf(call),
              message: result.message,
            });
          }
        } catch {
          // Non-fatal: the peer or a later reload will still reflect the state.
        }
      }
      setCallState("ended");
      window.setTimeout(() => resetCall(), 800);
    },
    [participantsOf, resetCall]
  );

  /* ----------------------- Outgoing ----------------------- */

  const startCall = useCallback(
    async (target: StartCallTarget, callType: CallType) => {
      if (!userId) {
        showToast("You need to be signed in to start a call");
        return;
      }
      if (callStateRef.current !== "idle") {
        showToast("You are already in a call");
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        showToast("You are offline");
        return;
      }

      const wantsVideo = callType === "video";
      const permission = await requestMediaPermissions(wantsVideo);
      if (!permission.granted) {
        showToast(permission.error || "Permission denied");
        return;
      }

      const isGroup = Boolean(target.isGroup);
      setCallState("calling");
      setActiveCall({
        callId: "",
        roomName: "",
        callType,
        isGroup,
        direction: "outgoing",
        conversationId: target.conversationId,
        peer: { id: target.id, name: target.name, avatar: target.avatar },
        memberIds: target.memberIds || [],
        groupName: target.groupName,
      });

      try {
        const res = await createCallRequest({
          callType,
          receiverId: isGroup ? undefined : target.id,
          conversationId: isGroup ? target.conversationId : undefined,
          isGroup,
        });

        const nextCall: ActiveCall = {
          callId: res.callId,
          roomName: res.roomName,
          callType: res.callType,
          isGroup: res.isGroup,
          direction: "outgoing",
          conversationId: res.conversationId,
          peer: res.to || { id: target.id, name: target.name, avatar: target.avatar },
          memberIds: res.memberIds || target.memberIds || [],
          groupName: target.groupName,
        };
        setActiveCall(nextCall);

        await livekit.connect({
          url: res.url,
          token: res.token,
          audio: true,
          video: wantsVideo,
        });

        emitCallInvite({
          callId: res.callId,
          roomName: res.roomName,
          callType: res.callType,
          isGroup: res.isGroup,
          conversationId: res.conversationId,
          from: res.from,
          to: res.to,
          memberIds: res.memberIds,
          groupName: target.groupName,
          createdAt: new Date().toISOString(),
        });

        // Ring timeout -> mark missed if never answered.
        clearRingTimeout();
        ringTimeoutRef.current = window.setTimeout(() => {
          if (
            callStateRef.current === "calling" &&
            activeCallRef.current?.callId === res.callId
          ) {
            emitCallCancel({
              callId: res.callId,
              from: meAsPeer(),
              targets: participantsOf(activeCallRef.current),
            });
            void finalizeCall(activeCallRef.current, "missed");
          }
        }, RING_TIMEOUT_MS);
      } catch (error) {
        const err = error as Error & { code?: string };
        showToast(
          err.code === "BLOCKED"
            ? "Calling is disabled for this user"
            : err.message || "Could not start the call"
        );
        resetCall();
      }
    },
    [
      userId,
      showToast,
      livekit,
      clearRingTimeout,
      meAsPeer,
      participantsOf,
      finalizeCall,
      resetCall,
    ]
  );

  /* ----------------------- Incoming ----------------------- */

  const acceptIncomingCall = useCallback(async () => {
    const inc = incomingRef.current;
    if (!inc) return;

    const wantsVideo = inc.callType === "video";
    setAccepting(true);
    const permission = await requestMediaPermissions(wantsVideo);
    if (!permission.granted) {
      showToast(permission.error || "Permission denied");
      setAccepting(false);
      return;
    }

    stopRingtone();
    clearRingTimeout();
    setCallState("connecting");

    const nextCall: ActiveCall = {
      callId: inc.callId,
      roomName: inc.roomName,
      callType: inc.callType,
      isGroup: inc.isGroup,
      direction: "incoming",
      conversationId: inc.conversationId,
      peer: inc.from,
      memberIds: inc.memberIds || [],
      groupName: inc.groupName,
    };
    setActiveCall(nextCall);

    try {
      const tokenRes = await fetchCallToken({ roomName: inc.roomName });
      await markCallAnsweredRequest({ callId: inc.callId });
      await livekit.connect({
        url: tokenRes.url,
        token: tokenRes.token,
        audio: true,
        video: wantsVideo,
      });

      emitCallAccept({
        callId: inc.callId,
        from: meAsPeer(),
        targets: [inc.from.id],
      });

      setIncoming(null);
      setAccepting(false);
      setCallState("connected");
    } catch (error) {
      showToast((error as Error)?.message || "Could not join the call");
      setAccepting(false);
      resetCall();
    }
  }, [showToast, stopRingtone, clearRingTimeout, livekit, meAsPeer, resetCall]);

  const rejectIncomingCall = useCallback(() => {
    const inc = incomingRef.current;
    if (!inc) return;
    stopRingtone();
    clearRingTimeout();

    emitCallReject({
      callId: inc.callId,
      from: meAsPeer(),
      targets: [inc.from.id],
    });

    const call: ActiveCall = {
      callId: inc.callId,
      roomName: inc.roomName,
      callType: inc.callType,
      isGroup: inc.isGroup,
      direction: "incoming",
      conversationId: inc.conversationId,
      peer: inc.from,
      memberIds: inc.memberIds || [],
      groupName: inc.groupName,
    };
    void finalizeCall(call, "rejected");
    setIncoming(null);
  }, [stopRingtone, clearRingTimeout, meAsPeer, finalizeCall]);

  /* ----------------------- Hangup ----------------------- */

  const hangUp = useCallback(() => {
    const call = activeCallRef.current;
    const state = callStateRef.current;
    if (!call) {
      resetCall();
      return;
    }

    emitCallEnd({
      callId: call.callId,
      from: meAsPeer(),
      targets: participantsOf(call),
    });

    if (call.direction === "outgoing" && state === "calling") {
      emitCallCancel({
        callId: call.callId,
        from: meAsPeer(),
        targets: participantsOf(call),
      });
      void finalizeCall(call, "cancelled");
    } else {
      void finalizeCall(call, "completed");
    }
  }, [resetCall, meAsPeer, participantsOf, finalizeCall]);

  /* ----------------------- Socket wiring ----------------------- */

  useEffect(() => {
    if (!userId) return;

    const socket = getCallSocket(userId);
    socket.emit("join", userId);

    const onIncoming = (payload: CallInvitePayload) => {
      if (!payload?.callId) return;
      // Ignore our own broadcast echoes.
      if (payload.from?.id === userId) return;

      if (callStateRef.current !== "idle") {
        emitCallBusy({
          callId: payload.callId,
          from: meAsPeer(),
          targets: [payload.from.id],
        });
        return;
      }

      setIncoming(payload);
      setCallState("incoming");
      getRingtone().start();

      clearRingTimeout();
      ringTimeoutRef.current = window.setTimeout(() => {
        if (
          callStateRef.current === "incoming" &&
          incomingRef.current?.callId === payload.callId
        ) {
          stopRingtone();
          setIncoming(null);
          setCallState("idle");
        }
      }, RING_TIMEOUT_MS);
    };

    const onAccepted = () => {
      if (
        activeCallRef.current?.direction === "outgoing" &&
        callStateRef.current === "calling"
      ) {
        clearRingTimeout();
        void markCallAnsweredRequest({
          callId: activeCallRef.current.callId,
        }).catch(() => undefined);
        setCallState("connected");
      }
    };

    const onRejected = () => {
      if (activeCallRef.current?.direction === "outgoing") {
        showToast("Call declined");
        resetCall();
      }
    };

    const onBusy = () => {
      if (activeCallRef.current?.direction === "outgoing") {
        showToast("User is busy");
        resetCall();
      }
    };

    const onEnded = () => {
      if (activeCallRef.current) {
        resetCall();
      }
    };

    const onCancelledOrMissed = (payload: { callId?: string }) => {
      if (incomingRef.current?.callId === payload?.callId) {
        stopRingtone();
        clearRingTimeout();
        setIncoming(null);
        setCallState("idle");
      }
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:rejected", onRejected);
    socket.on("call:busy", onBusy);
    socket.on("call:ended", onEnded);
    socket.on("call:cancelled", onCancelledOrMissed);
    socket.on("call:missed", onCancelledOrMissed);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:rejected", onRejected);
      socket.off("call:busy", onBusy);
      socket.off("call:ended", onEnded);
      socket.off("call:cancelled", onCancelledOrMissed);
      socket.off("call:missed", onCancelledOrMissed);
    };
  }, [
    userId,
    meAsPeer,
    getRingtone,
    stopRingtone,
    clearRingTimeout,
    showToast,
    resetCall,
  ]);

  useEffect(() => {
    return () => {
      disconnectCallSocket();
      ringtoneRef.current?.stop();
    };
  }, []);

  /* ----------------------- Derived UI ----------------------- */

  const statusLabel = useMemo(() => {
    switch (callState) {
      case "calling":
        return "Ringing…";
      case "connecting":
        return "Connecting…";
      case "reconnecting":
        return "Reconnecting…";
      case "connected":
        return "Connected";
      default:
        return "";
    }
  }, [callState]);

  const connectionLabel = useMemo(() => {
    if (livekit.isReconnecting) return "Reconnecting";
    return describeConnectionQuality(
      livekit.connectionQuality === ConnectionQuality.Excellent
        ? 3
        : livekit.connectionQuality === ConnectionQuality.Good
          ? 2
          : livekit.connectionQuality === ConnectionQuality.Poor
            ? 1
            : 0
    );
  }, [livekit.connectionQuality, livekit.isReconnecting]);

  const timerText = callState === "connected" ? timer.formatted : null;

  const contextValue = useMemo<CallContextValue>(
    () => ({
      callState,
      isBusy: callState !== "idle",
      startCall,
    }),
    [callState, startCall]
  );

  const showOutgoing =
    activeCall?.direction === "outgoing" && callState === "calling";
  const showStage =
    Boolean(activeCall) &&
    (callState === "connecting" ||
      callState === "connected" ||
      callState === "reconnecting");

  return (
    <CallContext.Provider value={contextValue}>
      {children}

      {toast ? (
        <div className="fixed left-1/2 top-6 z-[200] -translate-x-1/2 rounded-full bg-black/85 px-5 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <AnimatePresence>
        {callState === "incoming" && incoming ? (
          <IncomingCallModal
            key="incoming"
            callerName={incoming.from.name}
            callerAvatar={incoming.from.avatar}
            callType={incoming.callType}
            isGroup={incoming.isGroup}
            groupName={incoming.groupName}
            accepting={accepting}
            onAccept={acceptIncomingCall}
            onDecline={rejectIncomingCall}
          />
        ) : null}
      </AnimatePresence>

      {showOutgoing && activeCall ? (
        <OutgoingCall
          peerName={activeCall.groupName || activeCall.peer.name}
          peerAvatar={activeCall.peer.avatar}
          callType={activeCall.callType}
          isGroup={activeCall.isGroup}
          statusLabel={statusLabel}
          onCancel={hangUp}
        />
      ) : null}

      {showStage && activeCall ? (
        activeCall.callType === "video" ? (
          <VideoCall
            participants={livekit.participants}
            activeSpeakerIds={livekit.activeSpeakerIds}
            version={livekit.version}
            isGroup={activeCall.isGroup}
            peerName={activeCall.groupName || activeCall.peer.name}
            statusLabel={statusLabel}
            timerText={timerText}
            connectionLabel={connectionLabel}
            reconnecting={livekit.isReconnecting}
            audioMuted={!speakerEnabled}
            micEnabled={livekit.micEnabled}
            cameraEnabled={livekit.cameraEnabled}
            screenShareEnabled={livekit.screenShareEnabled}
            speakerEnabled={speakerEnabled}
            onToggleMic={livekit.toggleMic}
            onToggleCamera={livekit.toggleCamera}
            onToggleScreenShare={livekit.toggleScreenShare}
            onSwitchCamera={livekit.switchCamera}
            onToggleSpeaker={() => setSpeakerEnabled((value) => !value)}
            onEnd={hangUp}
          />
        ) : (
          <AudioCall
            participants={livekit.participants}
            activeSpeakerIds={livekit.activeSpeakerIds}
            version={livekit.version}
            isGroup={activeCall.isGroup}
            peerName={activeCall.groupName || activeCall.peer.name}
            peerAvatar={activeCall.peer.avatar}
            statusLabel={statusLabel}
            timerText={timerText}
            connectionLabel={connectionLabel}
            reconnecting={livekit.isReconnecting}
            audioMuted={!speakerEnabled}
            micEnabled={livekit.micEnabled}
            cameraEnabled={livekit.cameraEnabled}
            screenShareEnabled={livekit.screenShareEnabled}
            speakerEnabled={speakerEnabled}
            onToggleMic={livekit.toggleMic}
            onToggleSpeaker={() => setSpeakerEnabled((value) => !value)}
            onEnd={hangUp}
          />
        )
      ) : null}
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  return useContext(CallContext);
}
