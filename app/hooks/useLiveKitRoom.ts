"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

export interface CallTile {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  videoTrack?: Track;
  audioTrack?: Track;
}

function participantToTile(participant: Participant): CallTile {
  const videoPub = participant.getTrackPublication(Track.Source.Camera);
  const audioPub = participant.getTrackPublication(Track.Source.Microphone);

  return {
    identity: participant.identity,
    name: participant.name || participant.identity,
    isLocal: participant instanceof LocalParticipant,
    isSpeaking: participant.isSpeaking,
    isCameraEnabled: Boolean(videoPub?.track && !videoPub?.isMuted),
    isMicEnabled: Boolean(audioPub?.track && !audioPub?.isMuted),
    videoTrack: videoPub?.track,
    audioTrack: audioPub?.track,
  };
}

/**
 * Manages the lifecycle of a single LiveKit Room connection. Pass `null` for
 * token/url when there is no active call — the room will be disconnected.
 */
export function useLiveKitRoom({
  token,
  url,
  video,
}: {
  token: string | null;
  url: string | null;
  video: boolean;
}) {
  const roomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<CallTile[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(video);
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false);

  const refreshTiles = useCallback((room: Room) => {
    const all: Participant[] = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    setTiles(all.map(participantToTile));
  }, []);

  useEffect(() => {
    if (!token || !url) {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setIsConnected(false);
      setTiles([]);
      setIsScreenShareEnabled(false);
      return;
    }

    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const handleChange = () => refreshTiles(room);

    room.on(RoomEvent.TrackSubscribed, handleChange);
    room.on(RoomEvent.TrackUnsubscribed, handleChange);
    room.on(RoomEvent.TrackMuted, handleChange);
    room.on(RoomEvent.TrackUnmuted, handleChange);
    room.on(RoomEvent.ParticipantConnected, handleChange);
    room.on(RoomEvent.ParticipantDisconnected, handleChange);
    room.on(RoomEvent.ActiveSpeakersChanged, handleChange);
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      setIsConnected(state === ConnectionState.Connected);
    });
    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
    });

    (async () => {
      try {
        await room.connect(url, token);
        if (cancelled) {
          room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(video);
        setIsMicEnabled(true);
        setIsCameraEnabled(video);
        setIsConnected(true);
        refreshTiles(room);
      } catch (err) {
        console.error("[LiveKit] Failed to connect:", err);
        setError(err instanceof Error ? err.message : "Failed to connect to call");
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      void room.localParticipant.setScreenShareEnabled(false).catch(() => {});
      room.disconnect();
      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, url]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setIsMicEnabled(next);
  }, [isMicEnabled]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isCameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setIsCameraEnabled(next);
  }, [isCameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isScreenShareEnabled;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setIsScreenShareEnabled(next);
      refreshTiles(room);
    } catch (err) {
      console.error("[LiveKit] Failed to toggle screen share:", err);
      setError(err instanceof Error ? err.message : "Unable to share screen");
    }
  }, [isScreenShareEnabled, refreshTiles]);

  return {
    isConnected,
    error,
    tiles,
    isMicEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  };
}
