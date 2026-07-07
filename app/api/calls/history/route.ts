export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getHistory } from "@/app/controllers/callController";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const limitParam = Number(req.nextUrl.searchParams.get("limit") || "50");
    const result = await getHistory(session, Number.isFinite(limitParam) ? limitParam : 50);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("CALL HISTORY ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load call history" },
      { status: 500 }
    );
  }
}
