import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentRefund from "@/app/models/PaymentRefund";
import User from "@/app/models/User";
import { paiseToRupees } from "@/app/lib/earnings";

export const runtime = "nodejs";

const RANGES: Record<string, { days: number; label: string; granularity: "day" | "month" }> = {
  "7d": { days: 7, label: "7 Days", granularity: "day" },
  "30d": { days: 30, label: "30 Days", granularity: "day" },
  "3m": { days: 92, label: "3 Months", granularity: "month" },
  "1y": { days: 366, label: "1 Year", granularity: "month" },
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcKey(date: Date, granularity: "day" | "month") {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  if (granularity === "month") return `${year}-${month}`;
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const rangeKey = searchParams.get("range") || "30d";
    const range = RANGES[rangeKey] || RANGES["30d"];

    const now = new Date();
    const from = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);

    // Pivot completed membership payments -> { key, revenuePaise, count }
    const membershipAgg = await PaymentTransaction.aggregate([
      {
        $match: {
          status: "COMPLETED",
          purpose: "membership",
          createdAt: { $gte: from },
        },
      },
      {
        $group: {
          _id: {
            y: { $year: { date: "$createdAt", timezone: "UTC" } },
            m: { $month: { date: "$createdAt", timezone: "UTC" } },
            d: { $dayOfMonth: { date: "$createdAt", timezone: "UTC" } },
          },
          revenuePaise: { $sum: "$amountPaise" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Total payments by status over time (success vs failed)
    const statusAgg = await PaymentTransaction.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            y: { $year: { date: "$createdAt", timezone: "UTC" } },
            m: { $month: { date: "$createdAt", timezone: "UTC" } },
            d: { $dayOfMonth: { date: "$createdAt", timezone: "UTC" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Refunds by status over time
    const refundAgg = await PaymentRefund.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            y: { $year: { date: "$createdAt", timezone: "UTC" } },
            m: { $month: { date: "$createdAt", timezone: "UTC" } },
            d: { $dayOfMonth: { date: "$createdAt", timezone: "UTC" } },
            status: "$status",
          },
          count: { $sum: 1 },
          amountPaise: { $sum: "$amountPaise" },
        },
      },
    ]);

    // Build time buckets
    const keys: string[] = [];
    if (range.granularity === "day") {
      const cursor = startOfUtcDay(from);
      let i = 0;
      while (i < range.days) {
        keys.push(utcKey(cursor, "day"));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        i++;
      }
    } else {
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const endKey = utcKey(now, "month");
      while (utcKey(cursor, "month") <= endKey) {
        keys.push(utcKey(cursor, "month"));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    const dateFromParts = (parts: { y: number; m: number; d: number }) => {
      const iso = `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
      return range.granularity === "month" ? iso.slice(0, 7) : iso;
    };

    const revenueByKey = new Map<string, { revenuePaise: number; count: number }>();
    membershipAgg.forEach((row) => {
      const key = dateFromParts(row._id);
      revenueByKey.set(key, {
        revenuePaise: (revenueByKey.get(key)?.revenuePaise || 0) + row.revenuePaise,
        count: (revenueByKey.get(key)?.count || 0) + row.count,
      });
    });

    const statusByKey = new Map<string, Record<string, number>>();
    statusAgg.forEach((row) => {
      const key = dateFromParts(row._id);
      if (!statusByKey.has(key)) statusByKey.set(key, {});
      const bucket = statusByKey.get(key)!;
      bucket[row._id.status] = (bucket[row._id.status] || 0) + row.count;
    });

    const refundByKey = new Map<string, { count: number; amountPaise: number }>();
    refundAgg.forEach((row) => {
      const key = dateFromParts(row._id);
      refundByKey.set(key, {
        count: (refundByKey.get(key)?.count || 0) + row.count,
        amountPaise: (refundByKey.get(key)?.amountPaise || 0) + row.amountPaise,
      });
    });

    const revenueSeries = keys.map((k) => revenueByKey.get(k)?.revenuePaise || 0);
    const purchaseSeries = keys.map((k) => revenueByKey.get(k)?.count || 0);
    const successSeries = keys.map((k) => statusByKey.get(k)?.COMPLETED || 0);
    const failedSeries = keys.map((k) =>
      (statusByKey.get(k)?.FAILED || 0) + (statusByKey.get(k)?.CANCELLED || 0)
    );
    const refundSeries = keys.map((k) => refundByKey.get(k)?.count || 0);
    const refundAmountSeries = keys.map((k) => refundByKey.get(k)?.amountPaise || 0);

    // Totals / summary
    const nowObj = new Date();
    const [totalCompleted, totalFailed, totalRefunded, activeMembers, expiredMembers, totalMembers, cancelled] =
      await Promise.all([
        PaymentTransaction.countDocuments({ status: "COMPLETED" }),
        PaymentTransaction.countDocuments({ status: "FAILED" }),
        PaymentTransaction.countDocuments({ status: "REFUNDED" }),
        User.countDocuments({
          isPremium: true,
          $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: nowObj } }],
        }),
        User.countDocuments({
          isPremium: true,
          premiumExpiresAt: { $lte: nowObj },
        }),
        User.countDocuments({ isPremium: true }),
        PaymentTransaction.countDocuments({ status: "CANCELLED" }),
      ]);

    return NextResponse.json({
      success: true,
      range: { key: rangeKey, label: range.label, granularity: range.granularity },
      labels: keys,
      series: {
        premiumRevenue: revenueSeries.map((p) => paiseToRupees(p)),
        premiumRevenuePaise: revenueSeries,
        purchases: purchaseSeries,
        successful: successSeries,
        failed: failedSeries,
        refunds: refundSeries,
        refundAmount: refundAmountSeries.map((p) => paiseToRupees(p)),
      },
      summary: {
        totalCompleted,
        totalFailed,
        totalRefunded,
        cancelled,
        activeMembers,
        expiredMembers,
        totalMembers,
      },
    });
  } catch (error) {
    console.error("PAYMENT ANALYTICS ERROR:", error);
    return NextResponse.json({ error: "Unable to load payment analytics" }, { status: 500 });
  }
}
