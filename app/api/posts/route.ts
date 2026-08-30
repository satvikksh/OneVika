export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "../../lib/authOptions";
import { dbConnect } from "../../lib/mongodb";
import { isPremiumActive } from "../../lib/premium";
import Post from "../../models/Post";
import User from "../../models/User";

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
    const recentDays = searchParams.get("recentDays");
    const type = searchParams.get("type");

    const query: {
      userId?: string;
      createdAt?: { $gte: Date };
      status?: { $ne: "removed" };
      $or?: Array<{ contentType: "post" } | { contentType: { $exists: false } }>;
    } = {
      status: { $ne: "removed" },
    };

    if (userId) {
      query.userId = userId; // 🔥 filter by profile user
    }

    if (type && type !== "post") {
      return NextResponse.json([]);
    }

    if (!type || type === "post") {
      query.$or = [{ contentType: "post" }, { contentType: { $exists: false } }];
    }

    if (recentDays) {
      const days = Number(recentDays);

      if (Number.isFinite(days) && days > 0) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: cutoff };
      }
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
        userId: formatPostAuthor(post.userId as unknown as PopulatedAuthor),
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

    await dbConnect();

    const author = await User.findById(session.user.id).select(
      "accountStatus accountStatusReason"
    );

    if (!author) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (author.accountStatus === "banned") {
      return NextResponse.json(
        { error: "Your account has been banned. You can no longer create content." },
        { status: 403 }
      );
    }

    if (author.accountStatus === "restricted") {
      return NextResponse.json(
        { error: "Your account is restricted. Posting is temporarily disabled." },
        { status: 403 }
      );
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

    const post = await Post.create({
      userId: session.user.id,
      contentType: "post",
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
        userId: formatPostAuthor(populatedPost.userId as unknown as PopulatedAuthor),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
