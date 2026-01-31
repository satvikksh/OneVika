import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import {dbConnect} from "../../../lib/mongodb";
import DailyDropResponse from "../../../models/DailyDropResponse";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { responseId } = await req.json();
  if (!responseId) {
    return NextResponse.json({ error: "Response ID required" }, { status: 400 });
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

  await responseDoc.deleteOne();

  return NextResponse.json({ success: true });
}
