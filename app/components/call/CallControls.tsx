"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  SwitchCamera,
  Volume2,
  VolumeX,
  MessageSquare,
  Users,
} from "lucide-react";

interface ControlButtonProps {
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ControlButton({
  onClick,
  active = false,
  danger = false,
  label,
  children,
  disabled = false,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-14 ${
        danger
          ? "bg-red-600 text-white hover:bg-red-700"
          : active
            ? "bg-white text-gray-900"
            : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {children}
    </button>
  );
}

export interface CallControlsProps {
  callType: "audio" | "video";
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  speakerEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onSwitchCamera?: () => void;
  onToggleSpeaker?: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  onEnd: () => void;
}

export default function CallControls({
  callType,
  micEnabled,
  cameraEnabled,
  screenShareEnabled,
  speakerEnabled,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSwitchCamera,
  onToggleSpeaker,
  onToggleChat,
  onToggleParticipants,
  onEnd,
}: CallControlsProps) {
  const isVideo = callType === "video";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      <ControlButton
        onClick={onToggleMic}
        active={!micEnabled}
        label={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </ControlButton>

      {isVideo ? (
        <ControlButton
          onClick={onToggleCamera}
          active={!cameraEnabled}
          label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        >
          {cameraEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </ControlButton>
      ) : null}

      {onToggleSpeaker ? (
        <ControlButton
          onClick={onToggleSpeaker}
          active={!speakerEnabled}
          label={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
        >
          {speakerEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </ControlButton>
      ) : null}

      {isVideo && onToggleScreenShare ? (
        <ControlButton
          onClick={onToggleScreenShare}
          active={screenShareEnabled}
          label={screenShareEnabled ? "Stop screen share" : "Share screen"}
        >
          <MonitorUp className="h-5 w-5" />
        </ControlButton>
      ) : null}

      {isVideo && onSwitchCamera ? (
        <ControlButton onClick={onSwitchCamera} label="Switch camera">
          <SwitchCamera className="h-5 w-5" />
        </ControlButton>
      ) : null}

      {onToggleChat ? (
        <ControlButton onClick={onToggleChat} label="Open chat">
          <MessageSquare className="h-5 w-5" />
        </ControlButton>
      ) : null}

      {onToggleParticipants ? (
        <ControlButton onClick={onToggleParticipants} label="Participants">
          <Users className="h-5 w-5" />
        </ControlButton>
      ) : null}

      <ControlButton onClick={onEnd} danger label="End call">
        <PhoneOff className="h-5 w-5" />
      </ControlButton>
    </div>
  );
}
