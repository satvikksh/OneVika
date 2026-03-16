"use client";

import type { FaceMeshLandmark } from "./mediapipe-face-mesh";

export type BlinkCameraConstraints = Exclude<
  MediaStreamConstraints["video"],
  undefined
>;

type EyeState = "OPEN" | "CLOSED";

interface BlinkDetectorCallbacks {
  onBlink?: () => void;
  onDoubleBlink?: () => void;
  onTripleBlink?: () => void;
  onEyeStateChange?: (state: EyeState) => void;
}

interface BlinkDetector {
  dispose(): void;
  markFaceMissing(timestamp?: number): void;
  processLandmarks(landmarks: FaceMeshLandmark[], timestamp?: number): void;
  reset(): void;
}

interface BlinkDetectorState {
  baselineEar: number | null;
  closedFrames: number;
  closedSince: number | null;
  cooldownUntil: number;
  isClosed: boolean;
  lastFaceSeenAt: number;
  openFrames: number;
  openReferenceSamples: number[];
  reportedEyeState: EyeState;
  sequenceCount: number;
  sequenceTimer: ReturnType<typeof setTimeout> | null;
  smoothedEar: number | null;
}

const MOBILE_DEVICE_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

const DEFAULT_OPEN_REFERENCE_EAR = 0.28;
const MAX_OPEN_REFERENCE_EAR = 0.38;
const MIN_OPEN_REFERENCE_EAR = 0.2;
const MAX_OPEN_REFERENCE_SAMPLES = 24;
const CLOSED_FRAME_REQUIREMENT = 2;
const OPEN_FRAME_REQUIREMENT = 1;
const MIN_BLINK_DURATION_MS = 55;
const MAX_BLINK_DURATION_MS = 420;
const GESTURE_SEQUENCE_WINDOW_MS = 900;
const GESTURE_COOLDOWN_MS = 900;
const FACE_MISSING_RESET_MS = 240;

const LEFT_EYE = {
  horizontal: [33, 133] as const,
  vertical: [
    [160, 144],
    [158, 153],
  ] as const,
};

const RIGHT_EYE = {
  horizontal: [362, 263] as const,
  vertical: [
    [385, 380],
    [387, 373],
  ] as const,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) {
    return DEFAULT_OPEN_REFERENCE_EAR;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function distance(a: FaceMeshLandmark, b: FaceMeshLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computeEyeAspectRatio(
  landmarks: FaceMeshLandmark[],
  eye: typeof LEFT_EYE | typeof RIGHT_EYE
) {
  const horizontalDistance = distance(
    landmarks[eye.horizontal[0]],
    landmarks[eye.horizontal[1]]
  );

  if (!Number.isFinite(horizontalDistance) || horizontalDistance <= 0) {
    return 0;
  }

  const verticalDistance = average(
    eye.vertical.map(([topIndex, bottomIndex]) =>
      distance(landmarks[topIndex], landmarks[bottomIndex])
    )
  );

  return verticalDistance / horizontalDistance;
}

function getAdaptiveThresholds(baselineEar: number | null) {
  const baseline = clamp(
    baselineEar ?? DEFAULT_OPEN_REFERENCE_EAR,
    MIN_OPEN_REFERENCE_EAR,
    MAX_OPEN_REFERENCE_EAR
  );
  const closedThreshold = clamp(baseline * 0.68, 0.13, 0.23);
  const openThreshold = clamp(
    Math.max(closedThreshold + 0.035, baseline * 0.82),
    closedThreshold + 0.035,
    MAX_OPEN_REFERENCE_EAR
  );

  return { baseline, closedThreshold, openThreshold };
}

function updateOpenReference(
  state: BlinkDetectorState,
  smoothedEar: number,
  baseline: number
) {
  const shouldSeed =
    state.openReferenceSamples.length < 6 &&
    smoothedEar >= MIN_OPEN_REFERENCE_EAR * 0.9;
  const shouldUpdate = smoothedEar >= baseline * 0.85;

  if (!shouldSeed && !shouldUpdate) {
    return;
  }

  state.openReferenceSamples.push(smoothedEar);
  if (state.openReferenceSamples.length > MAX_OPEN_REFERENCE_SAMPLES) {
    state.openReferenceSamples.shift();
  }

  const sortedSamples = [...state.openReferenceSamples].sort((a, b) => a - b);
  const upperHalf = sortedSamples.slice(Math.floor(sortedSamples.length / 2));
  state.baselineEar = clamp(
    average(upperHalf),
    MIN_OPEN_REFERENCE_EAR,
    MAX_OPEN_REFERENCE_EAR
  );
}

function getNow(timestamp?: number) {
  if (typeof timestamp === "number") {
    return timestamp;
  }

  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

function getErrorName(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof DOMException) {
    return error.name;
  }

  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    typeof (error as { name: unknown }).name === "string"
  ) {
    return (error as { name: string }).name;
  }

  return "";
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof DOMException) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "";
}

function createInitialState(): BlinkDetectorState {
  return {
    baselineEar: null,
    closedFrames: 0,
    closedSince: null,
    cooldownUntil: 0,
    isClosed: false,
    lastFaceSeenAt: 0,
    openFrames: 0,
    openReferenceSamples: [],
    reportedEyeState: "OPEN",
    sequenceCount: 0,
    sequenceTimer: null,
    smoothedEar: null,
  };
}

export function isLikelyMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const uaData = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
    };
  };
  const coarsePointer =
    typeof window !== "undefined" &&
    "matchMedia" in window &&
    window.matchMedia("(pointer: coarse)").matches;

  return (
    Boolean(uaData.userAgentData?.mobile) ||
    MOBILE_DEVICE_PATTERN.test(navigator.userAgent || "") ||
    coarsePointer
  );
}

export function getBlinkCameraProfiles(
  isMobile: boolean
): BlinkCameraConstraints[] {
  const mobileOptimizedConstraints: MediaTrackConstraints = {
    facingMode: { ideal: "user" },
    frameRate: { ideal: isMobile ? 24 : 30, max: 30 },
    height: { ideal: isMobile ? 480 : 540, max: isMobile ? 720 : 960 },
    width: { ideal: isMobile ? 640 : 960, max: isMobile ? 960 : 1280 },
  };

  const legacyFrontCameraConstraints: MediaTrackConstraints = {
    ...mobileOptimizedConstraints,
    facingMode: "user",
  };

  const relaxedConstraints: MediaTrackConstraints = {
    frameRate: { ideal: isMobile ? 20 : 24, max: 30 },
    height: { ideal: isMobile ? 480 : 540 },
    width: { ideal: isMobile ? 640 : 960 },
  };

  return [
    mobileOptimizedConstraints,
    legacyFrontCameraConstraints,
    relaxedConstraints,
    true,
  ];
}

export function shouldRetryBlinkCamera(
  error: unknown,
  attemptIndex: number,
  totalAttempts: number
) {
  if (attemptIndex >= totalAttempts - 1) {
    return false;
  }

  const errorName = getErrorName(error);
  const errorMessage = getErrorMessage(error).toLowerCase();

  return (
    errorName === "OverconstrainedError" ||
    errorName === "ConstraintNotSatisfiedError" ||
    errorName === "NotFoundError" ||
    errorMessage.includes("constraint") ||
    errorMessage.includes("facing mode")
  );
}

export function getBlinkCameraErrorMessage(error: unknown) {
  const errorName = getErrorName(error);
  const errorMessage = getErrorMessage(error).toLowerCase();

  if (
    errorName === "NotAllowedError" ||
    errorName === "PermissionDeniedError" ||
    errorName === "SecurityError"
  ) {
    return "Camera access is required for eye navigation. Please allow access and try again.";
  }

  if (errorName === "NotFoundError") {
    return "No camera was found on this device for eye navigation.";
  }

  if (
    errorName === "NotReadableError" ||
    errorName === "TrackStartError" ||
    errorMessage.includes("already in use")
  ) {
    return "Your camera is busy in another app or browser tab. Close it there and try again.";
  }

  return "Camera access is required for eye navigation.";
}

export function createBlinkDetector(
  callbacks: BlinkDetectorCallbacks = {}
): BlinkDetector {
  const state = createInitialState();

  const emitEyeState = (nextState: EyeState) => {
    if (state.reportedEyeState === nextState) {
      return;
    }

    state.reportedEyeState = nextState;
    callbacks.onEyeStateChange?.(nextState);
  };

  const clearSequenceTimer = () => {
    if (!state.sequenceTimer) {
      return;
    }

    clearTimeout(state.sequenceTimer);
    state.sequenceTimer = null;
  };

  const finalizeSequence = () => {
    const blinkCount = state.sequenceCount;
    state.sequenceCount = 0;
    clearSequenceTimer();

    if (blinkCount >= 3) {
      callbacks.onTripleBlink?.();
      state.cooldownUntil = getNow() + GESTURE_COOLDOWN_MS;
      return;
    }

    if (blinkCount >= 2) {
      callbacks.onDoubleBlink?.();
      state.cooldownUntil = getNow() + GESTURE_COOLDOWN_MS;
    }
  };

  const resetClosedState = () => {
    state.closedFrames = 0;
    state.closedSince = null;
    state.isClosed = false;
    state.openFrames = 0;
    emitEyeState("OPEN");
  };

  return {
    dispose() {
      clearSequenceTimer();
    },

    markFaceMissing(timestamp) {
      const now = getNow(timestamp);

      if (state.lastFaceSeenAt === 0) {
        return;
      }

      if (now - state.lastFaceSeenAt >= FACE_MISSING_RESET_MS) {
        resetClosedState();
      }

      if (now - state.lastFaceSeenAt >= GESTURE_SEQUENCE_WINDOW_MS) {
        state.sequenceCount = 0;
        clearSequenceTimer();
      }
    },

    processLandmarks(landmarks, timestamp) {
      if (landmarks.length < RIGHT_EYE.vertical[1][1] + 1) {
        return;
      }

      const now = getNow(timestamp);
      state.lastFaceSeenAt = now;

      const leftEar = computeEyeAspectRatio(landmarks, LEFT_EYE);
      const rightEar = computeEyeAspectRatio(landmarks, RIGHT_EYE);
      const rawEar = (leftEar + rightEar) / 2;

      if (!Number.isFinite(rawEar) || rawEar <= 0) {
        return;
      }

      state.smoothedEar =
        state.smoothedEar === null
          ? rawEar
          : state.smoothedEar * 0.6 + rawEar * 0.4;

      const smoothedEar = state.smoothedEar;
      const { baseline, closedThreshold, openThreshold } =
        getAdaptiveThresholds(state.baselineEar);

      if (!state.isClosed) {
        updateOpenReference(state, smoothedEar, baseline);
      }

      if (now < state.cooldownUntil) {
        resetClosedState();
        return;
      }

      if (state.isClosed) {
        if (smoothedEar >= openThreshold) {
          state.openFrames += 1;
        } else {
          state.openFrames = 0;
        }

        if (state.openFrames < OPEN_FRAME_REQUIREMENT) {
          return;
        }

        const blinkDuration = state.closedSince ? now - state.closedSince : 0;
        resetClosedState();

        if (
          blinkDuration < MIN_BLINK_DURATION_MS ||
          blinkDuration > MAX_BLINK_DURATION_MS
        ) {
          return;
        }

        callbacks.onBlink?.();
        state.sequenceCount += 1;
        clearSequenceTimer();
        state.sequenceTimer = setTimeout(
          finalizeSequence,
          GESTURE_SEQUENCE_WINDOW_MS
        );
        return;
      }

      if (smoothedEar <= closedThreshold) {
        state.closedFrames += 1;
      } else {
        state.closedFrames = 0;
      }

      if (state.closedFrames < CLOSED_FRAME_REQUIREMENT) {
        return;
      }

      state.closedSince = now;
      state.isClosed = true;
      state.openFrames = 0;
      emitEyeState("CLOSED");
    },

    reset() {
      clearSequenceTimer();
      const nextState = createInitialState();
      Object.assign(state, nextState);
    },
  };
}
