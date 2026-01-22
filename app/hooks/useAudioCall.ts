"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Metered: any;
  }
}

export function useAudioCall(roomName: string) {
  const meetingRef = useRef<any>(null);
  const [inCall, setInCall] = useState(false);

  const startCall = async (id: string) => {
    await meetingRef?.current?.join({
      roomURL: `https://${process.env.NEXT_PUBLIC_METERED_DOMAIN}/${roomName}`,
      audio: true,
      video: false,
    });
    setInCall(true);
  };

  const endCall = async () => {
    await meetingRef?.current?.leaveMeeting();
    setInCall(false);
  };

  return { startCall, endCall, inCall };
}
