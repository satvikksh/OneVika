"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { useLiveKitRoom } from "@/app/hooks/useLiveKitRoom";
import CallParticipantTile from "@/app/components/CallParticipantTile";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    tiles,
    isMicEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    error: liveKitError,
  } = useLiveKitRoom({
    token,
    url,
    video: true,
  });

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: roomId }),
        });
        const data = await res.json();

        if (!res.ok || !data?.token || !data?.url) {
          throw new Error(data?.error || "Unable to join room");
        }

        if (!cancelled) {
          setToken(data.token);
          setUrl(data.url);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to join room");
        }
      }
    })();

    return () => {
      cancelled = true;
      setToken(null);
      setUrl(null);
    };
  }, [roomId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-semibold">LiveKit Talk</p>
          <p className="text-xs text-gray-400">{roomId}</p>
        </div>
        {error || liveKitError ? (
          <p className="max-w-[50vw] truncate text-xs text-red-400">{error || liveKitError}</p>
        ) : null}
      </div>

      <div className="grid flex-1 auto-rows-fr gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.length > 0 ? (
          tiles.map((tile) => <CallParticipantTile key={tile.identity} tile={tile} />)
        ) : (
          <div className="col-span-full flex items-center justify-center text-sm text-gray-400">
            Connecting...
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-5 py-6">
        <button
          onClick={toggleMic}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isMicEnabled ? "bg-gray-700" : "bg-red-600"
          }`}
          aria-label="Toggle microphone"
        >
          {isMicEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          onClick={toggleCamera}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isCameraEnabled ? "bg-gray-700" : "bg-red-600"
          }`}
          aria-label="Toggle camera"
        >
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isScreenShareEnabled ? "bg-blue-600" : "bg-gray-700"
          }`}
          aria-label="Toggle screen share"
        >
          <MonitorUp size={18} />
        </button>
        <button
          onClick={() => {
            setToken(null);
            setUrl(null);
            history.back();
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600"
          aria-label="Leave room"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
