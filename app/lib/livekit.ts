"use client";

import { RoomOptions, VideoPresets } from "livekit-client";

/** Public LiveKit websocket URL, resolved on the client. */
export function getLiveKitClientUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
}

/** Sensible defaults tuned for adaptive, bandwidth-friendly calls. */
export const defaultRoomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
  publishDefaults: {
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720],
  },
};

/** Human-friendly network quality label from a LiveKit ConnectionQuality score. */
export function describeConnectionQuality(quality: number): string {
  if (quality >= 3) return "Excellent";
  if (quality >= 2) return "Good";
  if (quality >= 1) return "Poor";
  return "Lost";
}

export interface PermissionRequestResult {
  granted: boolean;
  error?: string;
}

/**
 * Requests camera/microphone permission up-front so we can surface a graceful
 * error before attempting to join the LiveKit room.
 */
export async function requestMediaPermissions(
  video: boolean
): Promise<PermissionRequestResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, error: "Media devices are not available in this browser" };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });
    // Immediately release; LiveKit re-acquires when publishing.
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true };
  } catch (error) {
    const name = (error as DOMException)?.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { granted: false, error: "Camera/microphone permission was denied" };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        granted: false,
        error: video ? "No camera or microphone found" : "No microphone found",
      };
    }
    if (name === "NotReadableError") {
      return { granted: false, error: "Your camera or microphone is already in use" };
    }
    return { granted: false, error: "Unable to access media devices" };
  }
}
