// Shared call types used across the LiveKit calling system (client + server safe).

export type CallType = "audio" | "video";

export type CallDirection = "incoming" | "outgoing";

export type CallState =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected"
  | "ended"
  | "busy"
  | "rejected"
  | "missed"
  | "reconnecting";

export type CallStatus =
  | "ringing"
  | "ongoing"
  | "completed"
  | "missed"
  | "rejected"
  | "cancelled"
  | "busy";

export interface CallPeer {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface CallInvitePayload {
  callId: string;
  roomName: string;
  callType: CallType;
  isGroup: boolean;
  conversationId?: string;
  from: CallPeer;
  /** Direct call target, when not a group call. */
  to?: CallPeer;
  /** Group call member ids to ring. */
  memberIds?: string[];
  groupName?: string;
  createdAt: string;
}

export interface CallSignalPayload {
  callId: string;
  roomName?: string;
  callType?: CallType;
  from: CallPeer;
  /** Recipient user ids the signal should be delivered to. */
  targets: string[];
  reason?: string;
}

export interface CallParticipantSignal {
  callId: string;
  targets: string[];
  participant: CallPeer;
}

export interface CallNetworkQualitySignal {
  callId: string;
  targets: string[];
  from: string;
  quality: number;
}

export interface CallTokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

export interface CallCreateResponse {
  callId: string;
  roomName: string;
  callType: CallType;
  isGroup: boolean;
  conversationId?: string;
  token: string;
  url: string;
  from: CallPeer;
  to?: CallPeer;
  memberIds?: string[];
}

export interface CallHistoryItem {
  id: string;
  callType: CallType;
  isGroup: boolean;
  direction: CallDirection;
  status: CallStatus;
  peer: CallPeer | null;
  conversationId?: string;
  durationSeconds: number;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
}
