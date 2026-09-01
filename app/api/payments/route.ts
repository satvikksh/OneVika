import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import mongoose from "mongoose";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import PaymentMethod from "@/app/models/PaymentMethod";
import { IPaymentTransaction } from "@/app/models/PaymentTransaction";
import { paiseToRupees } from "@/app/lib/earnings";

export const runtime = "nodejs";

/**
 * POST /api/payments - Create a new payment transaction
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const { amount, currency, paymentMethod, purpose, orderId, metadata } = body;

    // Validate required fields
    if (!amount || !paymentMethod || !purpose) {
      return NextResponse.json(
        { error: "Missing required fields: amount, paymentMethod, purpose" },
        { status: 400 }
      );
    }

    const amountPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Get or create payment method
    let paymentMethodObj = await PaymentMethod.findById(paymentMethod);
    if (!paymentMethodObj) {
      paymentMethodObj = await PaymentMethod.create({
        name: String(paymentMethod),
        type: "manual",
        currency: currency || "INR",
        status: "active",
      });
    }

    // Create payment transaction with duplicate transactionId handling
    let transactionId = `orb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    let transaction;
    let createAttempts = 0;
    const maxAttempts = 5;

    while (createAttempts < maxAttempts) {
      try {
        transaction = await PaymentTransaction.create({
          transactionId,
          userId: session.user.id,
          orderId:
            orderId !== undefined && mongoose.Types.ObjectId.isValid(orderId)
              ? new mongoose.Types.ObjectId(orderId)
              : undefined,
          amountPaise,
          currency: currency || "INR",
          paymentMethod: paymentMethodObj._id,
          status: "INITIATED",
          purpose: purpose || "other",
          metadata: metadata || {},
        });
        break;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          createAttempts++;
          transactionId = `orb_${Date.now() + createAttempts}_${Math.random().toString(36).slice(2, 9)}`;
          continue;
        }
        throw error;
      }
    }

    if (createAttempts >= maxAttempts) {
      throw new Error("Unable to generate unique transaction ID after maximum retries");
    }

    return NextResponse.json({
      transactionId: transaction.transactionId,
      amount: paiseToRupees(transaction.amountPaise),
      amountPaise: transaction.amountPaise,
      currency: transaction.currency,
      status: transaction.status,
      purpose: transaction.purpose,
      createdAt: transaction.createdAt,
    });
  } catch (error) {
    console.error("CREATE PAYMENT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments - Get current user's payment history
 * Supports ?status=, ?purpose=, ?limit=, ?skip=, ?page=
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as string | null;
    const purpose = searchParams.get("purpose") as string | null;
    const limit = Number(searchParams.get("limit") || 20);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const skip = (page - 1) * limit;

    // Build filter without using 'any'
    const filter: {
      userId: string;
      status?: string;
      purpose?: string;
    } = { userId: session.user.id };
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;

    const transactions = await PaymentTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .skip(skip);
    const total = await PaymentTransaction.countDocuments(filter);

    // Pre-fetch payment method types
    const paymentMethodIds = transactions
      .map((t) => t.paymentMethod)
      .filter(Boolean) as mongoose.Types.ObjectId[];
    const pmMap: Record<string, string> = {};
    if (paymentMethodIds.length > 0) {
      const pms = await PaymentMethod.find({ _id: { $in: paymentMethodIds } }).lean();
      pms.forEach((pm) => {
        pmMap[pm._id.toString()] = pm.type;
      });
    }

    return NextResponse.json({
      transactions: transactions.map((t: IPaymentTransaction) => ({
        transactionId: t.transactionId,
        orderId: t.orderId ? t.orderId.toString() : null,
        amount: paiseToRupees(t.amountPaise),
        amountPaise: t.amountPaise,
        currency: t.currency,
        status: t.status,
        purpose: t.purpose,
        paymentMethod: t.paymentMethod ? pmMap[t.paymentMethod.toString()] : null,
        providerReference: t.providerReference,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        failedAt: t.failedAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET USER PAYMENTS ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
