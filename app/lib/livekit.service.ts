import { RoomServiceClient } from "livekit-server-sdk";

/**
 * The public websocket URL the browser connects to (wss://...).
 * Exposed to the client via NEXT_PUBLIC_LIVEKIT_URL, falling back to the
 * server-only LIVEKIT_URL when they point at the same deployment.
 */
export function getLiveKitPublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_LIVEKIT_URL (or LIVEKIT_URL) must be configured for the client to reach LiveKit"
    );
  }
  return url;
}

/**
 * The RoomService management endpoint needs an http(s) URL, so normalize the
 * ws(s) websocket URL used by clients into its http(s) equivalent.
 */
function getLiveKitHttpUrl(): string {
  const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!url) {
    throw new Error("LIVEKIT_URL must be configured on the server");
  }
  return url.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
}

let cachedClient: RoomServiceClient | null = null;

function getRoomServiceClient(): RoomServiceClient {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured on the server"
    );
  }

  if (!cachedClient) {
    cachedClient = new RoomServiceClient(getLiveKitHttpUrl(), apiKey, apiSecret);
  }

  return cachedClient;
}

export interface EnsureRoomOptions {
  roomName: string;
  maxParticipants?: number;
  /** Seconds the room stays alive with no participants before auto-cleanup. */
  emptyTimeout?: number;
}

/**
 * Creates the LiveKit room ahead of time. LiveKit also auto-creates rooms on
 * first join, so failures here are non-fatal and only logged.
 */
export async function ensureRoom({
  roomName,
  maxParticipants = 16,
  emptyTimeout = 60,
}: EnsureRoomOptions): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.createRoom({
      name: roomName,
      emptyTimeout,
      maxParticipants,
    });
  } catch (error) {
    // Room may already exist or management API may be unreachable; joining will
    // still auto-create the room, so we only warn.
    console.warn("[LiveKit] ensureRoom skipped:", (error as Error)?.message);
  }
}

/** Best-effort teardown so tracks/participants are cleaned up promptly. */
export async function deleteRoom(roomName: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.deleteRoom(roomName);
  } catch (error) {
    console.warn("[LiveKit] deleteRoom skipped:", (error as Error)?.message);
  }
}
