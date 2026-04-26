import { NextResponse } from "next/server";
import Thought from "../../../models/Thought";
import { dbConnect } from "../../../lib/mongodb";

export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const recentHours = searchParams.get("recentHours");
  const query: Record<string, unknown> = {};

  if (recentHours) {
    const hours = Number(recentHours);

    if (Number.isFinite(hours) && hours > 0) {
      query.createdAt = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
    }
  }

  const thoughts = await Thought.find(query)
    .populate({
      path: "createdBy",
      select: "name email avatar image isPremium premiumExpiresAt",
    })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(thoughts);
}

export async function POST(req: Request) {
  await dbConnect();
  const data = await req.json();
  const thought = await Thought.create({
    ...data,
    createdAt: new Date(),
  });
  return NextResponse.json(thought);
}
