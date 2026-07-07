import type {
  CallCreateResponse,
  CallHistoryItem,
  CallTokenResponse,
  CallType,
} from "@/app/types/call";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string })?.error || `Request failed (${res.status})`;
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = res.status;
    error.code = (data as { code?: string })?.code;
    throw error;
  }
  return data as T;
}

export interface CreateCallInput {
  callType: CallType;
  receiverId?: string;
  conversationId?: string;
  isGroup?: boolean;
}

export async function createCallRequest(
  input: CreateCallInput
): Promise<CallCreateResponse> {
  const res = await fetch("/api/calls/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<CallCreateResponse>(res);
}

export async function fetchCallToken(params: {
  roomName?: string;
  callId?: string;
}): Promise<CallTokenResponse> {
  const res = await fetch("/api/calls/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJson<CallTokenResponse>(res);
}

export async function markCallAnsweredRequest(params: {
  callId?: string;
  roomName?: string;
}): Promise<{ success: boolean }> {
  const res = await fetch("/api/calls/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJson<{ success: boolean }>(res);
}

export interface EndCallInput {
  callId?: string;
  roomName?: string;
  reason?: "completed" | "missed" | "rejected" | "cancelled" | "busy";
}

export interface EndCallResponse {
  success: boolean;
  status: string;
  durationSeconds: number;
  message: (Record<string, unknown> & { id: string }) | null;
}

export async function endCallRequest(
  input: EndCallInput
): Promise<EndCallResponse> {
  const res = await fetch("/api/calls/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<EndCallResponse>(res);
}

export async function fetchCallHistory(
  limit = 50
): Promise<CallHistoryItem[]> {
  const res = await fetch(`/api/calls/history?limit=${limit}`, {
    method: "GET",
  });
  const data = await parseJson<{ calls: CallHistoryItem[] }>(res);
  return data.calls;
}
