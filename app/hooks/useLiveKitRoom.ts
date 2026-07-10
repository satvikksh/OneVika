"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  RemoteAudioTrack,
  RemoteTrack,
  RemoteTrackPublication,
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
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const speakerEnabledRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<CallTile[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(video);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false);

  const refreshTiles = useCallback((room: Room) => {
    const all: Participant[] = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    setTiles(all.map(participantToTile));
  }, []);

  const detachRemoteAudio = useCallback((trackSid?: string) => {
    const entries = trackSid
      ? [[trackSid, remoteAudioElementsRef.current.get(trackSid)] as const]
      : Array.from(remoteAudioElementsRef.current.entries());

    entries.forEach(([sid, el]) => {
      if (!el) return;
      try {
        el.pause();
        el.srcObject = null;
        el.remove();
      } catch (error) {
        console.warn("[LiveKit] Failed to detach remote audio:", error);
      }
      remoteAudioElementsRef.current.delete(sid);
    });
  }, []);

  const startRoomAudio = useCallback(async (room: Room) => {
    try {
      await room.startAudio();
    } catch (error) {
      console.warn("[LiveKit] Audio playback needs a user gesture:", error);
    }
  }, []);

  const playAudioElement = useCallback((el: HTMLAudioElement) => {
    const play = () => {
      el.play().catch((error) => {
        console.warn("[LiveKit] Remote audio playback is blocked until user interaction:", error);
      });
    };

    play();
    window.setTimeout(play, 150);
  }, []);

  const attachRemoteAudio = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track.kind !== Track.Kind.Audio || !(track instanceof RemoteAudioTrack)) return;

      const trackSid = publication.trackSid || track.sid;
      if (!trackSid) return;

      let el = remoteAudioElementsRef.current.get(trackSid);
      if (!el) {
        el = document.createElement("audio");
        el.autoplay = true;
        el.controls = false;
        el.muted = !speakerEnabledRef.current;
        el.setAttribute("playsinline", "true");
        el.setAttribute("data-livekit-remote-audio", trackSid);
        el.style.display = "none";
        document.body.appendChild(el);
        remoteAudioElementsRef.current.set(trackSid, el);
      }

      track.attach(el);
      playAudioElement(el);
    },
    [playAudioElement]
  );

  const subscribeRemoteAudio = useCallback((room: Room) => {
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        publication.setSubscribed(true);
        if (publication.track) {
          attachRemoteAudio(publication.track, publication);
        }
      });
    });
  }, [attachRemoteAudio]);

  useEffect(() => {
    if (!token || !url) {
      if (roomRef.current) {
        detachRemoteAudio();
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setIsConnected(false);
      setTiles([]);
      speakerEnabledRef.current = true;
      setIsSpeakerEnabled(true);
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
    const handleTrackPublished = (publication: RemoteTrackPublication) => {
      if (publication.kind === Track.Kind.Audio) {
        publication.setSubscribed(true);
      }
      handleChange();
    };
    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication
    ) => {
      attachRemoteAudio(track, publication);
      void startRoomAudio(room);
      handleChange();
    };
    const handleTrackUnsubscribed = (
      _track: RemoteTrack,
      publication: RemoteTrackPublication
    ) => {
      detachRemoteAudio(publication.trackSid);
      handleChange();
    };

    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.TrackMuted, handleChange);
    room.on(RoomEvent.TrackUnmuted, handleChange);
    room.on(RoomEvent.ParticipantConnected, handleChange);
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        detachRemoteAudio(publication.trackSid);
      });
      handleChange();
    });
    room.on(RoomEvent.ActiveSpeakersChanged, handleChange);
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      setIsConnected(state === ConnectionState.Connected);
    });
    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      detachRemoteAudio();
    });
    room.on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
      if (!playing) {
        void startRoomAudio(room);
        remoteAudioElementsRef.current.forEach(playAudioElement);
      }
    });

    (async () => {
      try {
        await room.connect(url, token, { autoSubscribe: true });
        if (cancelled) {
          room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(video);
        subscribeRemoteAudio(room);
        await startRoomAudio(room);
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
      detachRemoteAudio();
      void room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      void room.localParticipant.setCameraEnabled(false).catch(() => {});
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

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerEnabled((prev) => {
      const next = !prev;
      speakerEnabledRef.current = next;
      remoteAudioElementsRef.current.forEach((el) => {
        el.muted = !next;
      });
      return next;
    });
  }, []);

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
    isSpeakerEnabled,
    isScreenShareEnabled,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    toggleScreenShare,
  };
}
