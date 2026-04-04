import { NextResponse } from "next/server";

const METERED_ROOM_URL = "https://onevika.metered.live/api/v1/room";
const DEFAULT_DELETE_AFTER_HOURS = 24;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const roomName = body?.roomName?.toString?.().trim();
    const action = body?.action?.toString?.();

    if (!roomName) {
      return NextResponse.json(
        { error: "roomName is required" },
        { status: 400 }
      );
    }

    const secretKey = process.env.METERED_API_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Secret key missing" },
        { status: 500 }
      );
    }

    if (action === "scheduleDelete") {
      const deleteAfterHours = Number(
        body?.deleteAfterHours || DEFAULT_DELETE_AFTER_HOURS
      );
      const deleteAt = new Date(
        Date.now() + Math.max(1, deleteAfterHours) * 60 * 60 * 1000
      );

      const url = new URL(
        `${METERED_ROOM_URL}/${encodeURIComponent(roomName)}`
      );
      url.searchParams.append("secretKey", secretKey);

      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privacy: "public",
          expireUnixSec: Math.floor(deleteAt.getTime() / 1000),
          ejectAtRoomExp: true,
          deleteOnExp: true,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.log("Metered Schedule Delete Error:", data);
        return NextResponse.json(data, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        roomName,
        deleteAt: deleteAt.toISOString(),
        metered: data,
      });
    }

    const url = new URL(METERED_ROOM_URL);
    url.searchParams.append("secretKey", secretKey);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomName,
        privacy: "public",
        maxParticipants: 10,
        autoJoin: true,
        recordRoom: false,
        deleteOnExp: true,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.log("Metered Error:", data);
      return NextResponse.json(data, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.log("Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
