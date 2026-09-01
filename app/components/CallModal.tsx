"use client";

import {
  Check,
  ChevronUp,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  MonitorUp,
  Move,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useCall } from "../context/CallContext";
import CallParticipantTile from "./CallParticipantTile";

type CallWindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const minCallWindow = {
  width: 320,
  height: 280,
};

const getViewportSize = () => ({
  width: typeof window === "undefined" ? 1280 : window.innerWidth,
  height: typeof window === "undefined" ? 800 : window.innerHeight,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const clampWindowRect = (rect: CallWindowRect) => {
  const viewport = getViewportSize();
  const maxWidth = Math.max(minCallWindow.width, viewport.width - 24);
  const maxHeight = Math.max(minCallWindow.height, viewport.height - 24);
  const width = clamp(rect.width, minCallWindow.width, maxWidth);
  const height = clamp(rect.height, minCallWindow.height, maxHeight);

  return {
    width,
    height,
    x: clamp(rect.x, 12, Math.max(12, viewport.width - width - 12)),
    y: clamp(rect.y, 12, Math.max(12, viewport.height - height - 12)),
  };
};

const getDefaultCallWindowRect = (video: boolean): CallWindowRect => {
  const viewport = getViewportSize();
  const width = video ? Math.min(420, viewport.width - 32) : Math.min(360, viewport.width - 32);
  const height = video ? Math.min(700, viewport.height - 32) : Math.min(360, viewport.height - 32);

  return clampWindowRect({
    width,
    height,
    x: viewport.width - width - 24,
    y: Math.max(24, (viewport.height - height) / 2),
  });
};

export default function CallModal() {
  const {
    activeCall,
    incomingCall,
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
    connectError,
  } = useCall();
  const { data: session } = useSession();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowRect, setWindowRect] = useState<CallWindowRect>(() =>
    getDefaultCallWindowRect(true)
  );
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startRect: CallWindowRect;
    mode: "move" | "resize";
    direction?: ResizeDirection;
  } | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartRef = useRef<{ y: number; progress: number } | null>(null);
  const swipeThumbRef = useRef<HTMLButtonElement | null>(null);
  const computeSwipeProgress = (clientY: number, start: { y: number; progress: number }) => {
    const distance = 170;
    const delta = start.y - clientY;
    return Math.min(1, Math.max(0, start.progress + delta / distance));
  };

  useEffect(() => {
    if (activeCall?.status !== "connected") {
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeCall?.status, activeCall?.callId]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsDesktopViewport(window.innerWidth >= 768);
      setWindowRect((current) => clampWindowRect(current));
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!activeCall?.callId) return;
    const frame = window.requestAnimationFrame(() => {
      setElapsedSeconds(0);
      setIsMinimized(false);
      setIsFullscreen(false);
      setWindowRect(getDefaultCallWindowRect(activeCall.video));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeCall?.callId, activeCall?.video]);

  const handleWindowPointerMove = useCallback((event: PointerEvent) => {
    const state = dragStateRef.current;
    if (!state) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (state.mode === "move") {
      setWindowRect(
        clampWindowRect({
          ...state.startRect,
          x: state.startRect.x + dx,
          y: state.startRect.y + dy,
        })
      );
      return;
    }

    const direction = state.direction || "se";
    const nextRect = { ...state.startRect };

    if (direction.includes("e")) {
      nextRect.width = state.startRect.width + dx;
    }
    if (direction.includes("s")) {
      nextRect.height = state.startRect.height + dy;
    }
    if (direction.includes("w")) {
      nextRect.width = state.startRect.width - dx;
      nextRect.x = state.startRect.x + dx;
    }
    if (direction.includes("n")) {
      nextRect.height = state.startRect.height - dy;
      nextRect.y = state.startRect.y + dy;
    }

    setWindowRect(clampWindowRect(nextRect));
  }, []);

  const finishWindowInteraction = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handleWindowPointerMove);
  }, [handleWindowPointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", finishWindowInteraction);
      window.removeEventListener("pointercancel", finishWindowInteraction);
    };
  }, [finishWindowInteraction, handleWindowPointerMove]);

  const beginWindowInteraction = useCallback(
    (
      event: React.PointerEvent<HTMLElement>,
      mode: "move" | "resize",
      direction?: ResizeDirection
    ) => {
      if (!isDesktopViewport || isFullscreen) return;
      event.preventDefault();
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: windowRect,
        mode,
        direction,
      };
      window.addEventListener("pointermove", handleWindowPointerMove);
      window.addEventListener("pointerup", finishWindowInteraction, { once: true });
      window.addEventListener("pointercancel", finishWindowInteraction, { once: true });
    },
    [
      finishWindowInteraction,
      handleWindowPointerMove,
      isDesktopViewport,
      isFullscreen,
      windowRect,
    ]
  );

  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  // Incoming call, not yet accepted/rejected, and not already on a call.
  if (incomingCall && !activeCall) {
    if (isDesktopViewport) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 text-white backdrop-blur-xl">
          <div className="relative flex min-h-[520px] w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-b from-gray-900 via-gray-950 to-black p-6 text-center shadow-2xl sm:min-h-[580px]">
            <div className="absolute top-20 h-32 w-32 animate-ping rounded-full bg-emerald-500/20" />
            <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-600/20 ring-4 ring-white/10">
              {incomingCall.fromAvatar && !incomingCall.isGroup ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={incomingCall.fromAvatar} alt="" className="h-full w-full object-cover" />
              ) : incomingCall.isGroup ? (
                <Users size={32} className="text-blue-400" />
              ) : incomingCall.video ? (
                <Video size={32} className="text-blue-400" />
              ) : (
                <Phone size={32} className="text-blue-400" />
              )}
            </div>
            <p className="text-lg font-semibold">
              {incomingCall.isGroup
                ? incomingCall.groupName || "Group call"
                : incomingCall.fromUserName || "Someone"}
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Incoming {incomingCall.video ? "Video" : "Audio"} Call
              {incomingCall.isGroup ? ` from ${incomingCall.fromUserName || "a member"}` : ""}
            </p>

            <div className="mt-12 flex items-center justify-center gap-10">
              <button
                onClick={rejectIncomingCall}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-950/40 transition hover:bg-red-500"
                aria-label="Decline call"
              >
                <PhoneOff size={22} />
              </button>
              <button
                onClick={acceptIncomingCall}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-950/40 transition hover:bg-green-500"
                aria-label="Accept call"
              >
                <Phone size={22} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const callerName = incomingCall.isGroup
      ? incomingCall.groupName || "Group call"
      : incomingCall.fromUserName || "Someone";
    const swipeHeld = swipeProgress >= 0.85;
    const thumbTravel = 148;

    const handleSwipeStart = (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      swipeStartRef.current = { y: e.clientY, progress: swipeProgress };
      setIsSwiping(true);
    };
    const handleSwipeMove = (e: React.PointerEvent) => {
      if (!swipeStartRef.current || !isSwiping) return;
      setSwipeProgress(computeSwipeProgress(e.clientY, swipeStartRef.current));
    };
    const handleSwipeEnd = () => {
      swipeStartRef.current = null;
      setIsSwiping(false);
      if (swipeProgress >= 0.85) {
        acceptIncomingCall();
      } else {
        setSwipeProgress(0);
      }
    };
    const handleSwipeCancel = () => {
      swipeStartRef.current = null;
      setIsSwiping(false);
      setSwipeProgress(0);
    };

    return (
      <>
        <style>{`
          @keyframes call-enter { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes ring-pulse { 0% { transform: scale(1); opacity: 0.55; } 100% { transform: scale(1.55); opacity: 0; } }
          @keyframes arrow-bob { 0%, 100% { transform: translateY(0); opacity: 0.9; } 50% { transform: translateY(-4px); opacity: 0.5; } }
          @keyframes glow-drift { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-18px,12px) scale(1.15); } }
          .call-enter { animation: call-enter 420ms cubic-bezier(0.22,1,0.36,1) both; }
          .ring-pulse-a { animation: ring-pulse 2.2s cubic-bezier(0.22,1,0.36,1) infinite; }
          .ring-pulse-b { animation: ring-pulse 2.2s cubic-bezier(0.22,1,0.36,1) 1.1s infinite; }
          .call-arrow-bob { animation: arrow-bob 1.3s ease-in-out infinite; }
          .call-glow-drift { animation: glow-drift 8s ease-in-out infinite; }
        `}</style>
        <div className="call-enter fixed inset-0 z-[100] touch-none select-none overflow-hidden bg-black text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.18),transparent_55%)]" />
          <div className="call-glow-drift pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="call-glow-drift pointer-events-none absolute -right-24 top-1/2 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex h-full flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <span className="ring-pulse-a absolute inset-0 rounded-full bg-white/15" />
                <span className="ring-pulse-b absolute inset-0 rounded-full bg-emerald-400/25" />
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/20 bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.35)]">
                  {incomingCall.fromAvatar && !incomingCall.isGroup ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={incomingCall.fromAvatar} alt="" className="h-full w-full object-cover" />
                  ) : incomingCall.isGroup ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users size={48} className="text-white/90" />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Phone size={48} className="text-white/90" />
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-8 max-w-[16rem] truncate text-center text-2xl font-bold">{callerName}</p>
              <p className="mt-2 text-sm font-medium tracking-wide text-white/60">
                Incoming {incomingCall.video ? "Video" : "Audio"} Call
              </p>
            </div>

            <div className="flex w-full items-end justify-between gap-5">
              <div className="flex flex-col items-center gap-3 pb-1">
                <button
                  onClick={rejectIncomingCall}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_8px_30px_rgba(239,68,68,0.35)] transition active:scale-95"
                  aria-label="Decline call"
                >
                  <PhoneOff size={26} />
                </button>
                <span className="text-xs font-medium text-white/60">Decline</span>
              </div>

              <div className="flex flex-1 items-end justify-center pb-1">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <ChevronUp className="call-arrow-bob h-4 w-4 text-emerald-300" style={{ animationDelay: "0ms" }} />
                    <ChevronUp className="call-arrow-bob h-5 w-5 text-emerald-200" style={{ animationDelay: "150ms" }} />
                    <ChevronUp className="call-arrow-bob h-7 w-7 text-white" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-[13px] font-semibold tracking-wide text-white/80">Swipe up to accept</p>
                </div>
              </div>
            </div>

            <div className="relative mt-4 flex h-[232px] w-28 items-end justify-center rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-sm">
              <div
                className="absolute bottom-2 left-1/2 w-6 -translate-x-1/2 overflow-hidden rounded-full bg-emerald-500/25"
                style={{ height: `${Math.max(8, swipeProgress * 216)}px`, transition: isSwiping ? "none" : "height 300ms ease" }}
              >
                <div className="h-full w-full bg-gradient-to-t from-emerald-600 to-emerald-300" />
              </div>
              <button
                ref={swipeThumbRef}
                type="button"
                aria-label="Swipe up to accept call"
                onPointerDown={handleSwipeStart}
                onPointerMove={handleSwipeMove}
                onPointerUp={handleSwipeEnd}
                onPointerCancel={handleSwipeCancel}
                className={`relative z-10 flex h-[74px] w-[74px] items-center justify-center rounded-full text-white shadow-[0_8px_30px_rgba(16,185,129,0.5)] transition-colors ${
                  swipeHeld ? "bg-emerald-400 active:scale-95" : "bg-gradient-to-b from-emerald-500 to-emerald-600"
                }`}
                style={{
                  transform: `translateY(-${swipeProgress * thumbTravel}px)`,
                  transition: isSwiping ? "none" : "transform 350ms cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                {swipeHeld ? <Check size={32} /> : <Phone size={28} />}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!activeCall) return null;

  const isRinging = activeCall.status === "ringing-outgoing";
  const remoteParticipants = activeCall.participants.filter(
    (participant) => participant.id !== session?.user?.id
  );
  const primaryRemote = remoteParticipants[0] ?? activeCall.participants[0];
  const otherNames =
    remoteParticipants.map((p) => p.name || p.id).join(", ") ||
    primaryRemote?.name ||
    "Participant";
  const localTile = tiles.find((tile) => tile.isLocal);
  const remoteTiles = tiles.filter((tile) => !tile.isLocal);
  const primaryRemoteTile = remoteTiles.find((tile) => tile.videoTrack) ?? remoteTiles[0];
  const statusText = isRinging
    ? "Ringing..."
    : activeCall.status === "connecting"
      ? "Connecting..."
      : formattedDuration;
  const activeError = screenShareError || connectError;
  const displayAvatar = primaryRemote?.avatar;
  const callTitle = activeCall.isGroup ? "Group call" : otherNames;
  const isFloatingDesktop = isDesktopViewport && !isFullscreen;
  const resizeHandles: Array<{ direction: ResizeDirection; className: string }> = [
    { direction: "n", className: "left-3 right-3 top-0 h-2 cursor-n-resize" },
    { direction: "s", className: "bottom-0 left-3 right-3 h-2 cursor-s-resize" },
    { direction: "e", className: "bottom-3 right-0 top-3 w-2 cursor-e-resize" },
    { direction: "w", className: "bottom-3 left-0 top-3 w-2 cursor-w-resize" },
    { direction: "ne", className: "right-0 top-0 h-4 w-4 cursor-ne-resize" },
    { direction: "nw", className: "left-0 top-0 h-4 w-4 cursor-nw-resize" },
    { direction: "se", className: "bottom-0 right-0 h-4 w-4 cursor-se-resize" },
    { direction: "sw", className: "bottom-0 left-0 h-4 w-4 cursor-sw-resize" },
  ];

  const avatarNode = (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600/20 ring-1 ring-white/10">
      {displayAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
      ) : activeCall.video ? (
        <Video size={18} className="text-blue-300" />
      ) : (
        <Phone size={18} className="text-blue-300" />
      )}
    </div>
  );

  const callBody = (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4">
      {isRinging ? (
        <div className="flex h-full min-h-[15rem] flex-col items-center justify-center gap-3 text-gray-400">
          <div className="flex h-28 w-28 animate-pulse items-center justify-center overflow-hidden rounded-full bg-blue-600/20 ring-4 ring-white/10">
            {primaryRemote?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primaryRemote.avatar} alt="" className="h-full w-full object-cover" />
            ) : activeCall.video ? (
              <Video size={36} />
            ) : (
              <Phone size={36} />
            )}
          </div>
          <p className="text-lg font-medium text-white">{otherNames}</p>
          <p className="text-sm">{activeCall.status === "connecting" ? "Connecting..." : "Calling..."}</p>
        </div>
      ) : !activeCall.video ? (
        <div className="flex h-full min-h-[13rem] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-800 ring-4 ring-white/10 sm:h-32 sm:w-32">
            {primaryRemote?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primaryRemote.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <Phone size={42} className="text-gray-300" />
            )}
          </div>
          <div>
            <p className="text-xl font-semibold">{otherNames}</p>
            <p className="mt-1 text-xs text-emerald-400">Connected</p>
            <p className="mt-1 text-sm text-gray-400">{formattedDuration}</p>
          </div>
        </div>
      ) : remoteTiles.length <= 1 && primaryRemoteTile ? (
        <div className="relative h-full min-h-[20rem] overflow-hidden rounded-2xl bg-gray-950">
          <CallParticipantTile tile={primaryRemoteTile} fill />
          {localTile ? (
            <div className="absolute bottom-3 right-3 w-28 overflow-hidden rounded-xl border border-white/20 shadow-2xl sm:w-36">
              <CallParticipantTile tile={localTile} compact />
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            tiles.length <= 1
              ? "grid-cols-1"
              : tiles.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {tiles.map((tile) => (
            <CallParticipantTile key={tile.identity} tile={tile} />
          ))}
        </div>
      )}
    </div>
  );

  const callControls = (
    <div className="flex flex-wrap items-center justify-center gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:gap-3 sm:px-4 sm:py-4">
      <button
        onClick={toggleMic}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
          isMicEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"
        }`}
        aria-label="Toggle microphone"
      >
        {isMicEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      </button>

      {activeCall.video ? (
        <button
          onClick={toggleCamera}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
            isCameraEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"
          }`}
          aria-label="Toggle camera"
        >
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      ) : null}

      <button
        onClick={toggleSpeaker}
        disabled={!isSpeakerToggleSupported}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
          !isSpeakerToggleSupported
            ? "cursor-not-allowed bg-gray-900 text-gray-600"
            : isSpeakerEnabled
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
        aria-label="Toggle speaker"
        title={
          isSpeakerToggleSupported
            ? "Toggle speaker"
            : "Speaker selection is not supported in this browser"
        }
      >
        {isSpeakerEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {activeCall.video ? (
        <button
          onClick={toggleScreenShare}
          disabled={!isScreenShareSupported}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
            !isScreenShareSupported
              ? "cursor-not-allowed bg-gray-900 text-gray-600"
              : isScreenShareEnabled
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-gray-700 hover:bg-gray-600"
          }`}
          aria-label="Toggle screen share"
          title={
            isScreenShareSupported
              ? "Toggle screen share"
              : "Screen sharing is not supported in this browser"
          }
        >
          <MonitorUp size={18} />
        </button>
      ) : null}

      <button
        onClick={isRinging ? cancelOutgoingCall : endCall}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-500 sm:h-14 sm:w-14"
        aria-label="End call"
      >
        <PhoneOff size={22} />
      </button>
    </div>
  );

  if (isDesktopViewport && isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-white/10 bg-gray-950 px-3 py-2 text-left text-white shadow-2xl shadow-black/30 transition hover:-translate-y-0.5 hover:bg-gray-900"
        aria-label="Restore call window"
      >
        {avatarNode}
        <div className="min-w-0">
          <p className="max-w-40 truncate text-sm font-semibold">{callTitle}</p>
          <p className="text-xs text-gray-400">{statusText}</p>
          <p className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
            {isMicEnabled ? <Mic size={12} /> : <MicOff size={12} className="text-red-400" />}
            {activeCall.video ? (
              isCameraEnabled ? <Video size={12} /> : <VideoOff size={12} className="text-red-400" />
            ) : null}
          </p>
        </div>
      </button>
    );
  }

  return (
    <div
      className={`fixed z-[100] flex flex-col overflow-hidden bg-black text-white shadow-2xl ${
        isFloatingDesktop
          ? "rounded-2xl border border-white/10 shadow-black/35"
          : "inset-0"
      }`}
      style={
        isFloatingDesktop
          ? {
              left: windowRect.x,
              top: windowRect.y,
              width: windowRect.width,
              height: windowRect.height,
            }
          : undefined
      }
    >
      {isFloatingDesktop
        ? resizeHandles.map((handle) => (
            <span
              key={handle.direction}
              aria-hidden="true"
              onPointerDown={(event) =>
                beginWindowInteraction(event, "resize", handle.direction)
              }
              className={`absolute z-20 ${handle.className}`}
            />
          ))
        : null}

      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
          isFloatingDesktop ? "cursor-grab select-none active:cursor-grabbing" : ""
        }`}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          beginWindowInteraction(event, "move");
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {avatarNode}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{callTitle}</p>
            <p className="text-xs text-gray-400">{statusText}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {activeError ? (
            <p className="hidden max-w-[16rem] truncate text-right text-xs text-red-400 sm:block">
              {activeError}
            </p>
          ) : null}
          {isDesktopViewport ? (
            <>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gray-200 transition hover:bg-white/15"
                aria-label="Minimize call"
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gray-200 transition hover:bg-white/15"
                aria-label={isFullscreen ? "Restore call window" : "Fullscreen call"}
              >
                {isFullscreen ? <Move size={16} /> : <Maximize2 size={16} />}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {activeError ? (
        <p className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 sm:hidden">
          {activeError}
        </p>
      ) : null}

      {callBody}
      {callControls}
    </div>
  );
}
