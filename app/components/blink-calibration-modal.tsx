"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
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

export function BlinkCalibrationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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

  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkStatus, setBlinkStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraProfileIndex, setCameraProfileIndex] = useState(0);
  const [cameraProfiles, setCameraProfiles] = useState<BlinkCameraConstraints[]>(
    () => getBlinkCameraProfiles(false)
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isRetryingCamera, setIsRetryingCamera] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

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
    if (!isOpen) {
      detectorRef.current?.dispose();
      detectorRef.current = null;
      cameraReadyRef.current = false;
      setBlinkCount(0);
      setBlinkStatus("OPEN");
      setCameraError(null);
      setCameraReady(false);
      setIsModelReady(false);
      setIsRetryingCamera(false);
      setModelError(null);
      return;
    }

    const isMobile = isLikelyMobileDevice();
    frameIntervalRef.current = isMobile
      ? MOBILE_FRAME_INTERVAL_MS
      : DESKTOP_FRAME_INTERVAL_MS;

    detectorRef.current?.dispose();
    detectorRef.current = createBlinkDetector({
      onBlink: () => setBlinkCount((count) => count + 1),
      onEyeStateChange: setBlinkStatus,
    });

    cameraReadyRef.current = false;
    lastProcessedAtRef.current = 0;
    setBlinkCount(0);
    setBlinkStatus("OPEN");
    setCameraError(null);
    setCameraProfileIndex(0);
    setCameraProfiles(getBlinkCameraProfiles(isMobile));
    setCameraReady(false);
    setIsModelReady(false);
    setIsRetryingCamera(false);
    setModelError(null);

    let cancelled = false;

    const detect = async (timestamp: number) => {
      if (cancelled) {
        return;
      }

      if (document.hidden) {
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
          console.warn("Blink calibration error:", error);
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

    const loadModel = async () => {
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
        setIsModelReady(true);
        requestRef.current = requestAnimationFrame(detect);
      } catch (error) {
        console.error("Blink calibration model load failed:", error);
        setModelError("Blink calibration is unavailable on this device.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void loadModel();

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
  }, [isOpen]);

  if (!isOpen) return null;

  const isLoading =
    !cameraError &&
    !modelError &&
    (isRetryingCamera || !cameraReady || !isModelReady);
  const message = cameraError
    ? cameraError
    : modelError
      ? modelError
      : isRetryingCamera
        ? "Trying alternate camera settings..."
        : !cameraReady
          ? "Waiting for camera access..."
          : !isModelReady
            ? "Initializing AI model..."
            : "Ready! Blink naturally to test navigation.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Eye className="text-indigo-400" /> Blink Calibration
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-indigo-500/30 shadow-2xl">
            <Webcam
              ref={webcamRef}
              audio={false}
              disablePictureInPicture
              mirrored
              muted
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              playsInline
              screenshotFormat="image/jpeg"
              videoConstraints={cameraProfiles[cameraProfileIndex] ?? true}
              className="w-full h-full object-cover"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={32} />
                <span className="text-xs text-white/70">Preparing camera...</span>
              </div>
            )}
          </div>

          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                  blinkStatus === "CLOSED"
                    ? "bg-indigo-500/20 border-indigo-500 text-white"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                <EyeOff size={24} className="mb-2" />
                <span className="font-bold">Eyes Closed</span>
              </div>
              <div
                className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                  blinkStatus === "OPEN"
                    ? "bg-emerald-500/20 border-emerald-500 text-white"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                <Eye size={24} className="mb-2" />
                <span className="font-bold">Eyes Open</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-white/60 mb-1">{message}</p>
              <div className="text-4xl font-bold text-white">
                {blinkCount}{" "}
                <span className="text-lg text-white/40 font-normal">
                  blinks detected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
