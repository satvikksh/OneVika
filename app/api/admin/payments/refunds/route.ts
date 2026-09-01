import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentRefund from "@/app/models/PaymentRefund";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import User from "@/app/models/User";
import { paiseToRupees } from "@/app/lib/earnings";
import { PaymentService } from "@/app/services/payment-service";

export const runtime = "nodejs";

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
    const status = searchParams.get("status") || "";

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const total = await PaymentRefund.countDocuments(filter);
    const refunds = await PaymentRefund.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Resolve user + transaction info
    const userIds = refunds.map((r) => r.userId).filter(Boolean) as mongoose.Types.ObjectId[];
    const txIds = refunds
      .map((r) => r.paymentTransactionId)
      .filter(Boolean) as mongoose.Types.ObjectId[];
    type RefundUser = { _id: mongoose.Types.ObjectId; name?: string; email?: string };
    type RefundTx = { _id: mongoose.Types.ObjectId; transactionId?: string; amountPaise?: number };
    const settled = await Promise.all([
      userIds.length
        ? User.find({ _id: { $in: userIds } }).select("name email").lean()
        : Promise.resolve([] as RefundUser[]),
      txIds.length
        ? PaymentTransaction.find({ _id: { $in: txIds } })
            .select("transactionId amountPaise")
            .lean()
        : Promise.resolve([] as RefundTx[]),
    ]);
    const [users, txs] = settled as [RefundUser[], RefundTx[]];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const txMap = new Map(txs.map((t) => [t._id.toString(), t]));

    const data = refunds.map((r) => {
      const u = r.userId ? userMap.get(r.userId.toString()) : null;
      const t = r.paymentTransactionId ? txMap.get(r.paymentTransactionId.toString()) : null;
      return {
        _id: r._id,
        refundId: r.refundId,
        paymentTransactionId: r.paymentTransactionId.toString(),
        transactionId: t?.transactionId || "",
        email: u?.email || "",
        name: u?.name || "",
        amount: paiseToRupees(r.amountPaise),
        amountPaise: r.amountPaise,
        currency: r.currency,
        reason: r.reason || "",
        adminNote: r.adminNote || "",
        status: r.status,
        createdAt: r.createdAt,
        processedAt: r.processedAt,
        completedAt: r.completedAt,
      };
    });

    return NextResponse.json({
      success: true,
      table: { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("ADMIN REFUNDS LIST ERROR:", error);
    return NextResponse.json({ error: "Unable to load refunds" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, refundId, reason } = body;
    if (!action || !refundId) {
      return NextResponse.json({ error: "Action and refund ID are required" }, { status: 400 });
    }

    await dbConnect();
    const adminId = admin._id || admin.id || new mongoose.Types.ObjectId();
    const adminObjectId =
      adminId instanceof mongoose.Types.ObjectId
        ? adminId
        : new mongoose.Types.ObjectId(adminId.toString());

    const refund = await PaymentRefund.findOne({ refundId }).lean();
    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    if (action === "approve") {
      if (refund.status !== "REQUESTED" && refund.status !== "UNDER_REVIEW") {
        return NextResponse.json(
          { error: "Only pending refunds can be approved" },
          { status: 400 }
        );
      }
      await PaymentService.processRefund(refundId, "APPROVED", adminObjectId, reason);
      return NextResponse.json({ success: true, status: "APPROVED" });
    }

    if (action === "reject") {
      if (refund.status === "COMPLETED" || refund.status === "REJECTED") {
        return NextResponse.json(
          { error: "Refund is already finalised" },
          { status: 400 }
        );
      }
      await PaymentService.processRefund(refundId, "REJECTED", adminObjectId, reason);
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    if (action === "complete") {
      if (refund.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Refund must be approved before completing" },
          { status: 400 }
        );
      }
      await PaymentService.completeRefund(refundId, adminObjectId);
      return NextResponse.json({ success: true, status: "COMPLETED" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("ADMIN REFUND ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process refund" },
      { status: 500 }
    );
  }
}
