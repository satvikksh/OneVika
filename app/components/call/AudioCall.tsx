"use client";

import React, { useEffect, useRef } from "react";
import { Participant, Track } from "livekit-client";
import { motion } from "framer-motion";
import { Signal } from "lucide-react";
import Image from "next/image";
import CallControls, { CallControlsProps } from "./CallControls";
import { getTrackForSource } from "@/app/hooks/useLiveKit";

/** Attaches a single remote participant's audio so the caller can be heard. */
function RemoteAudio({
  participant,
  version,
  audioMuted = false,
}: {
  participant: Participant;
  version: number;
  audioMuted?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = audioRef.current;
    const track = getTrackForSource(participant, Track.Source.Microphone);
    if (element && track) {
      track.attach(element);
      element.muted = audioMuted;
      return () => {
        track.detach(element);
      };
    }
  }, [participant, version, audioMuted]);

  return <audio ref={audioRef} autoPlay />;
}

export interface AudioCallProps
  extends Omit<CallControlsProps, "callType" | "onToggleCamera" | "onToggleScreenShare" | "onSwitchCamera"> {
  participants: Participant[];
  activeSpeakerIds: string[];
  version: number;
  isGroup: boolean;
  peerName: string;
  peerAvatar?: string | null;
  statusLabel: string;
  timerText: string | null;
  connectionLabel: string;
  reconnecting: boolean;
  audioMuted?: boolean;
}

export default function AudioCall({
  participants,
  activeSpeakerIds,
  version,
  isGroup,
  peerName,
  peerAvatar,
  statusLabel,
  timerText,
  connectionLabel,
  reconnecting,
  audioMuted = false,
  ...controls
}: AudioCallProps) {
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const anySpeaking = activeSpeakerIds.some((id) =>
    remoteParticipants.some((p) => p.identity === id)
  );
  const initial = peerName?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-black px-6 py-10 text-white">
      {remoteParticipants.map((participant) => (
        <RemoteAudio
          key={participant.sid || participant.identity}
          participant={participant}
          version={version}
          audioMuted={audioMuted}
        />
      ))}

      {/* Top status */}
      <div className="flex flex-col items-center gap-1 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-sm text-white/70">
          {isGroup ? "Group audio call" : "Audio call"}
        </span>
        <span className="flex items-center gap-1 text-xs text-white/60">
          <Signal className="h-3 w-3" />
          {connectionLabel}
        </span>
      </div>

      {/* Center: avatar + name + timer */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          {anySpeaking ? (
            <>
              <motion.span
                className="absolute h-40 w-40 rounded-full bg-emerald-400/20"
                animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              />
              <motion.span
                className="absolute h-40 w-40 rounded-full bg-emerald-400/20"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6, delay: 0.4 }}
              />
            </>
          ) : null}
          <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white/10 bg-white/10 text-5xl font-semibold">
            {peerAvatar ? (
              <Image
                src={peerAvatar}
                alt={peerName}
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">{peerName}</h2>
          <p className="mt-1 text-sm text-white/70">
            {timerText ?? statusLabel}
          </p>
          {reconnecting ? (
            <p className="mt-1 text-xs text-amber-300">Reconnecting…</p>
          ) : null}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <CallControls callType="audio" {...controls} />
      </div>
    </div>
  );
}
