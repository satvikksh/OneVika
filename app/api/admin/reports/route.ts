import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";
import Report, { REPORT_REASONS, REPORT_STATUSES, ReportReason } from "@/app/models/Report";

const VIDEO_REGEX = /\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$)/i;

type LeanUser = {
  _id?: { toString: () => string };
  name?: string;
  email?: string;
  avatar?: string;
  image?: string;
};

type LeanReport = {
  _id: { toString: () => string };
  reporterId?: LeanUser | Types.ObjectId;
  reportedUserId?: LeanUser | Types.ObjectId;
  contentId: Types.ObjectId;
  contentType: "post" | "video";
  reason: string;
  description?: string;
  status: string;
  actionTaken?: string;
  reviewNote?: string;
  decidedBy?: Types.ObjectId | null;
  decidedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function userIdOf(value: LeanUser | Types.ObjectId | undefined): string {
  if (!value) return "";
  if (typeof value === "object" && "_id" in value && value._id) {
    return String(value._id.toString());
  }
  if (typeof value === "object" && "toString" in value) {
    return String(value.toString());
  }
  return String(value);
}

function userName(value: LeanUser | Types.ObjectId | undefined): string {
  if (value && typeof value === "object" && "name" in value) {
    return value.name || "Unknown";
  }
  return "Unknown";
}

function userEmail(value: LeanUser | Types.ObjectId | undefined): string {
  if (value && typeof value === "object" && "email" in value) {
    return value.email || "";
  }
  return "";
}

function userImage(value: LeanUser | Types.ObjectId | undefined): string {
  if (value && typeof value === "object" && "avatar" in value) {
    return value.avatar || value.image || "";
  }
  return "";
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const reasonParam = searchParams.get("reason");
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const query: Record<string, unknown> = {};
    if (statusParam && REPORT_STATUSES.includes(statusParam as never)) {
      query.status = statusParam;
    }
    if (reasonParam && REPORT_REASONS.includes(reasonParam as ReportReason)) {
      query.reason = reasonParam;
    }

    const [rawReports, summary, contentCounts] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).limit(250).lean(),
      Report.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Report.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$contentId", count: { $sum: 1 } } },
      ]),
    ]);

    const reports = rawReports as unknown as LeanReport[];

    const contentIds = reports
      .map((report) => report.contentId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const posts = contentIds.length
      ? await Post.find({ _id: { $in: contentIds } })
          .select("_id content images status removedAt createdAt")
          .lean()
      : [];

    const postMap = new Map(
      posts.map((post) => [
        post._id.toString(),
        {
          id: post._id.toString(),
          content: post.content || "",
          images: post.images || [],
          isVideo: (post.images || []).some((url) => VIDEO_REGEX.test(String(url))),
          status: post.status || "active",
          removedAt: post.removedAt ?? null,
          createdAt: post.createdAt?.toISOString?.() ?? null,
        },
      ])
    );

    const countMap = new Map(
      contentCounts.map((row) => [row._id.toString(), row.count])
    );

    const summaryByStatus: Record<string, number> = {};
    summary.forEach((row) => (summaryByStatus[row._id] = row.count));

    const rows = reports.map((report) => {
      const contentId = userIdOf(report.contentId as unknown as LeanUser);
      return {
        id: report._id.toString(),
        contentType: report.contentType,
        reason: report.reason,
        description: report.description || "",
        status: report.status,
        actionTaken: report.actionTaken || "",
        reviewNote: report.reviewNote || "",
        decidedAt: report.decidedAt ?? null,
        createdAt: report.createdAt?.toISOString?.() ?? null,
        updatedAt: report.updatedAt?.toISOString?.() ?? null,
        reportCount: countMap.get(contentId) || 1,
        reporter: {
          id: userIdOf(report.reporterId),
          name: userName(report.reporterId),
          email: userEmail(report.reporterId),
          image: userImage(report.reporterId),
        },
        reportedUser: {
          id: userIdOf(report.reportedUserId),
          name: userName(report.reportedUserId),
          email: userEmail(report.reportedUserId),
        },
        content: postMap.get(contentId) || {
          id: contentId,
          content: "",
          images: [],
          isVideo: report.contentType === "video",
          status: "unknown",
          removedAt: null,
          createdAt: null,
        },
      };
    });

    const filtered = search
      ? rows.filter((row) =>
          [
            row.reason,
            row.description,
            row.status,
            row.reporter.name,
            row.reporter.email,
            row.reportedUser.name,
            row.reportedUser.email,
            row.content.content,
            row.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        )
      : rows;

    return NextResponse.json({
      reports: filtered,
      summary: {
        PENDING: summaryByStatus.PENDING || 0,
        REVIEWING: summaryByStatus.REVIEWING || 0,
        DISMISSED: summaryByStatus.DISMISSED || 0,
        RESOLVED: summaryByStatus.RESOLVED || 0,
        total: reports.length,
      },
    });
  } catch (error) {
    console.error("ADMIN REPORTS ERROR:", error);
    return NextResponse.json({ error: "Unable to load reports" }, { status: 500 });
  }
}