"use client";

import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

export function useBlinkNavigation(
  onDoubleBlink: () => void,
  onTripleBlink: () => void,
  enabled: boolean
) {
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number | null>(null);

  const modelRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);

  const blink = useRef({
    count: 0,
    isClosed: false,
    timer: null as NodeJS.Timeout | null,
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const loadAndRun = async () => {
      try {
        setLoading(true);

        // ✅ Dynamic, browser-only imports
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        const faceLandmarks = await import(
          "@tensorflow-models/face-landmarks-detection"
        );

        if (tf.getBackend() !== "webgl") {
          await tf.setBackend("webgl");
          await tf.ready();
        }

        if (cancelled) return;

        modelRef.current = await faceLandmarks.createDetector(
          faceLandmarks.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: "tfjs",
            maxFaces: 1,
            refineLandmarks: true,
          }
        );

        setLoading(false);
        detect();
      } catch (e) {
        console.error("Blink model load failed:", e);
        setLoading(false);
      }
    };

    const dist = (a: any, b: any) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const detect = async () => {
      const video = webcamRef.current?.video;
      const model = modelRef.current;

      if (video && model && video.readyState === 4) {
        try {
          const faces = await model.estimateFaces(video);

          if (faces.length) {
            const k = faces[0].keypoints;

            const ear =
              (dist(k[159], k[145]) / dist(k[33], k[133]) +
                dist(k[386], k[374]) / dist(k[362], k[263])) /
              2;

            if (ear < 0.26) {
              blink.current.isClosed = true;
            } else if (blink.current.isClosed) {
              blink.current.isClosed = false;
              blink.current.count++;

              if (blink.current.timer) {
                clearTimeout(blink.current.timer);
              }

              blink.current.timer = setTimeout(() => {
                if (blink.current.count === 2) onDoubleBlink();
                if (blink.current.count === 3) onTripleBlink();
                blink.current.count = 0;
              }, 800);
            }
          }
        } catch (e) {
          console.warn("Blink detection error:", e);
        }
      }

      requestRef.current = requestAnimationFrame(detect);
    };

    loadAndRun();

    return () => {
      cancelled = true;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (blink.current.timer) {
        clearTimeout(blink.current.timer);
      }
    };
  }, [enabled, onDoubleBlink, onTripleBlink]);

  return { webcamRef, loading };
}
