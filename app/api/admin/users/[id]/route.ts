import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin, logAdminAction } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import Post from "@/app/models/Post";
import Report from "@/app/models/Report";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import Wallet from "@/app/models/Wallet";
import EarningTransaction from "@/app/models/EarningTransaction";
import Withdrawal from "@/app/models/Withdrawal";
import CreatorEarningTransaction from "@/app/models/CreatorEarningTransaction";
import CreatorRevenueAllocation from "@/app/models/CreatorRevenueAllocation";
import CreatorFraudReview from "@/app/models/CreatorFraudReview";
import {
  sendUserModerationEmail,
  UserModerationEmailAction,
} from "@/app/lib/moderation-email";

export const runtime = "nodejs";

const { ObjectId } = mongoose.Types;

const VIDEO_URL_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(?:\?|#|$)/i;

const SAFE_USER_SELECT = [
  "name",
  "email",
  "nickname",
  "provider",
  "image",
  "avatar",
  "isAI",
  "role",
  "isPrivate",
  "bio",
  "sessionVersion",
  "accountStatus",
  "accountStatusReason",
  "accountStatusAt",
  "verified",
  "verifiedAt",
  "isPremium",
  "premiumExpiresAt",
  "premiumActivatedAt",
  "premiumPlan",
  "premiumPaymentProvider",
  "premiumLastPaymentAt",
  "followers",
  "following",
  "createdAt",
  "updatedAt",
  "lastSeen",
].join(" ");

const EMAILABLE_ACTIONS: UserModerationEmailAction[] = [
  "verify",
  "unverify",
  "suspend",
  "unsuspend",
  "ban",
  "unban",
];

function handleFromName(name?: string | null) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function rupeify(paise: number) {
  return Number.isFinite(paise) ? paise : 0;
}

function groupByStatus<T extends { _id: string; n: number; amountPaise?: number }>(
  rows: T[]
) {
  const out: Record<string, { count: number; amountPaise: number }> = {};
  for (const r of rows) {
    out[r._id] = {
      count: r.n ?? 0,
      amountPaise: rupeify(r.amountPaise ?? 0),
    };
  }
  return out;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await props.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    await dbConnect();

    const oid = new ObjectId(id);
    const user = await User.findById(oid).select(SAFE_USER_SELECT).lean();

    if (!user || user.isAI) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // content
    const postCountAgg = await Post.aggregate([
      { $match: { userId: oid } },
      {
        $group: {
          _id: { $ifNull: ["$status", "active"] },
          n: { $sum: 1 },
        },
      },
    ]);
    const postBucket: Record<string, number> = {};
    for (const r of postCountAgg) postBucket[String(r._id)] = r.n ?? 0;
    const postsTotal = Object.values(postBucket).reduce((a, b) => a + b, 0);

    const videoRows = await Post.aggregate([
      { $match: { userId: oid } },
      {
        $project: {
          isVideo: {
            $anyElementTrue: {
              $map: {
                input: { $ifNull: ["$images", []] },
                as: "img",
                in: {
                  $regexMatch: {
                    input: "$$img",
                    regex: VIDEO_URL_RE.source,
                    options: "i",
                  },
                },
              },
            },
          },
        },
      },
      { $match: { isVideo: true } },
      { $count: "n" },
    ]);

    const recentPosts = await Post.find({ userId: oid })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id content images status createdAt")
      .lean();

    const likesCount = await Post.aggregate([
      { $match: { userId: oid } },
      { $group: { _id: null, likes: { $sum: { $size: { $ifNull: ["$likes", []] } } } } },
    ]);

    // finance
    const wallet = await Wallet.findOne({ userId: oid })
      .select("availableBalancePaise totalEarnedPaise totalWithdrawnPaise")
      .lean();

    const earningTxAgg = await EarningTransaction.aggregate([
      { $match: { userId: oid } },
      {
        $group: {
          _id: "$type",
          n: { $sum: 1 },
          amountPaise: { $sum: "$amountPaise" },
        },
      },
    ]);
    const recentEarningTx = await EarningTransaction.find({ userId: oid })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("type amountPaise status description createdAt")
      .lean();

    const withdrawalAgg = await Withdrawal.aggregate([
      { $match: { userId: oid } },
      {
        $group: {
          _id: "$status",
          n: { $sum: 1 },
          amountPaise: { $sum: "$amountPaise" },
        },
      },
    ]);
    const recentWithdrawals = await Withdrawal.find({ userId: oid })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("amountPaise status payoutMethod createdAt completedAt adminNote")
      .lean();

    const creatorTxAgg = await CreatorEarningTransaction.aggregate([
      { $match: { creatorId: oid } },
      {
        $group: {
          _id: "$status",
          n: { $sum: 1 },
          amountPaise: { $sum: "$amountPaise" },
        },
      },
    ]);

    const allocAgg = await CreatorRevenueAllocation.aggregate([
      { $match: { creatorId: oid } },
      {
        $group: {
          _id: "$revenueState",
          n: { $sum: 1 },
          amountPaise: { $sum: "$finalRevenuePaise" },
        },
      },
    ]);

    const fraudReviews = await CreatorFraudReview.find({ creatorId: oid })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("riskScore status createdAt")
      .lean();

    // reports + moderation history
    const reports = await Report.find({ reportedUserId: oid })
      .sort({ createdAt: -1 })
      .limit(15)
      .select("reason description status actionTaken contentType createdAt")
      .lean();
    const reportsTotal = await Report.countDocuments({ reportedUserId: oid });

    const history = await AdminAuditLog.find({ targetId: id })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    // delete eligibility (never when it would destroy compliance records)
    const [hasWallet, hasEarningTx, hasCreatorTx, hasAllocations, hasWithdrawals, hasReports] =
      await Promise.all([
        Wallet.exists({ userId: oid }),
        EarningTransaction.exists({ userId: oid }),
        CreatorEarningTransaction.exists({ creatorId: oid }),
        CreatorRevenueAllocation.exists({ creatorId: oid }),
        Withdrawal.exists({ userId: oid }),
        Report.exists({ $or: [{ reportedUserId: oid }, { reporterId: oid }] }),
      ]);

    const deleteBlocks: string[] = [];
    if (user.role === "ADMIN") deleteBlocks.push("admin-role");
    if (String(admin._id) === id) deleteBlocks.push("self");
    if (Boolean(hasWallet) || Boolean(hasEarningTx) || Boolean(hasCreatorTx) || Boolean(hasAllocations) || Boolean(hasWithdrawals)) {
      deleteBlocks.push("financial-records");
    }
    if (Boolean(hasReports)) deleteBlocks.push("report-records");

    return NextResponse.json({
      user: {
        id,
        name: user.name,
        email: user.email,
        handle: handleFromName(user.name),
        nickname: user.nickname ?? "",
        bio: user.bio ?? "",
        isPrivate: Boolean(user.isPrivate),
        avatar: user.avatar || user.image || "",
        provider: user.provider ?? "credentials",
        role: user.role || "USER",
        accountStatus: user.accountStatus || "active",
        accountStatusReason: user.accountStatusReason ?? "",
        accountStatusAt: user.accountStatusAt ?? null,
        verified: user.verified === true,
        verifiedAt: user.verifiedAt ?? null,
        isPremium: user.isPremium === true,
        premiumExpiresAt: user.premiumExpiresAt ?? null,
        premiumActivatedAt: user.premiumActivatedAt ?? null,
        premiumPlan: user.premiumPlan ?? null,
        premiumPaymentProvider: user.premiumPaymentProvider ?? null,
        premiumLastPaymentAt: user.premiumLastPaymentAt ?? null,
        followers: Array.isArray(user.followers) ? user.followers.length : 0,
        following: Array.isArray(user.following) ? user.following.length : 0,
        createdAt: user.createdAt ?? null,
        updatedAt: user.updatedAt ?? null,
        lastSeen: user.lastSeen ?? null,
      },
      content: {
        postsTotal,
        postsActive: postBucket.active ?? 0,
        postsRemoved: postBucket.removed ?? 0,
        videos: videoRows[0]?.n ?? 0,
        totalLikes: likesCount[0]?.likes ?? 0,
        recentPosts: recentPosts.map((p) => ({
          id: String(p._id),
          content: String(p.content ?? "").slice(0, 160),
          status: p.status ?? "active",
          isVideo: Array.isArray(p.images) && p.images.some((u: string) => VIDEO_URL_RE.test(u)),
          images: Array.isArray(p.images) ? p.images.slice(0, 4) : [],
          createdAt: p.createdAt,
        })),
      },
      finance: {
        wallet: wallet
          ? {
              availablePaise: rupeify(wallet.availableBalancePaise),
              totalEarnedPaise: rupeify(wallet.totalEarnedPaise),
              totalWithdrawnPaise: rupeify(wallet.totalWithdrawnPaise),
            }
          : null,
        earningTransactions: {
          summary: groupByStatus(earningTxAgg),
          recent: recentEarningTx.map((t) => ({
            id: String(t._id),
            type: t.type,
            amountPaise: rupeify(t.amountPaise),
            status: t.status,
            description: t.description ?? "",
            createdAt: t.createdAt,
          })),
        },
        withdrawals: {
          summary: groupByStatus(withdrawalAgg),
          recent: recentWithdrawals.map((w) => ({
            id: String(w._id),
            amountPaise: rupeify(w.amountPaise),
            status: w.status,
            payoutMethod: w.payoutMethod,
            adminNote: w.adminNote ?? "",
            createdAt: w.createdAt,
            completedAt: w.completedAt ?? null,
          })),
        },
        creatorEarningTransactions: {
          summary: groupByStatus(creatorTxAgg),
        },
        creatorAllocations: {
          summary: groupByStatus(allocAgg),
        },
        fraudReviews: fraudReviews.map((f) => ({
          id: String(f._id),
          riskScore: rupeify(f.riskScore),
          status: f.status,
          createdAt: f.createdAt,
        })),
      },
      reports: {
        total: reportsTotal,
        items: reports.map((r) => ({
          id: String(r._id),
          reason: r.reason,
          description: r.description ?? "",
          status: r.status,
          actionTaken: r.actionTaken ?? null,
          contentType: r.contentType,
          createdAt: r.createdAt,
        })),
      },
      moderationHistory: history.map((h) => ({
        id: String(h._id),
        adminId: String(h.adminId),
        action: h.action,
        description: h.description,
        createdAt: h.createdAt,
      })),
      deletable: deleteBlocks.length === 0,
      deleteBlocks,
    });
  } catch (error) {
    console.error("ADMIN USERS DETAIL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}

type UserAction =
  | "verify"
  | "unverify"
  | "suspend"
  | "unsuspend"
  | "ban"
  | "unban"
  | "update";

const USER_ACTIONS = new Set<UserAction>([
  "verify",
  "unverify",
  "suspend",
  "unsuspend",
  "ban",
  "unban",
  "update",
]);

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await props.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "").trim() as UserAction;
  const reason = String(body?.reason ?? "").trim();

  if (!USER_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    await dbConnect();

    const oid = new ObjectId(id);
    const user = await User.findById(oid).select("name email role isAI").lean();

    if (!user || user.isAI) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts cannot be modified" },
        { status: 403 }
      );
    }

    const requiresReason = action === "suspend" || action === "ban";
    if (requiresReason && !reason) {
      return NextResponse.json(
        { error: "A reason is required for this action" },
        { status: 400 }
      );
    }

    let $set: Record<string, unknown> = {};
    let auditAction = "";

    if (action === "update") {
      const patch = (body?.update ?? {}) as Record<string, unknown>;
      const set: Record<string, unknown> = {};
      if (typeof patch.name === "string") {
        const name = patch.name.trim();
        if (!name) {
          return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
        }
        if (name.length > 80) {
          return NextResponse.json({ error: "Name is too long" }, { status: 400 });
        }
        set.name = name;
      }
      if (typeof patch.nickname === "string") {
        set.nickname = patch.nickname.trim().slice(0, 60);
      }
      if (typeof patch.bio === "string") {
        if (patch.bio.trim().length > 300) {
          return NextResponse.json({ error: "Bio is too long" }, { status: 400 });
        }
        set.bio = patch.bio;
      }
      if (typeof patch.isPrivate === "boolean") {
        set.isPrivate = patch.isPrivate;
      }
      if (Object.keys(set).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }
      $set = set;
      auditAction = "USER_UPDATE";
    } else {
      switch (action) {
        case "verify":
          $set = { verified: true, verifiedAt: new Date() };
          auditAction = "USER_VERIFY";
          break;
        case "unverify":
          $set = { verified: false, verifiedAt: null };
          auditAction = "USER_UNVERIFY";
          break;
        case "suspend":
          $set = {
            accountStatus: "suspended",
            accountStatusReason: reason,
            accountStatusAt: new Date(),
          };
          auditAction = "USER_SUSPEND";
          break;
        case "unsuspend":
          $set = {
            accountStatus: "active",
            accountStatusReason: "",
            accountStatusAt: null,
          };
          auditAction = "USER_UNSUSPEND";
          break;
        case "ban":
          $set = {
            accountStatus: "banned",
            accountStatusReason: reason,
            accountStatusAt: new Date(),
          };
          auditAction = "USER_BAN";
          break;
        case "unban":
          $set = {
            accountStatus: "active",
            accountStatusReason: "",
            accountStatusAt: null,
          };
          auditAction = "USER_UNBAN";
          break;
      }
    }

    const updated = await User.findByIdAndUpdate(oid, { $set }, { new: true })
      .select(SAFE_USER_SELECT)
      .lean();

    await logAdminAction({
      adminId: admin._id,
      action: auditAction,
      targetId: id,
      description: `${auditAction} — ${user.name} (${user.email})${reason ? ` — ${reason}` : ""}`,
    });

    let email: { delivered: boolean; error?: string } = { delivered: false };
    if (EMAILABLE_ACTIONS.includes(action as UserModerationEmailAction)) {
      email = await sendUserModerationEmail({
        email: user.email,
        name: user.name,
        action: action as UserModerationEmailAction,
        reason,
        referenceId: id,
      });
    }

    return NextResponse.json({
      success: true,
      action: auditAction,
      email,
      user: updated
        ? {
            id,
            name: updated.name,
            email: updated.email,
            role: updated.role || "USER",
            accountStatus: updated.accountStatus || "active",
            accountStatusReason: updated.accountStatusReason ?? "",
            verified: updated.verified === true,
            verifiedAt: updated.verifiedAt ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("ADMIN USER ACTION ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await props.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const reason = String(body?.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "A reason is required to delete a user" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    const oid = new ObjectId(id);
    const user = await User.findById(oid).select("name email role isAI").lean();

    if (!user || user.isAI) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (String(admin._id) === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts cannot be deleted" },
        { status: 403 }
      );
    }

    const [hasWallet, hasEarningTx, hasCreatorTx, hasAllocations, hasWithdrawals, hasReports] =
      await Promise.all([
        Wallet.exists({ userId: oid }),
        EarningTransaction.exists({ userId: oid }),
        CreatorEarningTransaction.exists({ creatorId: oid }),
        CreatorRevenueAllocation.exists({ creatorId: oid }),
        Withdrawal.exists({ userId: oid }),
        Report.exists({ $or: [{ reportedUserId: oid }, { reporterId: oid }] }),
      ]);

    if (
      Boolean(hasWallet) ||
      Boolean(hasEarningTx) ||
      Boolean(hasCreatorTx) ||
      Boolean(hasAllocations) ||
      Boolean(hasWithdrawals)
    ) {
      return NextResponse.json(
        {
          error:
            "This user has financial records (wallet, earnings or withdrawals) that must be preserved. Suspend or ban the account instead of deleting it.",
        },
        { status: 409 }
      );
    }

    if (Boolean(hasReports)) {
      return NextResponse.json(
        {
          error:
            "This user has reporting history that must be preserved. Suspend or ban the account instead of deleting it.",
        },
        { status: 409 }
      );
    }

    await User.deleteOne({ _id: oid });

    await logAdminAction({
      adminId: admin._id,
      action: "USER_DELETE",
      targetId: id,
      description: `USER_DELETE — ${user.name} (${user.email}) — ${reason}`,
    });

    const email = await sendUserModerationEmail({
      email: user.email,
      name: user.name,
      action: "delete",
      reason,
      referenceId: id,
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
      email,
    });
  } catch (error) {
    console.error("ADMIN USER DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}