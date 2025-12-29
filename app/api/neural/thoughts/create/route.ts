import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "../../../../lib/mongodb";
import Thought from "../../../../models/Thought";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await dbConnect();

  const thought = await Thought.create({
    ...body,
    createdBy: session.user.id,
  });

  return NextResponse.json(thought);
}
