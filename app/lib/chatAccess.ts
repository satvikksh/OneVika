import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export type ChatLockVisibility = "blur" | "hidden";

export type ChatPreferenceDoc = {
  ownerId?: { toString(): string };
  chatUserId?: { toString(): string };
  isPinned?: boolean;
  isArchived?: boolean;
  isLocked?: boolean;
  lockPasswordHash?: string;
  lockVisibility?: ChatLockVisibility;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ChatPreferenceState = {
  isPinned: boolean;
  isArchived: boolean;
  isLocked: boolean;
  lockVisibility: ChatLockVisibility;
  isUnlocked: boolean;
};

const CHAT_UNLOCK_COOKIE_PREFIX = "orbitbyte_chat_unlock_";
export const CHAT_UNLOCK_MAX_AGE_SECONDS = 60 * 30;

const getChatLockSecret = () => {
  const secret = process.env.CHAT_LOCK_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("CHAT_LOCK_SECRET or NEXTAUTH_SECRET is required");
  }

  return secret;
};

export const getChatUnlockCookieName = (chatUserId: string) =>
  `${CHAT_UNLOCK_COOKIE_PREFIX}${chatUserId}`;

export const normalizeLockVisibility = (
  value?: string | null
): ChatLockVisibility => (value === "hidden" ? "hidden" : "blur");

export const toChatPreferenceState = (
  preference?: ChatPreferenceDoc | null,
  isUnlocked = false
): ChatPreferenceState => ({
  isPinned: Boolean(preference?.isPinned),
  isArchived: Boolean(preference?.isArchived),
  isLocked: Boolean(preference?.isLocked),
  lockVisibility: normalizeLockVisibility(preference?.lockVisibility),
  isUnlocked: Boolean(preference?.isLocked) && isUnlocked,
});

const createSignature = (payload: string) =>
  crypto.createHmac("sha256", getChatLockSecret()).update(payload).digest("base64url");

export const createChatUnlockToken = (
  ownerUserId: string,
  chatUserId: string,
  expiresAt: number
) => {
  const payload = Buffer.from(
    JSON.stringify({ ownerUserId, chatUserId, expiresAt }),
    "utf8"
  ).toString("base64url");

  return `${payload}.${createSignature(payload)}`;
};

export const verifyChatUnlockToken = (
  token: string,
  ownerUserId: string,
  chatUserId: string
) => {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = createSignature(payload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as {
      ownerUserId?: string;
      chatUserId?: string;
      expiresAt?: number;
    };

    if (
      parsed.ownerUserId !== ownerUserId ||
      parsed.chatUserId !== chatUserId ||
      typeof parsed.expiresAt !== "number"
    ) {
      return false;
    }

    return parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
};

export const hasUnlockedChatCookie = (
  req: NextRequest,
  ownerUserId: string,
  chatUserId: string
) => {
  const token = req.cookies.get(getChatUnlockCookieName(chatUserId))?.value;
  if (!token) return false;

  return verifyChatUnlockToken(token, ownerUserId, chatUserId);
};

export const setChatUnlockCookie = (
  response: NextResponse,
  ownerUserId: string,
  chatUserId: string
) => {
  const expiresAt = Date.now() + CHAT_UNLOCK_MAX_AGE_SECONDS * 1000;
  const token = createChatUnlockToken(ownerUserId, chatUserId, expiresAt);

  response.cookies.set({
    name: getChatUnlockCookieName(chatUserId),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHAT_UNLOCK_MAX_AGE_SECONDS,
  });
};

export const clearChatUnlockCookie = (
  response: NextResponse,
  chatUserId: string
) => {
  response.cookies.set({
    name: getChatUnlockCookieName(chatUserId),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
};
