import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import { findOrCreateCycleForLabel } from "@/app/lib/creator-revenue/service";
import CreatorEarningCycle from "@/app/models/CreatorEarningCycle";

function publicCycle(cycle: {
  _id: { toString: () => string };
  label: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
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
    startDate: cycle.startDate ?? null,
    endDate: cycle.endDate ?? null,
    poolPaise: cycle.revenuePoolPaise || cycle.estimatedPoolPaise,
    totalEligibleScores: cycle.totalEligibleScores,
    totalEligibleCreators: cycle.totalEligibleCreators,
    releasedRevenuePaise: cycle.releasedRevenuePaise ?? 0,
    finalizedAt: cycle.finalizedAt ?? null,
    paidAt: cycle.paidAt ?? null,
    calculatedAt: cycle.calculatedAt ?? null,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const cycles = await CreatorEarningCycle.find({})
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    return NextResponse.json({ cycles: cycles.map(publicCycle) });
  } catch (error) {
    console.error("ADMIN CREATOR REVENUE CYCLES ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load earning cycles" },
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
    const action = String(body.action || "");
    const label = String(body.label || "");

    if (action === "create") {
      if (!/^\d{4}-\d{2}$/.test(label)) {
        return NextResponse.json({ error: "Label must be YYYY-MM" }, { status: 400 });
      }
      const cycle = await findOrCreateCycleForLabel(label);
      return NextResponse.json({ success: true, cycle: publicCycle(cycle) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("ADMIN CREATOR REVENUE CYCLE ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process action" },
      { status: 500 }
    );
  }
}