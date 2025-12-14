"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { findValidImage } from "../lib/safeImage";

interface SafeImageProps {
  src: string;       // without extension → "/img/cosmic-gate12"
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export default function SafeImage({
  src,
  alt,
  className,
  fill,
  width,
  height
}: SafeImageProps) {
  
  const [finalSrc, setFinalSrc] = useState("/img/fallback.jpg");

  useEffect(() => {
    async function load() {
      const valid = await findValidImage(src);
      setFinalSrc(valid);
    }
    load();
  }, [src]);

  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
