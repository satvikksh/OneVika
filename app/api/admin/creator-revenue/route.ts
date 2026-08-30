import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import {
  getRevenueConfiguration,
  getActiveCycle,
  computePoolPaise,
  syncMinimumWithdrawal,
} from "@/app/lib/creator-revenue/service";
import { validateConfigurationPatch } from "@/app/lib/creator-revenue/config";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";
import CreatorFraudReview from "@/app/models/CreatorFraudReview";
import CreatorMetricSnapshot from "@/app/models/CreatorMetricSnapshot";

function publicConfig(config: {
  enabled?: boolean;
  weights?: unknown;
  normalization?: unknown;
  viewQuality?: unknown;
  commentQuality?: unknown;
  eligibility?: unknown;
  pool?: unknown;
  minimumWithdrawalPaise?: number;
}) {
  return {
    enabled: config.enabled,
    weights: config.weights,
    normalization: config.normalization,
    viewQuality: config.viewQuality,
    commentQuality: config.commentQuality,
    eligibility: config.eligibility,
    pool: config.pool,
    minimumWithdrawalPaise: config.minimumWithdrawalPaise,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const config = await getRevenueConfiguration();
    const activeCycle = await getActiveCycle();

    const [cycles, fraudStats, snapshotStats] = await Promise.all([
      CreatorEarningCycle.find({})
        .sort({ createdAt: -1 })
        .limit(24)
        .lean(),
      CreatorFraudReview.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      CreatorMetricSnapshot.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$revenueState", count: { $sum: 1 } } },
      ]),
    ]);

    const fraudByStatus: Record<string, number> = {};
    fraudStats.forEach((row) => (fraudByStatus[row._id] = row.count));
    const snapshotsByState: Record<string, number> = {};
    snapshotStats.forEach((row) => (snapshotsByState[row._id] = row.count));

    return NextResponse.json({
      config: publicConfig(config),
      poolPaise: computePoolPaise(config),
      activeCycle:
        activeCycle && activeCycle.label
          ? {
              id: activeCycle._id.toString(),
              label: activeCycle.label,
              status: activeCycle.status,
              poolPaise: activeCycle.revenuePoolPaise || activeCycle.estimatedPoolPaise,
              totalEligibleScores: activeCycle.totalEligibleScores,
              totalEligibleCreators: activeCycle.totalEligibleCreators,
              releasedRevenuePaise: activeCycle.releasedRevenuePaise,
            }
          : null,
      cycles: cycles.map((cycle) => ({
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
      })),
      fraudByStatus,
      snapshotsByState,
    });
  } catch (error) {
    console.error("ADMIN CREATOR REVENUE OVERVIEW ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load creator revenue overview" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { errors, normalized } = validateConfigurationPatch(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }
    if (Object.keys(normalized).length === 0) {
      return NextResponse.json({ error: "No valid configuration fields" }, { status: 400 });
    }

    const config = await getRevenueConfiguration();
    const configRecord = config as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(normalized)) {
      configRecord[key] = value;
    }
    await config.save();

    if (normalized.minimumWithdrawalPaise !== undefined) {
      await syncMinimumWithdrawal(normalized.minimumWithdrawalPaise as number);
    }

    await logAdminAction({
      adminId: admin._id,
      action: "CREATOR_REVENUE_CONFIG_UPDATE",
      description: `Updated creator revenue configuration (${Object.keys(normalized).join(", ")})`,
    });

    return NextResponse.json({
      success: true,
      config: publicConfig(await getRevenueConfiguration()),
    });
  } catch (error) {
    console.error("ADMIN CREATOR REVENUE CONFIG ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update configuration" },
      { status: 500 }
    );
  }
}