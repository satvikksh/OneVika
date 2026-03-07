"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type AvatarCropperModalProps = {
  isOpen: boolean;
  imageSrc: string;
  onCancel: () => void;
  onApply: (file: File) => void;
};

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AvatarCropperModal({
  isOpen,
  imageSrc,
  onCancel,
  onApply,
}: AvatarCropperModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isApplying, setIsApplying] = useState(false);

  const baseScale = useMemo(() => {
    return Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height);
  }, [naturalSize.height, naturalSize.width]);

  const finalScale = baseScale * zoom;
  const displayWidth = naturalSize.width * finalScale;
  const displayHeight = naturalSize.height * finalScale;
  const maxX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
  const maxY = Math.max(0, (displayHeight - CROP_SIZE) / 2);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImgLoaded(false);
  }, [isOpen, imageSrc]);

  const clampOffset = (x: number, y: number) => ({
    x: clamp(x, -maxX, maxX),
    y: clamp(y, -maxY, maxY),
  });

  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, baseScale, naturalSize.width, naturalSize.height]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!imgRef.current || !imgLoaded) return;

    setIsApplying(true);
    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const left = CROP_SIZE / 2 - displayWidth / 2 + offset.x;
      const top = CROP_SIZE / 2 - displayHeight / 2 + offset.y;

      const sourceX = (0 - left) / finalScale;
      const sourceY = (0 - top) / finalScale;
      const sourceSize = CROP_SIZE / finalScale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92)
      );
      if (!blob) return;

      const file = new File([blob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      onApply(file);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 md:p-5">
        <h3 className="text-lg font-semibold mb-1">Adjust Profile Photo</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Drag to move and use zoom to fit your face in the frame.
        </p>

        <div
          className="mx-auto relative rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 touch-none"
          style={{ width: CROP_SIZE, height: CROP_SIZE }}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            setDragStart({ x: e.clientX, y: e.clientY });
            setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy));
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={(e) => {
            const t = e.touches[0];
            setIsDragging(true);
            setDragStart({ x: t.clientX, y: t.clientY });
          }}
          onTouchMove={(e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            const dx = t.clientX - dragStart.x;
            const dy = t.clientY - dragStart.y;
            setDragStart({ x: t.clientX, y: t.clientY });
            setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy));
          }}
          onTouchEnd={() => setIsDragging(false)}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            className="absolute select-none pointer-events-none"
            draggable={false}
            onLoad={(e) => {
              setNaturalSize({
                width: e.currentTarget.naturalWidth || 1,
                height: e.currentTarget.naturalHeight || 1,
              });
              setImgLoaded(true);
            }}
            style={{
              width: displayWidth,
              height: displayHeight,
              left: CROP_SIZE / 2 - displayWidth / 2 + offset.x,
              top: CROP_SIZE / 2 - displayHeight / 2 + offset.y,
            }}
          />
          <div className="absolute inset-0 ring-2 ring-white/80 pointer-events-none" />
        </div>

        <div className="mt-4">
          <label className="text-sm block mb-2">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600"
            disabled={isApplying}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!imgLoaded || isApplying}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {isApplying ? "Applying..." : "Apply Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

