import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import {
  applyFraudAction,
  FraudAction,
  monthLabel,
} from "@/app/lib/creator-revenue/service";
import CreatorFraudReview from "@/app/models/CreatorFraudReview";
import CreatorMetricSnapshot from "@/app/models/CreatorMetricSnapshot";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";

const ACTIONS: FraudAction[] = ["review", "freeze", "reject", "approve", "release"];

export async function GET() {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const label = monthLabel();
    const cycle = await CreatorEarningCycle.findOne({ label });

    const reviews = await CreatorFraudReview.find({})
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const snapByCreator = new Map<
      string,
      { score: number | null; revenueState: string | null; qualifiedViews: number }
    >();
    if (cycle) {
      const snapshots = await CreatorMetricSnapshot.find({
        cycleId: cycle._id,
      })
        .sort({ riskScore: -1 })
        .lean();
      for (const snap of snapshots) {
        const key = snap.creatorId.toString();
        if (!snapByCreator.has(key)) {
          snapByCreator.set(key, {
            score: snap.score,
            revenueState: snap.revenueState ?? null,
            qualifiedViews: snap.qualifiedViews,
          });
        }
      }
    }

    const rows = reviews.map((review) => {
      const creatorId = review.creatorId.toString();
      const snap = snapByCreator.get(creatorId);
      return {
        id: review._id.toString(),
        creatorId,
        riskScore: review.riskScore,
        qualifiedViews: review.qualifiedViews,
        rejectedViews: review.rejectedViews,
        suspiciousViews: review.suspiciousViews,
        status: review.status,
        note: review.note ?? "",
        score: snap?.score ?? null,
        revenueState: snap?.revenueState ?? null,
        cycleLabel: snap ? cycle?.label : null,
      };
    });

    return NextResponse.json({
      cycleLabel: cycle?.label ?? null,
      cycleId: cycle?._id.toString() ?? null,
      queue: rows,
      actions: ACTIONS,
    });
  } catch (error) {
    console.error("ADMIN FRAUD QUEUE ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load fraud queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const creatorId = String(body.creatorId || "");
    const action = String(body.action || "").toLowerCase();
    const note = typeof body.note === "string" ? body.note : "";

    if (!Types.ObjectId.isValid(creatorId)) {
      return NextResponse.json({ error: "Invalid creator ID" }, { status: 400 });
    }
    if (!ACTIONS.includes(action as FraudAction)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { review, cycleId } = await applyFraudAction({
      creatorId: new Types.ObjectId(creatorId),
      action: action as FraudAction,
      adminId: admin._id,
      note,
      cycleLabel: typeof body.cycleLabel === "string" ? body.cycleLabel : undefined,
    });

    await logAdminAction({
      adminId: admin._id,
      action: `CREATOR_REVENUE_FRAUD_${action.toUpperCase()}`,
      targetId: creatorId,
      description: `Fraud action '${action}' applied to creator ${creatorId}`,
    });

    return NextResponse.json({
      success: true,
      review: {
        id: review._id.toString(),
        creatorId: review.creatorId.toString(),
        status: review.status,
        note: review.note ?? "",
      },
      cycleId: cycleId ? cycleId.toString() : null,
    });
  } catch (error) {
    console.error("ADMIN FRAUD ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to apply action" },
      { status: 400 }
    );
  }
}