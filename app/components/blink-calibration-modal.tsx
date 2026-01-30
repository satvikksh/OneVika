"use client";

import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { X, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

export function BlinkCalibrationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [blinkStatus, setBlinkStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [blinkCount, setBlinkCount] = useState(0);
  const [message, setMessage] = useState("Initializing AI Model...");
  const requestRef = useRef<number>(0);
  const blinkState = useRef({ isClosed: false });

  // Load Model
  useEffect(() => {
    if (!isOpen) return;
    
    const loadModel = async () => {
      await tf.ready();
      const loadedModel = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: "tfjs", refineLandmarks: true, maxFaces: 1 }
      );
      setModel(loadedModel);
      setMessage("Ready! Try blinking naturally.");
    };
    loadModel();

    return () => {
       if(requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isOpen]);

  // Detection Loop
  const detect = async () => {
    if (webcamRef.current?.video?.readyState === 4 && model) {
      const video = webcamRef.current.video;
      const predictions = await model.estimateFaces(video);

      if (predictions.length > 0) {
        const keypoints = predictions[0].keypoints;
        // Simple EAR calculation (Left Eye)
        const top = keypoints[159];
        const bottom = keypoints[145];
        const left = keypoints[33];
        const right = keypoints[133];

        const height = Math.sqrt(Math.pow(top.x - bottom.x, 2) + Math.pow(top.y - bottom.y, 2));
        const width = Math.sqrt(Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2));
        const ear = height / width;

        const isClosed = ear < 0.26; // Threshold

        if (isClosed) {
          setBlinkStatus("CLOSED");
          if (!blinkState.current.isClosed) {
            blinkState.current.isClosed = true;
          }
        } else {
          setBlinkStatus("OPEN");
          if (blinkState.current.isClosed) {
            setBlinkCount(c => c + 1);
            blinkState.current.isClosed = false;
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => {
    if (model && isOpen) {
      requestRef.current = requestAnimationFrame(detect);
    }
  }, [model, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Eye className="text-indigo-400" /> Blink Calibration
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-6">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-indigo-500/30 shadow-2xl">
            <Webcam
              ref={webcamRef}
              mirrored
              className="w-full h-full object-cover"
            />
            {!model && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={32} />
                <span className="text-xs text-white/70">Loading AI...</span>
              </div>
            )}
          </div>

          <div className="w-full space-y-4">
             {/* Status Indicators */}
             <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                   blinkStatus === "CLOSED" 
                   ? "bg-indigo-500/20 border-indigo-500 text-white" 
                   : "bg-white/5 border-white/10 text-white/40"
                }`}>
                   <EyeOff size={24} className="mb-2" />
                   <span className="font-bold">Eyes Closed</span>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                   blinkStatus === "OPEN" 
                   ? "bg-emerald-500/20 border-emerald-500 text-white" 
                   : "bg-white/5 border-white/10 text-white/40"
                }`}>
                   <Eye size={24} className="mb-2" />
                   <span className="font-bold">Eyes Open</span>
                </div>
             </div>
             
             <div className="text-center">
                <p className="text-white/60 mb-1">{message}</p>
                <div className="text-4xl font-bold text-white">
                   {blinkCount} <span className="text-lg text-white/40 font-normal">blinks detected</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}