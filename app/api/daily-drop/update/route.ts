import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import {dbConnect} from "../../../lib/mongodb";
import DailyDropResponse from "../../../models/DailyDropResponse";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { responseId, newResponse } = await req.json();
  if (!responseId || !newResponse) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  await dbConnect();

  const responseDoc = await DailyDropResponse.findById(responseId);

  if (!responseDoc) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  // 🔐 Ownership check
  if (responseDoc.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ⏰ 24 hour rule
  const ageInHours =
    (Date.now() - new Date(responseDoc.createdAt).getTime()) / 36e5;

  if (ageInHours > 24) {
    return NextResponse.json(
      { error: "Edit window expired" },
      { status: 403 }
    );
  }

  responseDoc.response = newResponse;
  await responseDoc.save();

  return NextResponse.json({ success: true });
}
