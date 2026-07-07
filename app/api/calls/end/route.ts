export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { endCall } from "@/app/controllers/callController";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const result = await endCall(session, body);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("CALL END ERROR:", error);
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }
}
