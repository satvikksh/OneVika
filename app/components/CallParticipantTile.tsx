"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, User } from "lucide-react";
import type { CallTile } from "../hooks/useLiveKitRoom";

export default function CallParticipantTile({
  tile,
  compact = false,
  fill = false,
}: {
  tile: CallTile;
  compact?: boolean;
  fill?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !tile.videoTrack) return;
    tile.videoTrack.attach(el);
    return () => {
      tile.videoTrack?.detach(el);
    };
  }, [tile.videoTrack]);

  const showVideo = tile.isCameraEnabled && tile.videoTrack;

  return (
    <div
      className={`relative flex ${
        fill ? "h-full w-full" : "aspect-video w-full"
      } items-center justify-center overflow-hidden ${
        compact ? "rounded-xl" : "rounded-2xl"
      } bg-gray-900 ${
        tile.isSpeaking ? "ring-2 ring-blue-500" : ""
      }`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={tile.isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-800 to-gray-950 text-gray-300">
          <div className={`${compact ? "h-10 w-10" : "h-16 w-16"} flex items-center justify-center rounded-full bg-gray-700`}>
            <User size={compact ? 20 : 28} />
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
        {tile.isMicEnabled ? <Mic size={12} /> : <MicOff size={12} className="text-red-400" />}
        <span className={`${compact ? "max-w-[72px]" : "max-w-[120px]"} truncate font-medium`}>
          {tile.isLocal ? "You" : tile.name}
        </span>
      </div>
    </div>
  );
}
