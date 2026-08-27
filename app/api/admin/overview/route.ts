import { NextResponse } from "next/server";

import { requireAdmin, paiseToRupees } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import EarningTransaction from "@/app/models/EarningTransaction";
import User from "@/app/models/User";
import Withdrawal from "@/app/models/Withdrawal";

export async function GET() {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const [
      totalUsers,
      totalCreators,
      earnings,
      withdrawn,
      pendingWithdrawals,
      completedWithdrawals,
      failedWithdrawals,
      eligibleLikes,
    ] = await Promise.all([
      User.countDocuments({ isAI: { $ne: true } }),
      EarningTransaction.distinct("userId", { type: "EARNING" }).then((ids) => ids.length),
      EarningTransaction.aggregate([
        { $match: { type: "EARNING", status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      Withdrawal.aggregate([
        { $match: { status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      Withdrawal.countDocuments({ status: "PENDING" }),
      Withdrawal.countDocuments({ status: "COMPLETED" }),
      Withdrawal.countDocuments({ status: "FAILED" }),
      EarningTransaction.countDocuments({ type: "EARNING", status: "COMPLETED" }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalCreators,
      totalEarningsGenerated: paiseToRupees(earnings[0]?.total || 0),
      totalWithdrawn: paiseToRupees(withdrawn[0]?.total || 0),
      pendingWithdrawals,
      completedWithdrawals,
      failedWithdrawals,
      totalEligibleLikes: eligibleLikes,
    });
  } catch (error) {
    console.error("ADMIN OVERVIEW ERROR:", error);
    return NextResponse.json({ error: "Unable to load overview" }, { status: 500 });
  }
}
