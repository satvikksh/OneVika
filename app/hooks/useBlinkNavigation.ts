"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam, { type WebcamProps } from "react-webcam";
import {
  createBlinkDetector,
  getBlinkCameraErrorMessage,
  getBlinkCameraProfiles,
  isLikelyMobileDevice,
  shouldRetryBlinkCamera,
  type BlinkCameraConstraints,
} from "../lib/blink-navigation";
import {
  createFaceMeshInstance,
  type FaceMeshInstance,
} from "../lib/mediapipe-face-mesh";

const DESKTOP_FRAME_INTERVAL_MS = 60;
const MOBILE_FRAME_INTERVAL_MS = 85;

type BlinkWebcamProps = Pick<
  WebcamProps,
  | "audio"
  | "disablePictureInPicture"
  | "mirrored"
  | "muted"
  | "onUserMedia"
  | "onUserMediaError"
  | "playsInline"
  | "screenshotFormat"
  | "videoConstraints"
>;

export function useBlinkNavigation(
  onDoubleBlink: () => void,
  onTripleBlink: () => void,
  enabled: boolean,
  paused = false
) {
  const webcamRef = useRef<Webcam>(null);
  const detectorRef = useRef<ReturnType<typeof createBlinkDetector> | null>(
    null
  );
  const requestRef = useRef<number | null>(null);
  const cameraReadyRef = useRef(false);
  const isProcessingRef = useRef(false);
  const modelRef = useRef<FaceMeshInstance | null>(null);
  const frameIntervalRef = useRef(DESKTOP_FRAME_INTERVAL_MS);
  const lastProcessedAtRef = useRef(0);
  const pausedRef = useRef(paused);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraProfileIndex, setCameraProfileIndex] = useState(0);
  const [cameraProfiles, setCameraProfiles] = useState<BlinkCameraConstraints[]>(
    () => getBlinkCameraProfiles(false)
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [isRetryingCamera, setIsRetryingCamera] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleUserMedia = useCallback(() => {
    cameraReadyRef.current = true;
    setCameraReady(true);
    setCameraError(null);
    setIsRetryingCamera(false);
  }, []);

  const handleUserMediaError = useCallback(
    (error: string | DOMException) => {
      cameraReadyRef.current = false;
      setCameraReady(false);

      if (
        shouldRetryBlinkCamera(error, cameraProfileIndex, cameraProfiles.length)
      ) {
        setIsRetryingCamera(true);
        setCameraError(null);
        setCameraProfileIndex((currentIndex) =>
          Math.min(currentIndex + 1, cameraProfiles.length - 1)
        );
        return;
      }

      setIsRetryingCamera(false);
      setCameraError(getBlinkCameraErrorMessage(error));
    },
    [cameraProfileIndex, cameraProfiles.length]
  );

  useEffect(() => {
    if (!enabled) {
      detectorRef.current?.dispose();
      detectorRef.current = null;
      cameraReadyRef.current = false;
      setCameraError(null);
      setCameraReady(false);
      setIsRetryingCamera(false);
      setModelError(null);
      setModelReady(false);
      return;
    }

    const isMobile = isLikelyMobileDevice();
    frameIntervalRef.current = isMobile
      ? MOBILE_FRAME_INTERVAL_MS
      : DESKTOP_FRAME_INTERVAL_MS;

    setCameraProfiles(getBlinkCameraProfiles(isMobile));
    setCameraProfileIndex(0);
    cameraReadyRef.current = false;
    setCameraError(null);
    setCameraReady(false);
    setIsRetryingCamera(false);
    setModelError(null);
    setModelReady(false);
    lastProcessedAtRef.current = 0;

    detectorRef.current?.dispose();
    detectorRef.current = createBlinkDetector({
      onDoubleBlink,
      onTripleBlink,
    });

    let cancelled = false;

    const detect = async (timestamp: number) => {
      if (cancelled) {
        return;
      }

      if (pausedRef.current || document.hidden) {
        detectorRef.current?.markFaceMissing(timestamp);
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      if (timestamp - lastProcessedAtRef.current < frameIntervalRef.current) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = webcamRef.current?.video;
      const model = modelRef.current;

      if (
        video &&
        model &&
        cameraReadyRef.current &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !isProcessingRef.current
      ) {
        lastProcessedAtRef.current = timestamp;
        isProcessingRef.current = true;

        try {
          await model.send({ image: video });
        } catch (error) {
          console.warn("Blink detection error:", error);
          detectorRef.current?.markFaceMissing(timestamp);
        } finally {
          isProcessingRef.current = false;
        }
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        detectorRef.current?.markFaceMissing();
      }
    };

    const loadAndRun = async () => {
      try {
        const faceMesh = await createFaceMeshInstance({
          maxNumFaces: 1,
          minDetectionConfidence: isMobile ? 0.55 : 0.5,
          minTrackingConfidence: isMobile ? 0.55 : 0.5,
          refineLandmarks: true,
          selfieMode: true,
        });

        if (cancelled) {
          void faceMesh.close();
          return;
        }

        faceMesh.onResults((results) => {
          const landmarks = results.multiFaceLandmarks?.[0];

          if (landmarks?.length) {
            detectorRef.current?.processLandmarks(landmarks);
            return;
          }

          detectorRef.current?.markFaceMissing();
        });

        modelRef.current = faceMesh;
        setModelReady(true);
        requestRef.current = requestAnimationFrame(detect);
      } catch (error) {
        console.error("Blink model load failed:", error);
        setModelError("Eye navigation is unavailable on this device.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void loadAndRun();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cameraReadyRef.current = false;
      isProcessingRef.current = false;
      lastProcessedAtRef.current = 0;

      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }

      detectorRef.current?.dispose();
      detectorRef.current = null;

      const currentModel = modelRef.current;
      modelRef.current = null;
      if (currentModel) {
        void currentModel.close();
      }
    };
  }, [enabled, onDoubleBlink, onTripleBlink]);

  const error = cameraError ?? modelError;
  const loading =
    enabled && !error && (isRetryingCamera || !cameraReady || !modelReady);
  const isReady =
    enabled &&
    !paused &&
    !error &&
    !isRetryingCamera &&
    cameraReady &&
    modelReady;

  const webcamProps: BlinkWebcamProps = {
    audio: false,
    disablePictureInPicture: true,
    mirrored: true,
    muted: true,
    onUserMedia: handleUserMedia,
    onUserMediaError: handleUserMediaError,
    playsInline: true,
    screenshotFormat: "image/jpeg",
    videoConstraints: cameraProfiles[cameraProfileIndex] ?? true,
  };

  return {
    error,
    isReady,
    loading,
    webcamProps,
    webcamRef,
  };
}
