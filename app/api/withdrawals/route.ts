import mongoose, { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import {
  getEarningsSettings,
  getOpenCycle,
  getOrCreateWallet,
  INR_CURRENCY,
  parsePayoutDetails,
  publicWithdrawal,
} from "@/app/lib/earnings";
import EarningCycle from "@/app/models/EarningCycle";
import EarningTransaction from "@/app/models/EarningTransaction";
import Withdrawal from "@/app/models/Withdrawal";

type WithdrawalRequestBody = {
  idempotencyKey?: unknown;
  payoutDetails?: unknown;
};

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const withdrawals = await Withdrawal.find({
      userId: new Types.ObjectId(session.user.id),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ withdrawals: withdrawals.map(publicWithdrawal) });
  } catch (error) {
    console.error("WITHDRAWAL LIST ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load withdrawals" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !Types.ObjectId.isValid(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WithdrawalRequestBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const idempotencyKey =
    req.headers.get("Idempotency-Key") ||
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey : "");

  if (!/^[a-zA-Z0-9._:-]{12,120}$/.test(idempotencyKey)) {
    return NextResponse.json(
      { error: "A valid idempotency key is required" },
      { status: 400 }
    );
  }

  let payout;
  try {
    payout = parsePayoutDetails(body.payoutDetails);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payout details" },
      { status: 400 }
    );
  }

  const userId = new Types.ObjectId(session.user.id);
  const dbSession = await mongoose.startSession();

  try {
    let createdOrExisting: Parameters<typeof publicWithdrawal>[0] | null = null;

    await dbSession.withTransaction(async () => {
      const existing = await Withdrawal.findOne({ idempotencyKey }).session(dbSession);
      if (existing) {
        if (existing.userId.toString() !== userId.toString()) {
          throw new Error("Idempotency key is already in use");
        }
        createdOrExisting = existing;
        return;
      }

      const activeWithdrawal = await Withdrawal.findOne({
        userId,
        status: { $in: ["PENDING", "APPROVED", "PROCESSING"] },
      }).session(dbSession);
      if (activeWithdrawal) {
        createdOrExisting = activeWithdrawal;
        return;
      }

      const settings = await getEarningsSettings(dbSession);
      if (!settings.withdrawalsEnabled || settings.maintenanceMode) {
        throw new Error("Withdrawals are currently unavailable");
      }

      const wallet = await getOrCreateWallet(userId, dbSession);
      const cycle = await getOpenCycle(userId, dbSession);
      const amountPaise = wallet.availableBalancePaise;

      if (amountPaise < settings.minimumWithdrawalPaise) {
        throw new Error("Available balance is below the minimum withdrawal amount");
      }

      if (settings.maximumWithdrawalPaise && amountPaise > settings.maximumWithdrawalPaise) {
        throw new Error("Available balance is above the maximum withdrawal amount");
      }

      if (cycle.earnedAmountPaise < amountPaise || cycle.eligibleLikes <= 0) {
        throw new Error("No payable earning cycle is available");
      }

      wallet.availableBalancePaise -= amountPaise;
      await wallet.save({ session: dbSession });

      cycle.status = "WITHDRAWAL_REQUESTED";
      cycle.cycleEnd = new Date();

      const [withdrawal] = await Withdrawal.create(
        [
          {
            userId,
            amountPaise,
            currency: INR_CURRENCY,
            status: "PENDING",
            payoutMethod: payout.method,
            payoutProvider: settings.payoutProvider,
            idempotencyKey,
            earningCycleId: cycle._id,
            eligibleLikes: cycle.eligibleLikes,
            payoutDetailsEncrypted: payout.encrypted,
            payoutDetailsMasked: payout.masked,
          },
        ],
        { session: dbSession }
      );

      cycle.withdrawalId = withdrawal._id;
      await cycle.save({ session: dbSession });

      await EarningTransaction.create(
        [
          {
            userId,
            type: "WITHDRAWAL",
            amountPaise: -amountPaise,
            currency: INR_CURRENCY,
            status: "PENDING",
            withdrawalId: withdrawal._id,
            earningCycleId: cycle._id,
            description: "Withdrawal requested",
          },
        ],
        { session: dbSession }
      );

      await EarningCycle.create(
        [{ userId, cycleStart: new Date(), status: "OPEN" }],
        { session: dbSession }
      );

      createdOrExisting = withdrawal;
    });

    if (!createdOrExisting) {
      throw new Error("Unable to create withdrawal");
    }

    return NextResponse.json({ withdrawal: publicWithdrawal(createdOrExisting) });
  } catch (error) {
    console.error("WITHDRAWAL CREATE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to request withdrawal" },
      { status: 400 }
    );
  } finally {
    await dbSession.endSession();
  }
}
