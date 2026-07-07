"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionQuality,
  ConnectionState,
  LocalTrackPublication,
  Participant,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { defaultRoomOptions } from "@/app/lib/livekit";

export interface UseLiveKitConnectOptions {
  url: string;
  token: string;
  audio?: boolean;
  video?: boolean;
}

export interface LiveKitState {
  room: Room | null;
  participants: Participant[];
  activeSpeakerIds: string[];
  connectionState: ConnectionState;
  connectionQuality: ConnectionQuality;
  isConnected: boolean;
  isReconnecting: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenShareEnabled: boolean;
  /** Bumps whenever tracks change so tiles re-attach media. */
  version: number;
  error: string | null;
  connect: (options: UseLiveKitConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  switchCamera: () => Promise<void>;
}

export function useLiveKit(): LiveKitState {
  const roomRef = useRef<Room | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    ConnectionQuality.Unknown
  );
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bump = useCallback(() => setVersion((value) => value + 1), []);

  const syncParticipants = useCallback((activeRoom: Room) => {
    const remotes = Array.from(activeRoom.remoteParticipants.values());
    setParticipants([activeRoom.localParticipant, ...remotes]);
    bump();
  }, [bump]);

  const syncLocalTrackState = useCallback((activeRoom: Room) => {
    const local = activeRoom.localParticipant;
    setMicEnabled(local.isMicrophoneEnabled);
    setCameraEnabled(local.isCameraEnabled);
    setScreenShareEnabled(local.isScreenShareEnabled);
  }, []);

  const disconnect = useCallback(async () => {
    const activeRoom = roomRef.current;
    roomRef.current = null;
    if (activeRoom) {
      activeRoom.removeAllListeners();
      await activeRoom.disconnect().catch(() => undefined);
    }
    setRoom(null);
    setParticipants([]);
    setActiveSpeakerIds([]);
    setConnectionState(ConnectionState.Disconnected);
    setConnectionQuality(ConnectionQuality.Unknown);
    setIsReconnecting(false);
    setMicEnabled(false);
    setCameraEnabled(false);
    setScreenShareEnabled(false);
    setError(null);
  }, []);

  const connect = useCallback(
    async ({ url, token, audio = true, video = false }: UseLiveKitConnectOptions) => {
      if (roomRef.current) {
        await disconnect();
      }

      const activeRoom = new Room(defaultRoomOptions);
      roomRef.current = activeRoom;
      setRoom(activeRoom);
      setError(null);

      activeRoom
        .on(RoomEvent.ParticipantConnected, () => syncParticipants(activeRoom))
        .on(RoomEvent.ParticipantDisconnected, () => syncParticipants(activeRoom))
        .on(RoomEvent.TrackSubscribed, () => syncParticipants(activeRoom))
        .on(RoomEvent.TrackUnsubscribed, () => syncParticipants(activeRoom))
        .on(RoomEvent.TrackMuted, () => bump())
        .on(RoomEvent.TrackUnmuted, () => bump())
        .on(RoomEvent.LocalTrackPublished, () => {
          syncLocalTrackState(activeRoom);
          syncParticipants(activeRoom);
        })
        .on(RoomEvent.LocalTrackUnpublished, () => {
          syncLocalTrackState(activeRoom);
          syncParticipants(activeRoom);
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          setActiveSpeakerIds(speakers.map((speaker) => speaker.identity));
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          setConnectionState(state);
        })
        .on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant) => {
          if (participant.isLocal) {
            setConnectionQuality(quality);
          }
        })
        .on(RoomEvent.Reconnecting, () => setIsReconnecting(true))
        .on(RoomEvent.Reconnected, () => setIsReconnecting(false))
        .on(RoomEvent.Disconnected, () => {
          setConnectionState(ConnectionState.Disconnected);
        });

      try {
        await activeRoom.connect(url, token);
        await activeRoom.localParticipant.setMicrophoneEnabled(audio);
        if (video) {
          await activeRoom.localParticipant.setCameraEnabled(true);
        }
        syncLocalTrackState(activeRoom);
        syncParticipants(activeRoom);
      } catch (connectError) {
        setError(
          connectError instanceof Error
            ? connectError.message
            : "Failed to connect to the call"
        );
        await disconnect();
        throw connectError;
      }
    },
    [disconnect, syncParticipants, syncLocalTrackState, bump]
  );

  const toggleMic = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (!activeRoom) return;
    const next = !activeRoom.localParticipant.isMicrophoneEnabled;
    await activeRoom.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
    bump();
  }, [bump]);

  const toggleCamera = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (!activeRoom) return;
    const next = !activeRoom.localParticipant.isCameraEnabled;
    await activeRoom.localParticipant.setCameraEnabled(next);
    setCameraEnabled(next);
    bump();
  }, [bump]);

  const toggleScreenShare = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (!activeRoom) return;
    const next = !activeRoom.localParticipant.isScreenShareEnabled;
    await activeRoom.localParticipant.setScreenShareEnabled(next);
    setScreenShareEnabled(next);
    bump();
  }, [bump]);

  const switchCamera = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (!activeRoom) return;

    const devices = await Room.getLocalDevices("videoinput");
    if (devices.length < 2) return;

    const currentDeviceId = activeRoom.getActiveDevice("videoinput");
    const currentIndex = devices.findIndex(
      (device) => device.deviceId === currentDeviceId
    );
    const nextDevice = devices[(currentIndex + 1) % devices.length];
    if (nextDevice) {
      await activeRoom.switchActiveDevice("videoinput", nextDevice.deviceId);
      bump();
    }
  }, [bump]);

  useEffect(() => {
    return () => {
      const activeRoom = roomRef.current;
      roomRef.current = null;
      if (activeRoom) {
        activeRoom.removeAllListeners();
        void activeRoom.disconnect().catch(() => undefined);
      }
    };
  }, []);

  return {
    room,
    participants,
    activeSpeakerIds,
    connectionState,
    connectionQuality,
    isConnected: connectionState === ConnectionState.Connected,
    isReconnecting,
    micEnabled,
    cameraEnabled,
    screenShareEnabled,
    version,
    error,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    switchCamera,
  };
}

/** Utility used by tiles to find a participant's active track for a source. */
export function getTrackForSource(
  participant: Participant,
  source: Track.Source
): Track | undefined {
  const publication = participant.getTrackPublication(source);
  const track = publication?.track;
  if (!track) return undefined;
  if (source === Track.Source.Camera || source === Track.Source.ScreenShare) {
    return publication?.isSubscribed || participant.isLocal ? track : undefined;
  }
  return track;
}

export type { LocalTrackPublication };
