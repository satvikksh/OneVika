import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

interface CreateTokenParams {
  identity: string;
  name?: string;
  roomName: string;
  /** Set false for view-only/spectator use cases. Defaults to true. */
  canPublish?: boolean;
}

/**
 * Creates a short-lived LiveKit JWT for a participant to join a specific room.
 * LIVEKIT_API_KEY / LIVEKIT_API_SECRET must be the values from your LiveKit
 * Cloud project (Settings -> Keys).
 */
export async function createLiveKitToken({
  identity,
  name,
  roomName,
  canPublish = true,
}: CreateTokenParams): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured on the server."
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    // Short TTL is fine: the client connects immediately after fetching it.
    ttl: "10m",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canPublishData: true,
    canSubscribe: true,
  });

  return at.toJwt();
}

export function getLiveKitUrl() {
  const url = process.env.LIVEKIT_URL;
  if (!url) {
    throw new Error("LIVEKIT_URL must be configured on the server.");
  }
  return url;
}

export function getPublicLiveKitUrl() {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || getLiveKitUrl();
}

export function getLiveKitRoomService() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured on the server."
    );
  }

  return new RoomServiceClient(getLiveKitUrl(), apiKey, apiSecret);
}

export async function createOrGetLiveKitRoom(roomName: string) {
  const roomService = getLiveKitRoomService();

  try {
    const existingRooms = await roomService.listRooms([roomName]);
    if (existingRooms.some((room) => room.name === roomName)) {
      return;
    }
  } catch (error) {
    console.warn("[LiveKit] Room lookup failed; attempting create:", error);
  }

  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 60,
    maxParticipants: 16,
  });
}

/** Builds a stable, collision-resistant room name for a 1:1 or group call. */
export function buildCallRoomName(callId: string) {
  return `call-${callId}`;
}
