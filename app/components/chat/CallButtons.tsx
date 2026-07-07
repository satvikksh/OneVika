"use client";

import React from "react";
import { Phone, Video } from "lucide-react";
import { useCall, StartCallTarget } from "@/app/context/CallContext";

interface CallButtonsProps {
  target: StartCallTarget;
  disabled?: boolean;
  /** Hide the video button on very small headers if needed. */
  hideVideoOnMobile?: boolean;
  size?: number;
}

export default function CallButtons({
  target,
  disabled = false,
  hideVideoOnMobile = false,
  size = 18,
}: CallButtonsProps) {
  const { startCall, isBusy } = useCall();

  const isDisabled = disabled || isBusy;

  const baseClass =
    "rounded-xl p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      <button
        type="button"
        onClick={() => startCall(target, "audio")}
        disabled={isDisabled}
        className={baseClass}
        aria-label={`Start audio call${target.name ? ` with ${target.name}` : ""}`}
        title="Audio call"
      >
        <Phone size={size} />
      </button>

      <button
        type="button"
        onClick={() => startCall(target, "video")}
        disabled={isDisabled}
        className={`${baseClass} ${hideVideoOnMobile ? "hidden sm:inline-flex" : ""}`}
        aria-label={`Start video call${target.name ? ` with ${target.name}` : ""}`}
        title="Video call"
      >
        <Video size={size} />
      </button>
    </>
  );
}
