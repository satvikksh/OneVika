import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import Order from "@/app/models/Order";
import PaymentMethod from "@/app/models/PaymentMethod";
import PremiumPlan from "@/app/models/PremiumPlan";
import User from "@/app/models/User";
import PaymentRefund from "@/app/models/PaymentRefund";
import { paiseToRupees } from "@/app/lib/earnings";
import { PaymentService } from "@/app/services/payment-service";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import { applyPremiumToUser } from "@/app/lib/premium";
import { sendPaymentEmail } from "@/app/lib/payment-email";

export const runtime = "nodejs";

const ALLOWED_SORTS = new Set([
  "createdAt",
  "createdAtAsc",
  "updatedAt",
  "amount",
  "status",
  "completedAt",
]);

const SORT_SPECS: Record<string, Record<string, 1 | -1>> = {
  createdAt: { createdAt: -1 },
  createdAtAsc: { createdAt: 1 },
  updatedAt: { updatedAt: -1 },
  amount: { amountPaise: -1 },
  status: { status: 1 },
  completedAt: { completedAt: -1 },
};

interface PaymentRow {
  _id: mongoose.Types.ObjectId;
  transactionId: string;
  orderId: string;
  userId: string;
  email: string;
  name: string;
  amount: number;
  amountPaise: number;
  currency: string;
  paymentMethodId?: string;
  paymentMethodType?: string;
  purpose: string;
  status: string;
  provider?: string | null;
  providerReference?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  planId?: string | null;
  plan?: { key: string; name?: string } | null;
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 20));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const status = searchParams.get("status") || "";
    const purpose = searchParams.get("purpose") || "";
    const paymentMethodFilter = searchParams.get("paymentMethod") || "";
    const q = searchParams.get("q") || "";
    const fromDate = searchParams.get("fromDate")
      ? new Date(searchParams.get("fromDate"))
      : undefined;
    const toDate = searchParams.get("toDate")
      ? new Date(searchParams.get("toDate"))
      : undefined;
    const amountMin = searchParams.get("amountMin");
    const amountMax = searchParams.get("amountMax");

    if (!ALLOWED_SORTS.has(sortBy)) {
      return NextResponse.json({ error: "Invalid sort option" }, { status: 400 });
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const mongooseSort: Record<string, 1 | -1> = {
      ...SORT_SPECS[sortBy],
      ...(sortBy === "amount" ? { amountPaise: sortOrder } : {}),
    };

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;

    // Payment method filter (resolve id)
    if (paymentMethodFilter) {
      const pm = await PaymentMethod.findOne({ type: paymentMethodFilter }).lean();
      if (pm) filter.paymentMethod = pm._id;
    }

    // Amount filter (paise)
    if (amountMin || amountMax) {
      filter.amountPaise = {};
      const a = filter.amountPaise as Record<string, number>;
      if (amountMin) a.$gte = Math.round(Number(amountMin) * 100);
      if (amountMax) a.$lte = Math.round(Number(amountMax) * 100);
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      const d = filter.createdAt as Record<string, Date>;
      if (fromDate) d.$gte = fromDate;
      if (toDate) d.$lte = toDate;
    }

    // Search by user email/name or transaction/order id
    if (q) {
      const qLower = q.trim();
      const userMatches = await User.find({
        $or: [
          { email: new RegExp(qLower, "i") },
          { name: new RegExp(qLower, "i") },
        ],
      })
        .select("_id")
        .lean();
      const userIds = userMatches.map((u) => u._id);
      const orderMatches = await Order.find({
        orderId: new RegExp(qLower, "i"),
      })
        .select("_id")
        .lean();
      const orderIds = orderMatches.map((o) => o._id);

      filter.$or = [
        { transactionId: new RegExp(qLower, "i") },
        { userId: { $in: userIds } },
        { orderId: { $in: orderIds } },
      ];
    }

    const total = await PaymentTransaction.countDocuments(filter);
    const transactions = await PaymentTransaction.find(filter)
      .sort(mongooseSort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("userId", "name email")
      .populate("paymentMethod", "name type")
      .lean();

    // [DEBUG] Admin payments query audit — no credentials, ids, or secrets.
    console.log("[DEBUG ADMIN PAYMENTS] total=", total, "returned=", transactions.length,
      "statusFilter=", status || "(all)", "providerFilter=", paymentMethodFilter || "(none)",
      "providerValues=", Array.from(new Set(transactions.map((t) => t.provider ?? null))),
      "statusValues=", Array.from(new Set(transactions.map((t) => t.status))));

    // Collect related order ids and refund ids
    const orderIds = transactions
      .map((t) => t.orderId)
      .filter(Boolean) as mongoose.Types.ObjectId[];
    const orders = orderIds.length
      ? await Order.find({ _id: { $in: orderIds } }).lean()
      : [];
    const orderMap = new Map(orders.map((o) => [o._id.toString(), o]));

    const refunds = await PaymentRefund.find({
      paymentTransactionId: { $in: transactions.map((t) => t._id) },
    }).lean();
    const refundMap = new Map<string, typeof refunds[0]>();
    refunds.forEach((r) => refundMap.set(r.paymentTransactionId.toString(), r));

    // Resolve the premium plan for each transaction (via planId or metadata), so
    // the admin UI can show which plan generated the payment.
    const planIds: mongoose.Types.ObjectId[] = [];
    transactions.forEach((t) => {
      if (t.planId && mongoose.Types.ObjectId.isValid(String(t.planId))) {
        planIds.push(new mongoose.Types.ObjectId(String(t.planId)));
      }
    });
    const plans = planIds.length
      ? await PremiumPlan.find({ _id: { $in: planIds } }).select("key name").lean()
      : [];
    const planById = new Map(plans.map((p) => [p._id.toString(), p]));

    const tableData: PaymentRow[] = transactions.map((t) => {
      // userId may be a populated user document, a raw ObjectId, a string, or
      // null when a user is deleted/missing. Never call .toString() on null.
      const user = t.userId
        ? (t.userId as { _id?: unknown; name?: string; email?: string } | null)
        : null;
      const pm = t.paymentMethod
        ? (t.paymentMethod as { _id?: unknown; type?: string; name?: string } | null)
        : null;
      const order = t.orderId ? orderMap.get(t.orderId.toString()) : undefined;
      const refund = t._id ? refundMap.get(t._id.toString()) : undefined;
      const meta = t.metadata as Record<string, unknown> | null | undefined;
      const metaPlanKey = typeof meta?.plan === "string" ? meta.plan : undefined;
      const metaPlanName = typeof meta?.planName === "string" ? meta.planName : undefined;
      const planDoc = t.planId ? planById.get(t.planId.toString()) : undefined;

      // Whether the populated userId resolved to an actual user document.
      const hasUserDoc = Boolean(user && user._id);

      // Safe userId string: preferred from the populated user `_id`, then the
      // raw ObjectId/string, else empty string. Never null/undefined.
      const userId = user && user._id
        ? String(user._id)
        : t.userId
          ? String(t.userId)
          : "";
      const email = hasUserDoc && user ? user.email || "" : "";
      const name =
        hasUserDoc && user ? user.name || "" : userId ? "Unknown user" : "";

      // paymentMethod may be a populated object (with `_id`) or a raw
      // ObjectId/string; prefer the populated `_id`, then the raw value.
      const paymentMethodId =
        pm && pm._id
          ? String(pm._id)
          : t.paymentMethod
            ? String(t.paymentMethod)
            : undefined;

      return {
        _id: t._id,
        transactionId: t.transactionId,
        orderId: order?.orderId || (t.orderId ? t.orderId.toString() : ""),
        userId,
        email,
        name,
        amount: paiseToRupees(t.amountPaise),
        amountPaise: t.amountPaise,
        currency: t.currency,
        paymentMethodId,
        paymentMethodType: pm?.type || null,
        purpose: t.purpose,
        status: t.status,
        provider: t.provider || null,
        planId: t.planId ? t.planId.toString() : null,
        plan: {
          key: planDoc?.key || metaPlanKey || "premium",
          name: planDoc?.name || metaPlanName || (planDoc?.key as string) || metaPlanKey || "Premium",
        },
        providerReference: t.providerReference,
        providerOrderId: t.providerOrderId,
        providerPaymentId: t.providerPaymentId,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        failedAt: t.failedAt,
        refund: refund
          ? {
              refundId: refund.refundId,
              status: refund.status,
              amount: paiseToRupees(refund.amountPaise),
            }
          : null,
      };
    });

    // Overview stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalVolumeAgg, successCount, pendingCount, failedCount, refundAgg, premiumCompleted] =
      await Promise.all([
        PaymentTransaction.aggregate([
          { $match: { status: "COMPLETED" } },
          { $group: { _id: null, total: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
        ]),
        PaymentTransaction.countDocuments({ status: "COMPLETED" }),
        PaymentTransaction.countDocuments({
          status: { $in: ["INITIATED", "PENDING", "PROCESSING", "VERIFICATION_REQUIRED"] },
        }),
        PaymentTransaction.countDocuments({ status: "FAILED" }),
        PaymentTransaction.aggregate([
          { $match: { status: "COMPLETED", createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: "$amountPaise" } } },
        ]),
        PaymentTransaction.countDocuments({
          status: "COMPLETED",
          purpose: "membership",
        }),
      ]);

    const totalVolume = totalVolumeAgg.length ? totalVolumeAgg[0].total : 0;
    const premiumRevenue30d = refundAgg.length ? refundAgg[0].total : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalVolume: paiseToRupees(totalVolume),
        totalVolumePaise: totalVolume,
        successfulPayments: successCount,
        pendingPayments: pendingCount,
        failedPayments: failedCount,
        premiumRevenue30d: paiseToRupees(premiumRevenue30d),
        premiumPurchases: premiumCompleted,
        activePremiumMembers: await User.countDocuments({
          isPremium: true,
          $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: now } }],
        }),
      },
      table: {
        data: tableData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        status,
        purpose,
        paymentMethod: paymentMethodFilter,
        q,
        fromDate: fromDate ? fromDate.toISOString().split("T")[0] : "",
        toDate: toDate ? toDate.toISOString().split("T")[0] : "",
        amountMin: amountMin || "",
        amountMax: amountMax || "",
      },
    });
  } catch (error) {
    console.error("ADMIN PAYMENTS LIST ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load payment data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payments - Admin payment actions
 * Supported: manual verify a payment transaction
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, transactionId, reason } = body;

    if (!action || !transactionId) {
      return NextResponse.json(
        { error: "Action and transaction ID are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const adminId = admin._id || admin.id || new mongoose.Types.ObjectId();

    const transaction = await PaymentTransaction.findById(transactionId).lean();
    if (!transaction) {
      return NextResponse.json({ error: "Payment transaction not found" }, { status: 404 });
    }

    // Do not allow editing completed/finalized financial transactions
    if (transaction.status === "COMPLETED" || transaction.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Finalized transactions cannot be modified" },
        { status: 400 }
      );
    }

    if (action === "verify") {
      // Admin manually verifies a payment - atomically complete it
      const updated = await PaymentTransaction.findOneAndUpdate(
        {
          _id: transaction._id,
          status: { $in: ["INITIATED", "PENDING", "PROCESSING", "VERIFICATION_REQUIRED"] },
        },
        { status: "COMPLETED", completedAt: new Date() },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          { error: "Payment is not in a verifiable state" },
          { status: 400 }
        );
      }

      // Mark order paid
      if (updated.orderId) {
        await PaymentService.markOrderPaid(updated.orderId);
      }

      // Only credit a user wallet for genuine wallet top-ups (purpose wallet_credit).
      // Premium/membership payments are PLATFORM revenue and must NOT credit any
      // user wallet or earnings account.
      if (updated.purpose === "wallet_credit") {
        await PaymentService.creditWallet(
          updated.userId,
          updated.amountPaise,
          "ADMIN_PAYMENT_VERIFIED"
        );
      } else if (updated.purpose === "membership") {
        await PaymentTransaction.updateOne(
          { _id: updated._id },
          { $set: { revenueType: "premium" } }
        );
      }

      // Activate premium if membership purpose
      if (updated.purpose === "membership") {
        const user = await User.findById(updated.userId);
        if (user) {
          await applyPremiumToUser(user, {
            provider: "orbitbyte",
            paymentIntentId: updated.transactionId,
            checkoutSessionId: null,
            paymentMethod: { type: updated.providerReference || "orbitbyte" },
          });
          await user.save();
        }
      }

      // Audit log
      await AdminAuditLog.create({
        adminId,
        userId: updated.userId,
        transactionId: updated.transactionId,
        action: "PAYMENT_MANUALLY_VERIFIED",
        reason: reason || "admin_manual",
        previousStatus: transaction.status,
        newStatus: "COMPLETED",
        description: `Admin manually verified payment ${updated.transactionId}`,
      });

      return NextResponse.json({
        success: true,
        transaction: {
          transactionId: updated.transactionId,
          status: updated.status,
          completedAt: updated.completedAt,
        },
      });
    }

    if (action === "fail") {
      const updated = await PaymentTransaction.findOneAndUpdate(
        {
          _id: transaction._id,
          status: { $in: ["INITIATED", "PENDING", "PROCESSING", "VERIFICATION_REQUIRED"] },
        },
        { status: "FAILED", failedAt: new Date() },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json(
          { error: "Payment is not in a modifiable state" },
          { status: 400 }
        );
      }
      if (updated.orderId) {
        await PaymentService.markOrderFailed(updated.orderId);
      }
      await AdminAuditLog.create({
        adminId,
        userId: updated.userId,
        transactionId: updated.transactionId,
        action: "PAYMENT_MARKED_FAILED",
        reason: reason || "admin_manual",
        previousStatus: transaction.status,
        newStatus: "FAILED",
        description: `Admin marked payment ${updated.transactionId} as failed`,
      });
      const failedUser = updated.userId ? await User.findById(updated.userId).select("email name").lean() : null;
      void sendPaymentEmail({
        email: failedUser?.email,
        name: failedUser?.name,
        type: "payment_failure",
        amountPaise: updated.amountPaise,
        transactionId: updated.transactionId,
        orderId: updated.orderId?.toString(),
        reason: reason || "admin_manual",
      });
      return NextResponse.json({
        success: true,
        transaction: { transactionId: updated.transactionId, status: updated.status },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("ADMIN PAYMENTS ACTION ERROR:", error);
    return NextResponse.json(
      { error: "Failed to process payment action" },
      { status: 500 }
    );
  }
}
