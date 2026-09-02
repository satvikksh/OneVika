import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, paiseToRupees } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentRefund from "@/app/models/PaymentRefund";
import User from "@/app/models/User";

/**
 * Platform-level Premium Revenue.
 *
 * Premium revenue is derived SOLELY from server-verified Cashfree premium
 * (membership) PaymentTransactions. It is platform revenue — it is never
 * credited to any user wallet or earnings account. Refunds are tracked
 * separately (via PaymentRefund linked to the premium transaction) and
 * subtracted to produce Net Premium Revenue.
 */

const PREMIUM_MATCH = {
  $or: [
    { revenueType: "premium" },
    { purpose: "membership" },
  ],
};

const SUCCESS_STATUSES = ["COMPLETED"];
const PENDING_STATUSES = [
  "INITIATED",
  "PENDING",
  "PROCESSING",
  "VERIFICATION_REQUIRED",
];
const FAILED_STATUSES = ["FAILED", "CANCELLED", "USER_DROPPED"];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get("groupBy") === "month" ? "month" : "day";
  const limit = Math.min(Number(searchParams.get("limit") || "200"), 1000);

  try {
    const [summary, breakdown, statusCounts, recent, refundResult] =
      await Promise.all([
        PaymentTransaction.aggregate([
          { $match: PREMIUM_MATCH },
          {
            $facet: {
              total: [
                { $match: { status: { $in: SUCCESS_STATUSES } } },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 },
                    grossPaise: { $sum: "$amountPaise" },
                  },
                },
              ],
              pending: [
                { $match: { status: { $in: PENDING_STATUSES } } },
                { $group: { _id: null, count: { $sum: 1 } } },
              ],
              failed: [
                { $match: { status: { $in: FAILED_STATUSES } } },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 },
                    failedPaise: { $sum: "$amountPaise" },
                  },
                },
              ],
            },
          },
        ]),
        PaymentTransaction.aggregate([
          { $match: { ...PREMIUM_MATCH, status: { $in: SUCCESS_STATUSES } } },
          {
            $group: {
              _id:
                groupBy === "month"
                  ? { $dateToString: { format: "%Y-%m", date: "$paidAt" } }
                  : { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
              revenuePaise: { $sum: "$amountPaise" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: limit },
        ]),
        PaymentTransaction.aggregate([
          { $match: { ...PREMIUM_MATCH, status: { $in: SUCCESS_STATUSES } } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              revenuePaise: { $sum: "$amountPaise" },
            },
          },
        ]),
        PaymentTransaction.find({
          ...PREMIUM_MATCH,
          status: { $in: SUCCESS_STATUSES },
        })
          .sort({ paidAt: -1 })
          .limit(50)
          .lean(),
        PaymentRefund.aggregate([
          {
            $match: {
              status: { $in: ["COMPLETED", "PROCESSING", "APPROVED"] },
            },
          },
          {
            $group: {
              _id: null,
              refundedPaise: { $sum: "$amountPaise" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const userCandidates = recent.map((t) => t.userId).filter(Boolean);
    const users = userCandidates.length
      ? await User.find({ _id: { $in: userCandidates } })
          .select("_id name email")
          .lean()
      : [];

    const total = summary[0]?.total?.[0] ?? { count: 0, grossPaise: 0 };
    const pending = summary[0]?.pending?.[0] ?? { count: 0 };
    const failed = summary[0]?.failed?.[0] ?? { count: 0, failedPaise: 0 };
    const refunds = refundResult[0] ?? { refundedPaise: 0, count: 0 };

    const gross = total.grossPaise ?? 0;
    const refunded = refunds.refundedPaise ?? 0;
    const net = Math.max(0, gross - refunded);

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    return NextResponse.json({
      admin: { _id: admin._id, name: admin.name, role: admin.role },
      generatedAt: new Date().toISOString(),
      totals: {
        successfulPayments: total.count ?? 0,
        grossRevenuePaise: gross,
        grossRevenue: paiseToRupees(gross),
        refundedPaise: refunded,
        refunded: paiseToRupees(refunded),
        refundCount: refunds.count ?? 0,
        netRevenuePaise: net,
        netRevenue: paiseToRupees(net),
        pendingPayments: pending.count ?? 0,
        failedPayments: failed.count ?? 0,
      },
      breakdown: breakdown.map((b) => ({
        key: b._id,
        revenuePaise: b.revenuePaise,
        revenue: paiseToRupees(b.revenuePaise),
        count: b.count,
      })),
      statusCounts: statusCounts.map((s) => ({
        status: s._id,
        count: s.count,
        revenuePaise: s.revenuePaise,
        revenue: paiseToRupees(s.revenuePaise),
      })),
      recentPremiumPayments: recent.map((t) => ({
        transactionId: t.transactionId,
        user: userMap.get(String(t.userId)) ?? null,
        amountPaise: t.amountPaise,
        amount: paiseToRupees(t.amountPaise),
        status: t.status,
        provider: t.provider,
        paidAt: t.paidAt || t.createdAt,
        purpose: t.purpose,
        revenueType: t.revenueType || "premium",
      })),
    });
  } catch (error) {
    console.error("[premium-revenue] error:", error);
    return NextResponse.json(
      { error: "Failed to compute premium revenue" },
      { status: 500 }
    );
  }
}
