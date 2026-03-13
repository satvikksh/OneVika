export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "../../lib/authOptions";
import { dbConnect } from "../../lib/mongodb";
import { isPremiumActive } from "../../lib/premium";
import Post from "../../models/Post";

type PopulatedAuthor = {
  _id?: { toString?: () => string } | string;
  isPremium?: boolean;
  premiumExpiresAt?: Date | string | null;
  [key: string]: unknown;
};

function formatPostAuthor(author: PopulatedAuthor | null | undefined) {
  if (!author || typeof author !== "object") return author;

  return {
    ...author,
    _id: author._id?.toString?.() ?? author._id,
    isPremium: isPremiumActive(author),
  };
}

/* =========================
   GET — PUBLIC FEED
========================= */
export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let query = {};

    if (userId) {
      query = { userId }; // 🔥 filter by profile user
    }

    const posts = await Post.find(query)
      .populate({
        path: "userId",
        select: "name email avatar image isPremium premiumExpiresAt",
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      posts.map((post) => ({
        ...post,
        userId: formatPostAuthor(post.userId),
      }))
    );

  } catch (err) {
    console.error("❌ GET POSTS ERROR:", err);
    return NextResponse.json([], { status: 500 });
  }
}


/* =========================
   POST — LOGIN REQUIRED
========================= */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const content = body.content?.trim() || "";
    const images: string[] = body.images || [];

    if (!content && images.length === 0) {
      return NextResponse.json(
        { error: "Post cannot be empty" },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.create({
      userId: session.user.id,
      content,
      images, // ✅ array (image/video URLs)
    });

    const populatedPost = await post.populate({
      path: "userId",
      select: "name email avatar image isPremium premiumExpiresAt",
    });

    return NextResponse.json(
      {
        ...populatedPost.toObject(),
        userId: formatPostAuthor(populatedPost.userId),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
