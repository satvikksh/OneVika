"use client";

import React, { useEffect, useRef } from "react";
import { Participant, Track } from "livekit-client";
import { MicOff, User as UserIcon } from "lucide-react";
import { getTrackForSource } from "@/app/hooks/useLiveKit";

interface ParticipantTileProps {
  participant: Participant;
  isSpeaking: boolean;
  /** Increment to force re-attaching media when tracks change. */
  version: number;
  compact?: boolean;
  audioMuted?: boolean;
}

function ParticipantTile({
  participant,
  isSpeaking,
  version,
  compact = false,
  audioMuted = false,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const screenTrack = getTrackForSource(participant, Track.Source.ScreenShare);
  const cameraTrack = getTrackForSource(participant, Track.Source.Camera);
  const videoTrack = screenTrack || cameraTrack;
  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const isCameraEnabled = Boolean(videoTrack) && !cameraPublication?.isMuted;
  const micPublication = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = !micPublication || micPublication.isMuted;

  useEffect(() => {
    const element = videoRef.current;
    if (element && videoTrack) {
      videoTrack.attach(element);
      return () => {
        videoTrack.detach(element);
      };
    }
    // version intentionally in deps to re-attach on track changes.
  }, [videoTrack, version]);

  useEffect(() => {
    const element = audioRef.current;
    const audioTrack = getTrackForSource(participant, Track.Source.Microphone);
    if (element && audioTrack && !participant.isLocal) {
      audioTrack.attach(element);
      element.muted = audioMuted;
      return () => {
        audioTrack.detach(element);
      };
    }
  }, [participant, version, audioMuted]);

  const displayName = participant.name || participant.identity;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-black transition-all ${
        isSpeaking ? "ring-2 ring-emerald-400" : "ring-1 ring-white/10"
      }`}
    >
      {isCameraEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`h-full w-full object-cover ${
            participant.isLocal && !screenTrack ? "-scale-x-100" : ""
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-white/80">
          <div
            className={`flex items-center justify-center rounded-full bg-white/10 ${
              compact ? "h-12 w-12" : "h-20 w-20"
            }`}
          >
            <UserIcon className={compact ? "h-6 w-6" : "h-10 w-10"} />
          </div>
        </div>
      )}

      {!participant.isLocal ? <audio ref={audioRef} autoPlay /> : null}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <span className="truncate text-xs font-medium text-white sm:text-sm">
          {displayName}
          {participant.isLocal ? " (You)" : ""}
        </span>
        {isMuted ? (
          <MicOff className="h-4 w-4 flex-shrink-0 text-red-400" />
        ) : null}
      </div>
    </div>
  );
}

interface ParticipantGridProps {
  participants: Participant[];
  activeSpeakerIds: string[];
  version: number;
  audioMuted?: boolean;
}

export default function ParticipantGrid({
  participants,
  activeSpeakerIds,
  version,
  audioMuted = false,
}: ParticipantGridProps) {
  const count = participants.length;
  const gridClass =
    count <= 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : count <= 4
          ? "grid-cols-2"
          : count <= 9
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-3 sm:grid-cols-4";

  return (
    <div className={`grid h-full w-full gap-2 p-2 sm:gap-3 sm:p-3 ${gridClass}`}>
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.sid || participant.identity}
          participant={participant}
          isSpeaking={activeSpeakerIds.includes(participant.identity)}
          version={version}
          compact={count > 4}
          audioMuted={audioMuted}
        />
      ))}
    </div>
  );
}
