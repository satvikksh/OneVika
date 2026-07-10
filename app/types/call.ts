export interface CallParticipantRef {
  id: string;
  name?: string;
  avatar?: string | null;
}

export type CallKind = "audio" | "video";

/** Emitted by the caller to invite one (1:1) or many (group) users. */
export interface CallIncomingPayload {
  callId: string;
  roomId: string;
  roomName: string;
  fromUserId: string;
  fromUserName?: string;
  fromAvatar?: string | null;
  toUserIds: string[];
  isGroup: boolean;
  video: boolean;
  callType: CallKind;
  conversationId?: string;
  groupName?: string;
  participants?: CallParticipantRef[];
}

export type CallInvitePayload = CallIncomingPayload;

export interface CallAcceptPayload {
  callId: string;
  userId: string;
  roomId?: string;
}

export interface CallRejectPayload {
  callId: string;
  userId: string;
  reason?: "declined" | "busy" | "timeout";
}

export interface CallCancelPayload {
  callId: string;
  userId: string;
}

export interface CallEndPayload {
  callId: string;
  userId: string;
  roomId?: string;
}

export interface CallRingingPayload {
  callId: string;
  userId: string;
}

export interface CallParticipantPayload {
  callId: string;
  userId: string;
  roomId?: string;
}

export type CallStatus =
  | "idle"
  | "ringing-outgoing"
  | "ringing-incoming"
  | "connecting"
  | "connected";

export interface ActiveCallState {
  callId: string;
  roomId: string;
  roomName: string;
  video: boolean;
  callType: CallKind;
  isGroup: boolean;
  conversationId?: string;
  status: CallStatus;
  /** The other party (1:1) or invited members (group), for showing names/avatars. */
  participants: CallParticipantRef[];
}
