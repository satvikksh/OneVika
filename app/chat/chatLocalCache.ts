"use client";

import { User } from "../types/socket";

type CachedChatState = {
  users: User[];
  selectedUserId: string | null;
  updatedAt: number;
};

const CACHE_PREFIX = "orbitbyte_chat_state_v1";

const getCacheKey = (currentUserId: string) => `${CACHE_PREFIX}:${currentUserId}`;

export const readCachedChatState = (
  currentUserId?: string | null
): CachedChatState | null => {
  if (!currentUserId || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getCacheKey(currentUserId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedChatState;
    if (!Array.isArray(parsed.users)) return null;

    return {
      users: parsed.users,
      selectedUserId: parsed.selectedUserId ?? null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
};

export const writeCachedChatState = (
  currentUserId: string,
  state: CachedChatState
) => {
  if (!currentUserId || typeof window === "undefined") return;

  window.localStorage.setItem(getCacheKey(currentUserId), JSON.stringify(state));
};

export const clearCachedChatState = (currentUserId?: string | null) => {
  if (!currentUserId || typeof window === "undefined") return;
  window.localStorage.removeItem(getCacheKey(currentUserId));
};
