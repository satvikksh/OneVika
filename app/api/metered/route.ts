import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { roomName } = await req.json();

    const secretKey = process.env.METERED_API_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Secret key missing" },
        { status: 500 }
      );
    }

    // 🔥 Build URL with query param
    const url = new URL(
      "https://onevika.metered.live/api/v1/room"
    );
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
        // enableRequestToJoin: false,
        recordRoom: false,
        deleteOnExp: true,
      }),
    });

    const data = await response.json();

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
