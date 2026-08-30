import { NextResponse } from "next/server";
import { Types } from "mongoose";

import {
  logAdminAction,
  requireAdmin,
} from "@/app/lib/earnings";
import { sendModerationEmail } from "@/app/lib/moderation-email";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";
import Report from "@/app/models/Report";
import User from "@/app/models/User";

const VIDEO_REGEX = /\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$)/i;

const POST_ACTIONS = ["hide", "remove", "restore"] as const;
type PostAction = (typeof POST_ACTIONS)[number];

type LeanUser = {
  _id?: { toString: () => string };
  name?: string;
  email?: string;
  avatar?: string;
  image?: string;
  accountStatus?: string;
  isPremium?: boolean;
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

function userNameSafe(value: LeanUser | Types.ObjectId | undefined): string {
  if (value && typeof value === "object" && "name" in value) {
    return value.name || "Unknown";
  }
  return "Unknown";
}

function userEmailSafe(value: LeanUser | Types.ObjectId | undefined): string {
  if (value && typeof value === "object" && "email" in value) {
    return value.email || "";
  }
  return "";
}

function userImageSafe(value: LeanUser | Types.ObjectId | undefined): string {
  if (value && typeof value === "object" && "avatar" in value) {
    return value.avatar || value.image || "";
  }
  return "";
}

function serializeReports(reports: unknown[]) {
  return (reports as Array<Record<string, unknown>>).map((report) => {
    const contentId = userIdOf(report.contentId as LeanUser | Types.ObjectId);
    const rawReporter = report.reporterId as LeanUser | Types.ObjectId | undefined;
    return {
      id: String((report._id as { toString: () => string }).toString()),
      contentType: String(report.contentType || "post"),
      reason: String(report.reason || ""),
      description: String(report.description || ""),
      status: String(report.status || "PENDING"),
      actionTaken: String(report.actionTaken || ""),
      reviewNote: String(report.reviewNote || ""),
      contentId,
      reporter: {
        id: userIdOf(rawReporter),
        name: userNameSafe(rawReporter),
        email: userEmailSafe(rawReporter),
        image: userImageSafe(rawReporter),
      },
      createdAt:
        typeof report.createdAt === "object" && "toISOString" in (report.createdAt as object)
          ? (report.createdAt as { toISOString: () => string }).toISOString()
          : null,
      decidedAt:
        report.decidedAt &&
        typeof report.decidedAt === "object" &&
        "toISOString" in (report.decidedAt as object)
          ? (report.decidedAt as { toISOString: () => string }).toISOString()
          : null,
    };
  });
}

function serializePost(post: Record<string, unknown>) {
  const images = Array.isArray(post.images) ? post.images.map(String) : [];
  const isVideo = images.some((url) => VIDEO_REGEX.test(url));
  const creator = post.userId as LeanUser | Types.ObjectId | undefined;
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];

  const toIso = (value: unknown) =>
    value && typeof value === "object" && "toISOString" in value
      ? (value as { toISOString: () => string }).toISOString()
      : null;

  return {
    id: String((post._id as { toString: () => string }).toString()),
    contentType: isVideo ? "video" : "post",
    isVideo,
    content: String(post.content || ""),
    images,
    status: String(post.status || "active"),
    likeCount: likes.length,
    commentCount: comments.length,
    removedAt: toIso(post.removedAt),
    removalReason: String(post.removalReason || ""),
    removedBy: userIdOf(post.removedBy as LeanUser | Types.ObjectId | undefined),
    createdAt: toIso(post.createdAt),
    updatedAt: toIso(post.updatedAt),
    creator: {
      id: userIdOf(creator),
      name: userNameSafe(creator),
      email: userEmailSafe(creator),
      image: userImageSafe(creator),
      accountStatus: String((creator as LeanUser | undefined)?.accountStatus || "active"),
      isPremium: Boolean((creator as LeanUser | undefined)?.isPremium),
    },
  };
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await props.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
    }

    const post = await Post.findById(new Types.ObjectId(id))
      .populate("userId", "name email image avatar accountStatus isPremium")
      .lean();
    if (!post) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const reports = await Report.find({ contentId: new Types.ObjectId(id) })
      .populate("reporterId", "name email avatar image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      post: serializePost(post as unknown as Record<string, unknown>),
      reports: serializeReports(reports as unknown[]),
    });
  } catch (error) {
    console.error("ADMIN POST DETAIL ERROR:", error);
    return NextResponse.json({ error: "Unable to load content" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await props.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase() as PostAction;
    const reason = String(body.reason || "").trim();

    if (!POST_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if ((action === "hide" || action === "remove") && !reason) {
      return NextResponse.json(
        { error: "A removal reason is required" },
        { status: 400 }
      );
    }

    const post = await Post.findById(new Types.ObjectId(id));
    if (!post) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const now = new Date();
    const contentId = post._id.toString();
    const perform = action === "hide" || action === "remove" ? "hide" : "restore";

    if (perform === "hide" && post.status === "removed") {
      return NextResponse.json(
        { error: "This content is already hidden" },
        { status: 409 }
      );
    }
    if (perform === "restore" && post.status !== "removed") {
      return NextResponse.json(
        { error: "This content is already visible" },
        { status: 409 }
      );
    }

    if (perform === "hide") {
      post.status = "removed";
      post.removedBy = admin._id;
      post.removedAt = now;
      post.removalReason = reason;
      await post.save();

      await Report.updateMany(
        { contentId: post._id, status: { $in: ["PENDING", "REVIEWING"] } },
        {
          $set: {
            status: "RESOLVED",
            actionTaken: "removed",
            reviewNote: reason,
            decidedBy: admin._id,
            decidedAt: now,
          },
        }
      );
    } else {
      post.status = "active";
      post.removedBy = null as never;
      post.removedAt = null as never;
      post.removalReason = "";
      await post.save();
    }

    const finalReason =
      perform === "restore"
        ? reason || "Content reviewed and restored by the moderation team."
        : reason;

    await logAdminAction({
      adminId: admin._id,
      action: perform === "hide" ? "POST_HIDE" : "POST_RESTORE",
      targetId: contentId,
      description:
        perform === "hide"
          ? `Hidden content ${contentId}. Reason: ${finalReason}`
          : `Restored content ${contentId}. Note: ${finalReason}`,
    });

    const creator = await User.findById(post.userId).select("email name").lean();
    const email = await sendModerationEmail({
      email: creator?.email,
      name: creator?.name,
      action: perform === "hide" ? "remove" : "restore",
      contentType: (post.images || []).some((url) =>
        VIDEO_REGEX.test(String(url))
      )
        ? "video"
        : "post",
      reason: finalReason,
      referenceId: contentId,
    });

    const fresh = await Post.findById(post._id)
      .populate("userId", "name email image avatar accountStatus isPremium")
      .lean();

    return NextResponse.json({
      success: true,
      action: perform,
      email,
      post: fresh
        ? serializePost(fresh as unknown as Record<string, unknown>)
        : null,
    });
  } catch (error) {
    console.error("ADMIN POST ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update content" },
      { status: 400 }
    );
  }
}