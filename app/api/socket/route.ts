import { NextResponse } from "next/server";

/**
 * Required for WebSocket / long-lived connections
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check / handshake endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    socket: "ready",
  });
}

/**
 * Optional POST (if you need it later)
 */
export async function POST() {
  return NextResponse.json({
    status: "socket-post-ok",
  });
}
