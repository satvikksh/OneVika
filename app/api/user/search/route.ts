import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!query) {
      return NextResponse.json({ users: [] });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const currentUserId = new ObjectId(session.user.id);
    const users = await db
      .collection("users")
      .aggregate([
        {
          $match: {
            _id: { $ne: currentUserId },
          },
        },
        {
          $addFields: {
            idStr: { $toString: "$_id" },
          },
        },
        {
          $match: {
            $or: [{ name: { $regex: regex } }, { idStr: { $regex: regex } }],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            avatar: 1,
            image: 1,
            isPremium: 1,
            premiumExpiresAt: 1,
            idStr: 1,
          },
        },
        { $limit: 8 },
      ])
      .toArray();

    return NextResponse.json({
      users: users.map((u: any) => ({
        _id: u._id.toString(),
        name: u.name ?? "Unknown",
        avatar: u.avatar || u.image || null,
        isPremium: isPremiumActive(u),
        id: u.idStr ?? u._id.toString(),
      })),
    });
  } catch (error) {
    console.error("USER SEARCH ERROR:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
