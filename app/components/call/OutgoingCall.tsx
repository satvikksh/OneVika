"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { PhoneOff, Video, Phone } from "lucide-react";

export interface OutgoingCallProps {
  peerName: string;
  peerAvatar?: string | null;
  callType: "audio" | "video";
  isGroup: boolean;
  statusLabel: string;
  onCancel: () => void;
}

export default function OutgoingCall({
  peerName,
  peerAvatar,
  callType,
  isGroup,
  statusLabel,
  onCancel,
}: OutgoingCallProps) {
  const initial = peerName?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-[130] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-black px-6 py-14 text-white">
      <div className="flex flex-col items-center gap-6 pt-10">
        <div className="relative flex items-center justify-center">
          <motion.span
            className="absolute h-40 w-40 rounded-full bg-white/10"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white/10 bg-white/10 text-4xl font-semibold">
            {peerAvatar ? (
              <Image
                src={peerAvatar}
                alt={peerName}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">{peerName}</h2>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-white/70">
            {callType === "video" ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            {statusLabel}
            {isGroup ? " · Group call" : ""}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel call"
        className="flex flex-col items-center gap-2"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 transition-transform hover:scale-105">
          <PhoneOff className="h-7 w-7" />
        </span>
        <span className="text-xs text-white/70">Cancel</span>
      </button>
    </div>
  );
}
