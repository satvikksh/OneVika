import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAdmin, logAdminAction } from "@/app/lib/earnings";
import { sendModerationEmail } from "@/app/lib/moderation-email";
import { dbConnect } from "@/app/lib/mongodb";
import Post from "@/app/models/Post";
import Report, {
  REPORT_ACTIONS,
  ReportAction,
  ReportStatus,
} from "@/app/models/Report";
import User from "@/app/models/User";

const USER_STATUS_SEVERITY: Record<string, number> = {
  active: 0,
  warned: 1,
  restricted: 2,
  suspended: 3,
  banned: 4,
};

function userStatusForAction(action: ReportAction, currentStatus: string): string {
  const severity = USER_STATUS_SEVERITY[action] ?? 0;
  return severity > (USER_STATUS_SEVERITY[currentStatus] ?? 0) ? action : currentStatus;
}

function toReportStatus(action: ReportAction): ReportStatus {
  if (action === "review") return "REVIEWING";
  if (action === "dismiss") return "DISMISSED";
  return "RESOLVED";
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
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();
    const reason = String(body.reason || "").trim();

    if (!REPORT_ACTIONS.includes(action as ReportAction)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required for this decision" },
        { status: 400 }
      );
    }

    const report = await Report.findById(new Types.ObjectId(id));
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const decided = {
      decidedBy: admin._id,
      decidedAt: new Date(),
      reviewNote: reason,
      status: toReportStatus(action as ReportAction),
    };

    let actionTaken = "";
    let auditTargetId = id;
    let auditDescription = "";
    let emailResult: Awaited<ReturnType<typeof sendModerationEmail>> | null = null;

    if (action === "review") {
      Object.assign(report, decided, { actionTaken: "review" });
      actionTaken = "review";
      auditDescription = `Marked report ${id} as under review. Reason: ${reason}`;
      await report.save();
    } else if (action === "dismiss") {
      Object.assign(report, decided, { actionTaken: "" });
      actionTaken = "dismissed";
      auditDescription = `Dismissed report ${id}. Reason: ${reason}`;
      await report.save();
    } else if (action === "remove") {
      const contentId = report.contentId;
      const now = new Date();

      await Post.updateOne(
        { _id: contentId },
        {
          $set: {
            status: "removed",
            removedBy: admin._id,
            removedAt: now,
            removalReason: reason,
          },
        }
      );

      await Report.updateMany(
        { contentId, status: { $in: ["PENDING", "REVIEWING"] } },
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

      actionTaken = "removed";
      auditTargetId = contentId.toString();
      auditDescription = `Removed content ${contentId} due to report ${id}. Reason: ${reason}`;

      const contentOwner = await User.findById(report.reportedUserId)
        .select("email name")
        .lean();
      emailResult = await sendModerationEmail({
        email: contentOwner?.email,
        name: contentOwner?.name,
        action: "remove",
        contentType: report.contentType,
        reason,
        referenceId: id,
      });
    } else {
      const reportedUserId = report.reportedUserId;
      const user = await User.findById(reportedUserId);
      if (!user) {
        return NextResponse.json({ error: "Reported user not found" }, { status: 404 });
      }

      const nextStatus = userStatusForAction(action as ReportAction, user.accountStatus || "active");
      user.accountStatus = nextStatus as typeof user.accountStatus;
      user.accountStatusReason = reason;
      user.accountStatusAt = new Date();
      await user.save();

      if (action === "ban") {
        await Report.updateMany(
          { reportedUserId, status: { $in: ["PENDING", "REVIEWING"] } },
          {
            $set: {
              status: "RESOLVED",
              actionTaken: "banned",
              reviewNote: reason,
              decidedBy: admin._id,
              decidedAt: new Date(),
            },
          }
        );
      } else {
        Object.assign(report, decided, { actionTaken: action });
        await report.save();
      }

      actionTaken = action;
      auditTargetId = reportedUserId.toString();
      auditDescription = `Applied '${action}' to user ${reportedUserId} for report ${id}. Reason: ${reason}`;

      emailResult = await sendModerationEmail({
        email: user.email,
        name: user.name,
        action: action as "warn" | "restrict" | "ban",
        contentType: report.contentType,
        reason,
        referenceId: id,
      });
    }

    await logAdminAction({
      adminId: admin._id,
      action: `REPORT_${action.toUpperCase()}`,
      targetId: auditTargetId,
      description: auditDescription,
    });

    const fresh = await Report.findById(report._id)
      .populate("reporterId", "name email avatar image")
      .populate("reportedUserId", "name email");

    return NextResponse.json({
      success: true,
      actionTaken,
      email: emailResult,
      report: {
        id: fresh?._id.toString() ?? report._id.toString(),
        status: fresh?.status ?? report.status,
        actionTaken: fresh?.actionTaken ?? actionTaken,
        reviewNote: fresh?.reviewNote ?? reason,
        decidedAt: fresh?.decidedAt?.toISOString?.() ?? null,
      },
    });
  } catch (error) {
    console.error("ADMIN REPORT ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update report" },
      { status: 400 }
    );
  }
}