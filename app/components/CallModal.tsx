"use client";

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MonitorUp,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCall } from "../context/CallContext";
import CallParticipantTile from "./CallParticipantTile";

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
    isScreenShareEnabled,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    toggleScreenShare,
    connectError,
  } = useCall();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  // Incoming call, not yet accepted/rejected, and not already on a call.
  if (incomingCall && !activeCall) {
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

  if (!activeCall) return null;

  const isRinging = activeCall.status === "ringing-outgoing";
  const otherNames = activeCall.participants.map((p) => p.name || p.id).join(", ");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-semibold">
            {activeCall.isGroup ? "Group call" : otherNames}
          </p>
          <p className="text-xs text-gray-400">
            {isRinging
              ? "Ringing…"
              : activeCall.status === "connecting"
                ? "Connecting…"
                : formattedDuration}
          </p>
        </div>
        {connectError ? (
          <p className="text-xs text-red-400">{connectError}</p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {isRinging ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <div className="flex h-28 w-28 animate-pulse items-center justify-center overflow-hidden rounded-full bg-blue-600/20 ring-4 ring-white/10">
              {activeCall.participants[0]?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeCall.participants[0].avatar ?? ""} alt="" className="h-full w-full object-cover" />
              ) : activeCall.video ? (
                <Video size={36} />
              ) : (
                <Phone size={36} />
              )}
            </div>
            <p className="text-lg font-medium text-white">{otherNames}</p>
            <p className="text-sm">{activeCall.status === "connecting" ? "Connecting…" : "Calling…"}</p>
          </div>
        ) : !activeCall.video ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gray-800 ring-4 ring-white/10">
              {activeCall.participants[0]?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeCall.participants[0].avatar ?? ""} alt="" className="h-full w-full object-cover" />
              ) : (
                <Phone size={42} className="text-gray-300" />
              )}
            </div>
            <div>
              <p className="text-xl font-semibold">{otherNames}</p>
              <p className="mt-1 text-sm text-gray-400">{formattedDuration}</p>
            </div>
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

      <div className="flex items-center justify-center gap-4 px-5 py-6">
        <button
          onClick={toggleMic}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            isMicEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"
          }`}
          aria-label="Toggle microphone"
        >
          {isMicEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {activeCall.video ? (
          <button
            onClick={toggleCamera}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isCameraEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-500"
            }`}
            aria-label="Toggle camera"
          >
            {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
        ) : null}

        <button
          onClick={toggleSpeaker}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            isSpeakerEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
          aria-label="Toggle speaker"
        >
          {isSpeakerEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {activeCall.video ? (
          <button
            onClick={toggleScreenShare}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isScreenShareEnabled ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-700 hover:bg-gray-600"
            }`}
            aria-label="Toggle screen share"
          >
            <MonitorUp size={18} />
          </button>
        ) : null}

        <button
          onClick={isRinging ? cancelOutgoingCall : endCall}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-500"
          aria-label="End call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
