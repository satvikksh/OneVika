import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";
import Report, { REPORT_REASONS, ReportReason } from "@/app/models/Report";

const VIDEO_REGEX = /\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$)/i;

function contentMediaType(post: { images?: string[] }): "post" | "video" {
  if (Array.isArray(post.images) && post.images.some((url) => VIDEO_REGEX.test(String(url)))) {
    return "video";
  }
  return "post";
}

function getReportedUserId(post: { userId?: unknown }): string | null {
  const userId = post.userId;
  if (userId && typeof userId === "object" && "_id" in userId) {
    return String((userId as { _id: unknown })._id);
  }
  if (userId && typeof userId === "object" && "toString" in userId) {
    return String((userId as { toString: () => string }).toString());
  }
  return userId ? String(userId) : null;
}

/* =========================
   GET — check own report for a given content
========================= */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    if (!contentId || !Types.ObjectId.isValid(contentId)) {
      return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
    }

    await dbConnect();
    const report = await Report.findOne({
      reporterId: new Types.ObjectId(session.user.id),
      contentId: new Types.ObjectId(contentId),
    })
      .select("status reason contentType createdAt")
      .lean();

    return NextResponse.json({
      alreadyReported: Boolean(report),
      report: report
        ? {
            status: report.status,
            reason: report.reason,
            contentType: report.contentType,
            createdAt: report.createdAt?.toISOString?.() ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("REPORT CHECK ERROR:", error);
    return NextResponse.json({ error: "Unable to check report status" }, { status: 500 });
  }
}

/* =========================
   POST — create a report
========================= */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const contentId = String(body.contentId || "");
    const reason = String(body.reason || "");
    const description = String(body.description || "").slice(0, 1200);

    if (!contentId || !Types.ObjectId.isValid(contentId)) {
      return NextResponse.json({ error: "A valid content ID is required" }, { status: 400 });
    }
    if (!REPORT_REASONS.includes(reason as ReportReason)) {
      return NextResponse.json({ error: "Please choose a valid reason" }, { status: 400 });
    }

    await dbConnect();

    const post = await Post.findById(new Types.ObjectId(contentId))
      .select("userId status images content")
      .lean();

    if (!post) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const reportedUserId = getReportedUserId(post);
    const reporterId = new Types.ObjectId(session.user.id);

    if (reportedUserId && reportedUserId === session.user.id) {
      return NextResponse.json({ error: "You cannot report your own content" }, { status: 400 });
    }

    if (!reportedUserId || !Types.ObjectId.isValid(reportedUserId)) {
      return NextResponse.json({ error: "Content owner not found" }, { status: 500 });
    }

    if (post.status === "removed") {
      return NextResponse.json(
        { error: "This content has already been removed" },
        { status: 409 }
      );
    }

    const existing = await Report.findOne({
      reporterId,
      contentId: new Types.ObjectId(contentId),
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "You have already reported this content" },
        { status: 409 }
      );
    }

    const report = await Report.create({
      reporterId,
      reportedUserId: new Types.ObjectId(reportedUserId),
      contentId: new Types.ObjectId(contentId),
      contentType: contentMediaType(post),
      reason: reason as ReportReason,
      description: description.trim(),
      status: "PENDING",
      decidedBy: null,
      decidedAt: null,
    });

    return NextResponse.json(
      {
        success: true,
        report: {
          id: report._id.toString(),
          contentType: report.contentType,
          reason: report.reason,
          status: report.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE REPORT ERROR:", error);
    return NextResponse.json({ error: "Unable to submit report" }, { status: 500 });
  }
}