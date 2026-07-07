export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { issueToken } from "@/app/controllers/callController";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const result = await issueToken(session, body);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("CALL TOKEN ERROR:", error);
    return NextResponse.json(
      { error: "Failed to issue call token" },
      { status: 500 }
    );
  }
}
