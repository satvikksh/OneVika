import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import {connectDB} from "../../../../lib/mongodb";
import Comment from "../../../../models/Comment";

export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  await connectDB();

  const comments = await Comment.find({ postId: params.postId })
    .sort({ createdAt: -1 })
    .populate("author", "name email");

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text) return NextResponse.json({ message: "Empty comment" }, { status: 400 });

  await connectDB();

  const comment = await Comment.create({
    postId: params.postId,
    author: session.user.id,
    text,
  });

  return NextResponse.json(comment, { status: 201 });
}
