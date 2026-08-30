export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import {
  createLiveKitToken,
  createOrGetLiveKitRoom,
  getPublicLiveKitUrl,
} from "@/app/lib/livekit";
import { rejectIfInactive } from "@/app/lib/user-status";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json({ error: inactiveReason }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const roomName =
      typeof body?.roomName === "string" ? body.roomName.trim() : "";

    if (!roomName) {
      return NextResponse.json(
        { error: "roomName is required" },
        { status: 400 }
      );
    }

    // Basic guard: room names for calls always start with "call-" in this
    // implementation, which keeps the token endpoint from being used to mint
    // tokens for arbitrary/unrelated rooms.
    if (!roomName.startsWith("call-")) {
      return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    }

    await createOrGetLiveKitRoom(roomName);

    const token = await createLiveKitToken({
      identity: session.user.id,
      name: session.user.name ?? session.user.id,
      roomName,
    });

    return NextResponse.json({ token, url: getPublicLiveKitUrl(), roomName });
  } catch (error) {
    console.error("[LiveKit] Token generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate LiveKit token" },
      { status: 500 }
    );
  }
}
