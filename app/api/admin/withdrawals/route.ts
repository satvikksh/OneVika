import { NextResponse } from "next/server";

import { paiseToRupees, requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import Withdrawal from "@/app/models/Withdrawal";

type AdminWithdrawalRow = {
  _id: { toString: () => string };
  userId?: {
    _id?: { toString: () => string };
    name?: string;
    email?: string;
  };
  amountPaise: number;
  eligibleLikes: number;
  payoutMethod: string;
  payoutDetailsMasked: string;
  status: string;
  providerPayoutId?: string | null;
  createdAt?: Date;
  failureReason?: string;
  adminNote?: string;
};

const STATUSES = new Set([
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REJECTED",
  "REVERSED",
]);

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.toUpperCase();
    const filter = status && STATUSES.has(status) ? { status } : {};

    const withdrawals = await Withdrawal.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      withdrawals: (withdrawals as unknown as AdminWithdrawalRow[]).map((withdrawal) => ({
        id: withdrawal._id.toString(),
        user: {
          id: withdrawal.userId?._id?.toString?.() || "",
          name: withdrawal.userId?.name || "Unknown",
          email: withdrawal.userId?.email || "",
        },
        amount: paiseToRupees(withdrawal.amountPaise),
        eligibleLikes: withdrawal.eligibleLikes,
        payoutMethod: withdrawal.payoutMethod,
        payoutDetailsMasked: withdrawal.payoutDetailsMasked,
        status: withdrawal.status,
        withdrawalId: withdrawal._id.toString(),
        providerPayoutId: withdrawal.providerPayoutId || "",
        createdAt: withdrawal.createdAt?.toISOString?.() ?? null,
        failureReason: withdrawal.failureReason || "",
        adminNote: withdrawal.adminNote || "",
      })),
    });
  } catch (error) {
    console.error("ADMIN WITHDRAWALS ERROR:", error);
    return NextResponse.json({ error: "Unable to load withdrawals" }, { status: 500 });
  }
}
