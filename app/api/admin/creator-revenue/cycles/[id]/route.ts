import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import {
  calculateCycle,
  finalizeCycle,
  releaseCycle,
  refreshCycleEstimates,
  getRevenueConfiguration,
} from "@/app/lib/creator-revenue/service";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";
import CreatorMetricSnapshot from "@/app/models/CreatorMetricSnapshot";
import CreatorRevenueAllocation from "@/app/models/CreatorRevenueAllocation";
import CreatorFraudReview from "@/app/models/CreatorFraudReview";

function publicCycle(cycle: {
  _id: { toString: () => string };
  label: string;
  status: string;
  revenuePoolPaise?: number;
  estimatedPoolPaise?: number;
  totalEligibleScores?: number;
  totalEligibleCreators?: number;
  releasedRevenuePaise?: number;
  finalizedAt?: Date | null;
  paidAt?: Date | null;
  calculatedAt?: Date | null;
}) {
  return {
    id: cycle._id.toString(),
    label: cycle.label,
    status: cycle.status,
    poolPaise: cycle.revenuePoolPaise || cycle.estimatedPoolPaise,
    totalEligibleScores: cycle.totalEligibleScores,
    totalEligibleCreators: cycle.totalEligibleCreators,
    releasedRevenuePaise: cycle.releasedRevenuePaise ?? 0,
    finalizedAt: cycle.finalizedAt ?? null,
    paidAt: cycle.paidAt ?? null,
    calculatedAt: cycle.calculatedAt ?? null,
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
      return NextResponse.json({ error: "Invalid cycle ID" }, { status: 400 });
    }

    const cycle = await CreatorEarningCycle.findById(id);
    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const cycleId = new Types.ObjectId(id);
    const snapshots = await CreatorMetricSnapshot.find({ cycleId })
      .sort({ score: -1 })
      .lean();
    const allocations = await CreatorRevenueAllocation.find({ cycleId })
      .sort({ finalRevenuePaise: -1 })
      .lean();
    const reviews = await CreatorFraudReview.find({ cycleId }).lean();

    const snapshotRows = snapshots.map((s) => ({
      id: s._id.toString(),
      creatorId: s.creatorId.toString(),
      score: s.score,
      eligible: s.eligible,
      revenueState: s.revenueState,
      qualifiedViews: s.qualifiedViews,
      ineligibilityReasons: s.ineligibilityReasons,
      metricScores: s.metricScores,
    }));

    return NextResponse.json({
      cycle: publicCycle(cycle),
      config: publicConfig(await getRevenueConfiguration()),
      snapshots: snapshotRows,
      allocations: allocations.map((a) => ({
        id: a._id.toString(),
        creatorId: a.creatorId.toString(),
        cycleLabel: a.cycleLabel,
        score: a.score,
        creatorSharePercent: a.creatorSharePercent,
        finalRevenuePaise: a.finalRevenuePaise,
        revenueState: a.revenueState,
        finalizedAt: a.finalizedAt ?? null,
        releasedAt: a.releasedAt ?? null,
      })),
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        creatorId: r.creatorId.toString(),
        riskScore: r.riskScore,
        status: r.status,
        note: r.note ?? "",
      })),
    });
  } catch (error) {
    console.error("ADMIN CYCLE DETAIL ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load cycle details" },
      { status: 500 }
    );
  }
}

export async function POST(
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
      return NextResponse.json({ error: "Invalid cycle ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();
    const cycleId = new Types.ObjectId(id);

    let result: Record<string, unknown>;

    if (action === "refresh") {
      result = { cycle: publicCycle(await refreshCycleEstimates(cycleId)) };
    } else if (action === "calculate") {
      const res = await calculateCycle(cycleId);
      result = { cycle: publicCycle(res.cycle!), recalculated: res.recalculated };
    } else if (action === "finalize") {
      const res = await finalizeCycle(cycleId);
      result = {
        finalized: res.finalized,
        alreadyFinalized: res.alreadyFinalized,
        allocations: res.allocations,
        cycle: res.cycle ? publicCycle(res.cycle) : null,
      };
    } else if (action === "release") {
      const res = await releaseCycle(cycleId);
      result = { released: res.released };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await logAdminAction({
      adminId: admin._id,
      action: `CREATOR_REVENUE_${action.toUpperCase()}`,
      targetId: id,
      description: `Performed ${action} on earning cycle ${id}`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("ADMIN CYCLE ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process action" },
      { status: 400 }
    );
  }
}

function publicConfig(config: {
  weights?: unknown;
  normalization?: unknown;
  viewQuality?: unknown;
  commentQuality?: unknown;
  eligibility?: unknown;
}) {
  return {
    weights: config.weights,
    normalization: config.normalization,
    viewQuality: config.viewQuality,
    commentQuality: config.commentQuality,
    eligibility: config.eligibility,
  };
}