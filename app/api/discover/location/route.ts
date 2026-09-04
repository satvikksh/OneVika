import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { parseCoord, reverseGeocode } from "@/app/lib/discover";

export const runtime = "nodejs";

/**
 * GET /api/discover/location?lat=23.25&lng=77.41
 * Reverse-geocodes browser coordinates into a human location label.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lat = parseCoord(req.nextUrl.searchParams.get("lat"), -90, 90);
    const lng = parseCoord(req.nextUrl.searchParams.get("lng"), -180, 180);
    if (lat === null || lng === null) {
      return NextResponse.json(
        { error: "Valid lat and lng query params are required." },
        { status: 400 }
      );
    }

    const location = await reverseGeocode(lat, lng);
    if (!location) {
      return NextResponse.json(
        { error: "Unable to determine your location right now." },
        { status: 502 }
      );
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error("[Discover] Location error:", error);
    return NextResponse.json({ error: "Failed to determine your location." }, { status: 500 });
  }
}