import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import Order from "@/app/models/Order";
import PaymentRefund from "@/app/models/PaymentRefund";
import User from "@/app/models/User";
import { paiseToRupees } from "@/app/lib/earnings";

export const runtime = "nodejs";

function idOf(value: unknown) {
  return (value as { toString?: () => string })?.toString?.() ?? String(value);
}

interface ReconciliationIssue {
  type: string;
  severity: "high" | "medium" | "low";
  userId?: string;
  email?: string;
  name?: string;
  orderId?: string;
  transactionId?: string;
  message: string;
  count?: number;
  amount?: number;
  transactionIds?: string[];
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const issues: ReconciliationIssue[] = [];
    const LIMIT = 50;

    // --- 1. Order PAID but linked transaction not COMPLETED ---
    const paidOrders = await Order.find({ status: "PAID" })
      .select("orderId paymentTransactionId status userId")
      .limit(LIMIT)
      .lean();
    const paidOrderIds = paidOrders
      .map((o) => o.paymentTransactionId?.toString())
      .filter(Boolean);
    const paidTxDocs = paidOrderIds.length
      ? await PaymentTransaction.find({ _id: { $in: paidOrderIds } })
          .select("status transactionId")
          .lean()
      : [];
    const paidTxMap = new Map(paidTxDocs.map((t) => [idOf(t._id), t]));
    for (const order of paidOrders) {
      const tx = order.paymentTransactionId
        ? paidTxMap.get(order.paymentTransactionId.toString())
        : null;
      if (!tx || tx.status !== "COMPLETED") {
        issues.push({
          type: "ORDER_PAID_TX_NOT_COMPLETED",
          severity: "high",
          orderId: order.orderId,
          transactionId: tx?.transactionId || order.paymentTransactionId?.toString() || "missing",
          message: `Order marked PAID but linked payment is ${tx?.status || "missing"}`,
        });
      }
    }

    // --- 2. Payment COMPLETED (membership) but Order not PAID ---
    const completedMembership = await PaymentTransaction.find({
      status: "COMPLETED",
      purpose: "membership",
    })
      .select("transactionId orderId status userId")
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();
    const cmOrderIds = completedMembership.map((t) => t.orderId?.toString()).filter(Boolean);
    const cmOrders = cmOrderIds.length
      ? await Order.find({ _id: { $in: cmOrderIds } }).select("status orderId").lean()
      : [];
    const cmOrderMap = new Map(cmOrders.map((o) => [idOf(o._id), o]));
    for (const tx of completedMembership) {
      const order = tx.orderId ? cmOrderMap.get(tx.orderId.toString()) : null;
      if (order && order.status !== "PAID") {
        issues.push({
          type: "TX_COMPLETED_ORDER_NOT_PAID",
          severity: "medium",
          transactionId: tx.transactionId,
          orderId: order.orderId,
          message: `Payment COMPLETED but linked order is ${order.status}`,
        });
      }
    }

    // --- 3. Active membership without a confirmed payment ---
    const activeUsers = await User.find({
      isPremium: true,
      $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
    })
      .select("name email premiumExpiresAt")
      .limit(LIMIT)
      .lean();
    const activeUserIds = activeUsers.map((u) => idOf(u._id));
    const paidUserAgg = await PaymentTransaction.aggregate([
      { $match: { userId: { $in: activeUserIds }, status: "COMPLETED", purpose: "membership" } },
      { $group: { _id: "$userId" } },
    ]);
    const paidUserSet = new Set(paidUserAgg.map((r) => idOf(r._id)));
    for (const user of activeUsers) {
      if (!paidUserSet.has(idOf(user._id))) {
        issues.push({
          type: "ACTIVE_NO_PAYMENT",
          severity: "high",
          userId: idOf(user._id),
          email: user.email,
          name: user.name,
          message: "Premium member active with no COMPLETED membership payment on record",
        });
      }
    }

    // --- 4. Duplicate completed membership payments per user (potential double activation) ---
    const dupAgg = await PaymentTransaction.aggregate([
      { $match: { status: "COMPLETED", purpose: "membership" } },
      { $group: { _id: "$userId", count: { $sum: 1 }, ids: { $push: "$transactionId" } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: LIMIT },
    ]);
    for (const row of dupAgg) {
      const user = row._id
        ? await User.findById(row._id).select("email name").lean()
        : null;
      issues.push({
        type: "DUPLICATE_PAYMENTS",
        severity: "medium",
        userId: idOf(row._id),
        email: user?.email || "",
        name: user?.name || "",
        count: row.count,
        transactionIds: row.ids,
        message: `${row.count} COMPLETED membership payments recorded for this user`,
      });
    }

    // --- 5. Refund COMPLETED but membership still active ---
    const completedRefunds = await PaymentRefund.find({ status: "COMPLETED" })
      .select("paymentTransactionId amountPaise userId")
      .limit(LIMIT)
      .lean();
    const crTxIds = completedRefunds
      .map((r) => r.paymentTransactionId?.toString())
      .filter(Boolean);
    const crTxs = crTxIds.length
      ? await PaymentTransaction.find({ _id: { $in: crTxIds } })
          .select("userId status purpose")
          .lean()
      : [];
    const crTxMap = new Map(crTxs.map((t) => [idOf(t._id), t]));
    for (const refund of completedRefunds) {
      const tx = refund.paymentTransactionId
        ? crTxMap.get(refund.paymentTransactionId.toString())
        : null;
      if (!tx) continue;
      const user = await User.findById(tx.userId).select("isPremium premiumExpiresAt email").lean();
      const now = new Date();
      if (
        user?.isPremium &&
        (!user.premiumExpiresAt || user.premiumExpiresAt > now)
      ) {
        issues.push({
          type: "REFUNDED_BUT_ACTIVE",
          severity: "high",
          userId: idOf(tx.userId),
          email: user.email || "",
          amount: paiseToRupees(refund.amountPaise),
          message: "Refund COMPLETED but the associated membership is still active",
        });
      }
    }

    const byType = issues.reduce((acc: Record<string, number>, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      total: issues.length,
      byType,
      issues: issues.slice(0, LIMIT),
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RECONCILIATION ERROR:", error);
    return NextResponse.json({ error: "Unable to run reconciliation" }, { status: 500 });
  }
}
