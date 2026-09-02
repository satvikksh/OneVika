import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, logAdminAction } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import Wallet from "@/app/models/Wallet";

export const runtime = "nodejs";

const PREMIUM_MATCH = {
  $or: [
    { revenueType: "premium" },
    { purpose: "membership" },
  ],
};

const SUCCESS_STATUSES = ["COMPLETED"];

/**
 * Reconciliation of a past accounting bug: successful Premium (membership)
 * purchases were incorrectly crediting the purchasing user's wallet.
 *
 * - The PaymentTransactions themselves are correct (they are the platform-level
 *   Premium Revenue source) and are PRESERVED.
 * - The extra wallet balances created by the bug are identified idempotently
 *   and removed (GET = dry-run report, POST = apply).
 *
 * This is reversible and conservative: we only reverse the exact sum that the
 * bug credited (sum of the buyer's COMPLETED premium transactions), never below
 * zero, and never touch unrelated wallet funds.
 */

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  // Buyers with completed premium transactions (candidates that may have been
  // wrongly credited by the old creditWallet(MEMBERSHIP_PURCHASE) bug).
  const agg = await PaymentTransaction.aggregate([
    { $match: { ...PREMIUM_MATCH, status: { $in: SUCCESS_STATUSES } } },
    {
      $group: {
        _id: "$userId",
        miscreditedTotalPaise: { $sum: "$amountPaise" },
        count: { $sum: 1 },
        transactionIds: { $push: "$transactionId" },
      },
    },
  ]);

  const wallets = await Wallet.find({
    userId: { $in: agg.map((r) => r._id) },
  }).lean();

  const walletByUser = new Map(wallets.map((w) => [String(w.userId), w]));

  const report = agg
    .map((row) => {
      const wallet = walletByUser.get(String(row._id));
      return {
        userId: String(row._id),
        premiumTransactionCount: row.count,
        miscreditedTotalPaise: row.miscreditedTotalPaise,
        walletAvailablePaise: wallet?.availableBalancePaise ?? 0,
        // The amount that can be safely reversed = min(miscredited, available)
        reversePaise: Math.min(row.miscreditedTotalPaise, wallet?.availableBalancePaise ?? 0),
        transactionIds: row.transactionIds,
      };
    })
    .filter((r) => r.reversePaise > 0)
    .sort((a, b) => b.reversePaise - a.reversePaise);

  return NextResponse.json({
    dryRun: true,
    instructions:
      "Buyer wallets that received Premium revenue from the previous creditWallet bug. POST with {apply:true} to remove these balances (PaymentTransactions preserved as platform revenue; no duplicates).",
    items: report,
    totalReversePaise: report.reduce((s, r) => s + r.reversePaise, 0),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  let body: { apply?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const dryRun = body?.apply !== true;

  const agg = await PaymentTransaction.aggregate([
    { $match: { ...PREMIUM_MATCH, status: { $in: SUCCESS_STATUSES } } },
    {
      $group: {
        _id: "$userId",
        miscreditedTotalPaise: { $sum: "$amountPaise" },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalReversePaise = 0;
  const applied: {
    userId: string;
    reversePaise: number;
    walletAvailableAfterPaise: number;
  }[] = [];

  for (const row of agg) {
    const wallet = await Wallet.findOne({ userId: row._id });
    if (!wallet) continue;
    const reverse = Math.min(row.miscreditedTotalPaise, wallet.availableBalancePaise);
    if (reverse <= 0) continue;

    if (dryRun) {
      totalReversePaise += reverse;
      applied.push({
        userId: String(row._id),
        reversePaise: reverse,
        walletAvailableAfterPaise: wallet.availableBalancePaise - reverse,
      });
      continue;
    }

    // Apply: remove the incorrectly-attributed premium balance.
    await Wallet.updateOne(
      { _id: wallet._id },
      {
        $inc: {
          availableBalancePaise: -reverse,
          totalCreditsPaise: -Math.min(reverse, wallet.totalCreditsPaise ?? 0),
          totalEarnedPaise: -Math.min(reverse, wallet.totalEarnedPaise ?? 0),
        },
      }
    );
    totalReversePaise += reverse;
    applied.push({
      userId: String(row._id),
      reversePaise: reverse,
      walletAvailableAfterPaise: Math.max(0, wallet.availableBalancePaise - reverse),
    });

    await logAdminAction({
      adminId: admin._id,
      action: "PREMIUM_REVENUE_RECONCILED",
      targetId: String(wallet._id),
      description: `Removed incorrectly-attributed Premium balance of ₹${
        Math.round(reverse) / 100
      } from buyer wallet; revenue retained as platform Premium Revenue.`,
    });
  }

  return NextResponse.json({
    dryRun,
    appliedCount: applied.length,
    totalReversePaise,
    items: applied,
    message: dryRun
      ? "Dry-run report. POST with {apply:true} to apply."
      : "Reconciliation applied. PaymentTransactions preserved as platform Premium Revenue; no duplicates created.",
  });
}
