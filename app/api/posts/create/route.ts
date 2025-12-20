import { NextResponse } from "next/server";
import Post from "../../../models/Post";
import { connectDB } from "../../../lib/mongodb";

export async function POST(req: Request) {
  await connectDB();
  const { userId, content, images } = await req.json();

  const post = await Post.create({
    userId,
    content,
    images: images || [],
  });

  return NextResponse.json({ success: true, post });
}
