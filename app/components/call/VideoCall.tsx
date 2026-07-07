"use client";

import React, { useMemo } from "react";
import { Participant } from "livekit-client";
import { motion } from "framer-motion";
import { Loader2, Signal } from "lucide-react";
import ParticipantGrid from "./ParticipantGrid";
import CallControls, { CallControlsProps } from "./CallControls";

export interface VideoCallProps
  extends Omit<CallControlsProps, "callType"> {
  participants: Participant[];
  activeSpeakerIds: string[];
  version: number;
  isGroup: boolean;
  peerName: string;
  statusLabel: string;
  timerText: string | null;
  connectionLabel: string;
  reconnecting: boolean;
  audioMuted?: boolean;
}

export default function VideoCall({
  participants,
  activeSpeakerIds,
  version,
  isGroup,
  peerName,
  statusLabel,
  timerText,
  connectionLabel,
  reconnecting,
  audioMuted = false,
  ...controls
}: VideoCallProps) {
  const localParticipant = useMemo(
    () => participants.find((participant) => participant.isLocal),
    [participants]
  );
  const remoteParticipants = useMemo(
    () => participants.filter((participant) => !participant.isLocal),
    [participants]
  );

  const hasRemote = remoteParticipants.length > 0;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black text-white">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold sm:text-lg">{peerName}</h2>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span>{timerText ?? statusLabel}</span>
            <span className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              {connectionLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Main stage */}
      <div className="relative flex-1 overflow-hidden">
        {hasRemote ? (
          <ParticipantGrid
            participants={isGroup ? participants : remoteParticipants}
            activeSpeakerIds={activeSpeakerIds}
            version={version}
            audioMuted={audioMuted}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10"
            >
              <Loader2 className="h-8 w-8 animate-spin" />
            </motion.div>
            <p className="text-sm text-white/70">{statusLabel}</p>
          </div>
        )}

        {/* Local floating preview (only for 1:1 once remote joined) */}
        {!isGroup && hasRemote && localParticipant ? (
          <motion.div
            drag
            dragMomentum={false}
            className="absolute bottom-28 right-4 h-40 w-28 cursor-grab overflow-hidden rounded-2xl border border-white/20 shadow-2xl sm:h-48 sm:w-36"
          >
            <ParticipantGrid
              participants={[localParticipant]}
              activeSpeakerIds={activeSpeakerIds}
              version={version}
            />
          </motion.div>
        ) : null}

        {reconnecting ? (
          <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs">
            Reconnecting…
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
        <CallControls callType="video" {...controls} />
      </div>
    </div>
  );
}
