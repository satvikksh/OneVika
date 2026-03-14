"use client";

import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  createFaceMeshInstance,
  type FaceMeshInstance,
  type FaceMeshLandmark,
} from "../lib/mediapipe-face-mesh";

export function useBlinkNavigation(
  onDoubleBlink: () => void,
  onTripleBlink: () => void,
  enabled: boolean
) {
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const modelRef = useRef<FaceMeshInstance | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blink = useRef({
    count: 0,
    isClosed: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const blinkState = blink.current;

    const dist = (a: FaceMeshLandmark, b: FaceMeshLandmark) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const handleLandmarks = (landmarks: FaceMeshLandmark[]) => {
      const ear =
        (dist(landmarks[159], landmarks[145]) / dist(landmarks[33], landmarks[133]) +
          dist(landmarks[386], landmarks[374]) / dist(landmarks[362], landmarks[263])) /
        2;

      if (ear < 0.26) {
        blinkState.isClosed = true;
        return;
      }

      if (!blinkState.isClosed) {
        return;
      }

      blinkState.isClosed = false;
      blinkState.count += 1;

      if (blinkState.timer) {
        clearTimeout(blinkState.timer);
      }

      blinkState.timer = setTimeout(() => {
        if (blinkState.count === 2) {
          onDoubleBlink();
        }
        if (blinkState.count === 3) {
          onTripleBlink();
        }
        blinkState.count = 0;
      }, 800);
    };

    const detect = async () => {
      if (cancelled) {
        return;
      }

      const video = webcamRef.current?.video;
      const model = modelRef.current;

      if (video && model && video.readyState === 4 && !isProcessingRef.current) {
        isProcessingRef.current = true;
        try {
          await model.send({ image: video });
        } catch (e) {
          console.warn("Blink detection error:", e);
        } finally {
          isProcessingRef.current = false;
        }
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    const loadAndRun = async () => {
      try {
        setLoading(true);
        setError(null);

        const faceMesh = await createFaceMeshInstance({
          maxNumFaces: 1,
          refineLandmarks: true,
        });

        if (cancelled) {
          void faceMesh.close();
          return;
        }

        faceMesh.onResults((results) => {
          const landmarks = results.multiFaceLandmarks?.[0];
          if (landmarks?.length) {
            handleLandmarks(landmarks);
          }
        });

        modelRef.current = faceMesh;
        setLoading(false);
        requestRef.current = requestAnimationFrame(detect);
      } catch (e) {
        console.error("Blink model load failed:", e);
        setError("Blink navigation is unavailable on this device.");
        setLoading(false);
      }
    };

    loadAndRun();

    return () => {
      cancelled = true;
      isProcessingRef.current = false;

      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }

      if (blinkState.timer) {
        clearTimeout(blinkState.timer);
        blinkState.timer = null;
      }

      blinkState.count = 0;
      blinkState.isClosed = false;

      const currentModel = modelRef.current;
      modelRef.current = null;
      if (currentModel) {
        void currentModel.close();
      }
    };
  }, [enabled, onDoubleBlink, onTripleBlink]);

  return {
    webcamRef,
    loading,
    error,
    isReady: enabled && !loading && !error,
  };
}
