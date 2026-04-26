import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Thought from "@/app/models/Thought";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, props: RouteProps) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid thought id" }, { status: 400 });
  }

  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Thought cannot be empty" }, { status: 400 });
  }

  await dbConnect();

  const existing = await Thought.findById(id).select("createdBy").lean();

  if (!existing) {
    return NextResponse.json({ error: "Thought not found" }, { status: 404 });
  }

  if (existing.createdBy?.toString() !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own thoughts" }, { status: 403 });
  }

  const updatedThought = await Thought.findByIdAndUpdate(
    id,
    { $set: { content } },
    { new: true }
  )
    .populate({
      path: "createdBy",
      select: "name email avatar image isPremium premiumExpiresAt",
    })
    .lean();

  return NextResponse.json(updatedThought);
}

export async function DELETE(_req: Request, props: RouteProps) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid thought id" }, { status: 400 });
  }

  await dbConnect();

  const existing = await Thought.findById(id).select("createdBy").lean();

  if (!existing) {
    return NextResponse.json({ error: "Thought not found" }, { status: 404 });
  }

  if (existing.createdBy?.toString() !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own thoughts" }, { status: 403 });
  }

  await Thought.deleteOne({ _id: id });

  return NextResponse.json({ success: true });
}
