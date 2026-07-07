"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Phone, PhoneOff, Video } from "lucide-react";

export interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string | null;
  callType: "audio" | "video";
  isGroup: boolean;
  groupName?: string;
  accepting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  callerName,
  callerAvatar,
  callType,
  isGroup,
  groupName,
  accepting,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const title = isGroup && groupName ? groupName : callerName;
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-[130] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-black px-6 py-14 text-white">
      <div className="flex flex-col items-center gap-6 pt-10">
        <div className="relative flex items-center justify-center">
          <motion.span
            className="absolute h-40 w-40 rounded-full bg-white/10"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white/10 bg-white/10 text-4xl font-semibold">
            {callerAvatar ? (
              <Image
                src={callerAvatar}
                alt={title}
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
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-white/70">
            {callType === "video" ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            Incoming {isGroup ? "group " : ""}
            {callType} call…
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-xs items-center justify-between">
        <button
          type="button"
          onClick={onDecline}
          aria-label="Decline call"
          className="flex flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 transition-transform hover:scale-105">
            <PhoneOff className="h-7 w-7" />
          </span>
          <span className="text-xs text-white/70">Decline</span>
        </button>

        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          aria-label="Accept call"
          className="flex flex-col items-center gap-2 disabled:opacity-60"
        >
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 transition-transform hover:scale-105"
          >
            {callType === "video" ? (
              <Video className="h-7 w-7" />
            ) : (
              <Phone className="h-7 w-7" />
            )}
          </motion.span>
          <span className="text-xs text-white/70">
            {accepting ? "Joining…" : "Accept"}
          </span>
        </button>
      </div>
    </div>
  );
}
