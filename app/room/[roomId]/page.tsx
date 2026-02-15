"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";

export default function RoomPage() {
  const { roomId } = useParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initFrame = () => {
      // ts-ignore
      const frame = new window.MeteredFrame();

      frame.init(
        {
          roomURL: `onevika.metered.live/${roomId}`,
        },
        document.getElementById("metered-frame")
      );
    };

    // small delay to ensure script loads
    setTimeout(initFrame, 500);
  }, [roomId]);

  return (
    <div className="h-screen bg-black">
      <Script
        src="https://cdn.metered.ca/sdk/frame/1.4.3/sdk-frame.min.js"
        strategy="afterInteractive"
      />
      <div id="metered-frame" className="w-full h-full"></div>
    </div>
  );
}
