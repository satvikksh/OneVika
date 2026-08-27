import crypto from "crypto";
import { NextResponse } from "next/server";

import { dbConnect } from "@/app/lib/mongodb";
import { getOrCreateWallet, INR_CURRENCY } from "@/app/lib/earnings";
import EarningCycle from "@/app/models/EarningCycle";
import EarningTransaction from "@/app/models/EarningTransaction";
import Withdrawal from "@/app/models/Withdrawal";

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function mapStatus(providerStatus: string) {
  const status = providerStatus.toLowerCase();
  if (["processed", "completed"].includes(status)) return "COMPLETED";
  if (["failed", "rejected", "cancelled"].includes(status)) return "FAILED";
  if (["reversed", "refunded"].includes(status)) return "REVERSED";
  if (["processing", "queued", "pending"].includes(status)) return "PROCESSING";
  return null;
}

export async function POST(req: Request) {
  await dbConnect();

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const payout = payload?.payload?.payout?.entity || payload?.payout || payload;
  const providerPayoutId = payout?.id;
  const nextStatus = mapStatus(String(payout?.status || ""));

  if (!providerPayoutId || !nextStatus) {
    return NextResponse.json({ received: true });
  }

  const withdrawal = await Withdrawal.findOne({ providerPayoutId });
  if (!withdrawal || withdrawal.status === nextStatus) {
    return NextResponse.json({ received: true });
  }

  const wallet = await getOrCreateWallet(withdrawal.userId);
  const cycle = await EarningCycle.findById(withdrawal.earningCycleId);
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

  if (nextStatus === "PROCESSING" && ["PENDING", "APPROVED"].includes(withdrawal.status)) {
    withdrawal.status = "PROCESSING";
    withdrawal.processedAt = withdrawal.processedAt || new Date();
    cycle.status = "PROCESSING";
  }

  if (nextStatus === "COMPLETED" && withdrawal.status !== "COMPLETED") {
    withdrawal.status = "COMPLETED";
    withdrawal.completedAt = withdrawal.completedAt || new Date();
    cycle.status = "PAID";
    wallet.totalWithdrawnPaise += withdrawal.amountPaise;
    await EarningTransaction.updateOne(
      { withdrawalId: withdrawal._id, type: "WITHDRAWAL" },
      { $set: { status: "COMPLETED", description: "Withdrawal completed by provider webhook" } }
    );
  }

  if (nextStatus === "FAILED" && !["FAILED", "REJECTED", "COMPLETED"].includes(withdrawal.status)) {
    withdrawal.status = "FAILED";
    withdrawal.failureReason = payout?.failure_reason || "Provider marked payout failed";
    cycle.status = "FAILED";
    cycle.withdrawalId = null;
    cycle.cycleEnd = null;
    wallet.availableBalancePaise += withdrawal.amountPaise;
    await EarningTransaction.updateOne(
      { withdrawalId: withdrawal._id, type: "WITHDRAWAL" },
      { $set: { status: "FAILED", description: "Withdrawal failed by provider webhook" } }
    );
  }

  if (nextStatus === "REVERSED" && withdrawal.status !== "REVERSED") {
    const refund = await EarningTransaction.findOne({
      withdrawalId: withdrawal._id,
      type: "REFUND",
    });
    if (!refund) {
      wallet.availableBalancePaise += withdrawal.amountPaise;
      if (withdrawal.status === "COMPLETED") {
        wallet.totalWithdrawnPaise = Math.max(
          0,
          wallet.totalWithdrawnPaise - withdrawal.amountPaise
        );
      }
      await EarningTransaction.create({
        userId: withdrawal.userId,
        type: "REFUND",
        amountPaise: withdrawal.amountPaise,
        currency: INR_CURRENCY,
        status: "COMPLETED",
        withdrawalId: withdrawal._id,
        earningCycleId: withdrawal.earningCycleId,
        description: "Withdrawal reversed by provider webhook",
      });
    }
    withdrawal.status = "REVERSED";
    withdrawal.failureReason = payout?.failure_reason || "Provider reversed payout";
    cycle.status = "REVERSED";
    cycle.withdrawalId = null;
    cycle.cycleEnd = null;
  }

  await wallet.save();
  await cycle.save();
  await withdrawal.save();

  return NextResponse.json({ received: true });
}
