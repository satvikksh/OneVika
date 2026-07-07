import { AccessToken } from "livekit-server-sdk";
import type { CallType } from "@/app/types/call";

export interface CreateCallTokenOptions {
  roomName: string;
  identity: string;
  name?: string;
  callType: CallType;
  /** LiveKit token time-to-live in seconds, defaults to 1 hour. */
  ttlSeconds?: number;
  metadata?: string;
}

function getLiveKitCredentials() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured on the server"
    );
  }

  return { apiKey, apiSecret };
}

/**
 * Generates a signed LiveKit access token for a single participant.
 * The API secret never leaves the server.
 */
export async function createCallToken({
  roomName,
  identity,
  name,
  ttlSeconds = 60 * 60,
  metadata,
}: CreateCallTokenOptions): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials();

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: ttlSeconds,
    ...(metadata ? { metadata } : {}),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}
