import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import CreatorEarningTransaction from "@/app/models/CreatorEarningTransaction";
import EarningTransaction from "@/app/models/EarningTransaction";
import User from "@/app/models/User";
import Wallet from "@/app/models/Wallet";
import Withdrawal from "@/app/models/Withdrawal";

function idOf(value: unknown) {
  return (value as { toString?: () => string })?.toString?.() ?? String(value);
}

function isoDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

const HOLD_STATUSES = ["PENDING", "APPROVED", "PROCESSING"];

type WalletRow = {
  id: string;
  userId: string;
  creatorName: string;
  creatorEmail: string;
  availablePaise: number;
  earnedPaise: number;
  withdrawnPaise: number;
  updatedAt: string | null;
};

type LedgerRow = {
  id: string;
  scope: "like" | "creator";
  type: string;
  status: string;
  amountPaise: number;
  description: string;
  creatorId: string;
  creatorName: string;
  createdAt: string | null;
};

export async function GET(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));

    // Step 1: determine which users have legitimate creator earnings.
    // Premium payments must never count as creator earnings, so only users
    // with COMPLETED EarningTransactions are treated as creators.
    const earningCreatorIdsRaw: unknown[] = await EarningTransaction.distinct("userId", {
      type: "EARNING",
      status: "COMPLETED",
    });
    const earningCreatorIds = earningCreatorIdsRaw.map(String);

    // Step 2: aggregate platform-wide totals (from EarningTransaction /
    // CreatorEarningTransaction, not wallet balances — these are correct
    // platform-level totals regardless of per-wallet filtering).
    const [
      legacyEarnings,
      creatorReleases,
      completedWithdrawn,
      held,
      refundedLegacy,
      refundedCreator,
      legacyTxns,
      creatorTxns,
    ] = await Promise.all([
      EarningTransaction.aggregate<{ total: number }>([
        { $match: { type: "EARNING", status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      CreatorEarningTransaction.aggregate<{ total: number }>([
        { $match: { type: "RELEASE", status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      Withdrawal.aggregate<{ total: number }>([
        { $match: { status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      Withdrawal.aggregate<{ total: number }>([
        { $match: { status: { $in: HOLD_STATUSES } } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      EarningTransaction.aggregate<{ total: number }>([
        { $match: { type: "REFUND", status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      CreatorEarningTransaction.aggregate<{ total: number }>([
        { $match: { type: "REFUND", status: "COMPLETED" } },
        { $group: { _id: null, total: { $sum: "$amountPaise" } } },
      ]),
      EarningTransaction.find({}).sort({ createdAt: -1 }).limit(40).lean(),
      CreatorEarningTransaction.find({}).sort({ createdAt: -1 }).limit(40).lean(),
    ]);

    // Step 3: search — intersect with creator wallets.
    let users: { _id: Types.ObjectId; name: string; email: string }[] = [];
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      users = await User.find({ $or: [{ name: regex }, { email: regex }], isAI: { $ne: true } })
        .select("name email")
        .lean();
    }
    const searchUserIds = q ? users.map((user) => idOf(user._id)) : null;
    const creatorUserIds = searchUserIds
      ? earningCreatorIds.filter((id) => searchUserIds.includes(id))
      : earningCreatorIds;

    // Step 4: only return wallets belonging to users with legitimate creator
    // earnings. Premium payment wallets (including orbitbyte@gmail.com) are
    // excluded by this filter since they have no creator earning transactions.
    const creatorWalletFilter = { userId: { $in: creatorUserIds.map((id) => new Types.ObjectId(id)) } };
    const total = await Wallet.countDocuments(creatorWalletFilter);
    const wallets = await Wallet.find(creatorWalletFilter)
      .sort({ availableBalancePaise: -1, totalEarnedPaise: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userMap = new Map<string, { name: string; email: string }>();
    const loadUserIds = new Set<string>();
    for (const wallet of wallets) loadUserIds.add(idOf(wallet.userId));
    for (const txn of legacyTxns) loadUserIds.add(idOf(txn.userId));
    for (const txn of creatorTxns) loadUserIds.add(idOf(txn.creatorId));
    for (const user of users) {
      userMap.set(idOf(user._id), { name: user.name, email: user.email });
    }
    const missingIds = [...loadUserIds].filter((idValue) => !userMap.has(idValue) && Types.ObjectId.isValid(idValue));
    if (missingIds.length > 0) {
      const missingUsers = await User.find({ _id: { $in: missingIds } })
        .select("name email")
        .lean();
      for (const user of missingUsers) {
        userMap.set(idOf(user._id), { name: user.name, email: user.email });
      }
    }

    const walletRowsOut: WalletRow[] = wallets.map((wallet) => {
      const creator = userMap.get(idOf(wallet.userId)) ?? { name: "", email: "" };
      return {
        id: idOf(wallet._id),
        userId: idOf(wallet.userId),
        creatorName: creator.name || "Unknown creator",
        creatorEmail: creator.email || "—",
        availablePaise: wallet.availableBalancePaise,
        earnedPaise: wallet.totalEarnedPaise,
        withdrawnPaise: wallet.totalWithdrawnPaise,
        updatedAt: isoDate(wallet.updatedAt),
      };
    });

    const mergedTxns: Array<{ txn: LedgerRow }> = [
      ...legacyTxns.map((txn) => ({
        txn: {
          id: idOf(txn._id),
          scope: "like" as const,
          type: txn.type,
          status: txn.status,
          amountPaise: txn.amountPaise,
          description: txn.description || "",
          creatorId: idOf(txn.userId),
          creatorName: userMap.get(idOf(txn.userId))?.name ?? "Unknown creator",
          createdAt: isoDate(txn.createdAt),
        },
      })),
      ...creatorTxns.map((txn) => ({
        txn: {
          id: idOf(txn._id),
          scope: "creator" as const,
          type: txn.type,
          status: txn.status,
          amountPaise: txn.amountPaise,
          description: txn.description || "",
          creatorId: idOf(txn.creatorId),
          creatorName: userMap.get(idOf(txn.creatorId))?.name ?? "Unknown creator",
          createdAt: isoDate(txn.createdAt),
        },
      })),
    ];
    mergedTxns.sort((a, b) => {
      const ta = a.txn.createdAt ? new Date(a.txn.createdAt).getTime() : 0;
      const tb = b.txn.createdAt ? new Date(b.txn.createdAt).getTime() : 0;
      return tb - ta;
    });
    const ledger: LedgerRow[] = mergedTxns.slice(0, 30).map((row) => row.txn);

    // Compute creator-only wallet totals (filtered legacyWallets exclude
    // Premium payment wallets, non-creator wallets, and orphan wallets).
    const creatorWallets = await Wallet.find({ userId: { $in: earningCreatorIds.map((id) => new Types.ObjectId(id)) } }).lean();
    const totalEarningsPaise =
      (legacyEarnings[0]?.total || 0) + (creatorReleases[0]?.total || 0);
    const summary = {
      totalEarningsPaise,
      totalWithdrawnPaise: completedWithdrawn[0]?.total || 0,
      totalAvailablePaise: creatorWallets.reduce((sum, wallet) => sum + (wallet.availableBalancePaise || 0), 0),
      totalHeldPaise: held[0]?.total || 0,
      totalRefundedPaise: (refundedLegacy[0]?.total || 0) + (refundedCreator[0]?.total || 0),
      walletsWithBalance: creatorWallets.filter((wallet) => (wallet.availableBalancePaise || 0) > 0).length,
      earningCreators: earningCreatorIds.length,
      totalWallets: creatorWallets.length,
      pendingWithdrawals: await Withdrawal.countDocuments({ status: "PENDING" }),
    };

    return NextResponse.json({
      currency: "INR",
      summary,
      wallets: walletRowsOut,
      walletsTotal: total,
      ledger,
      pagination: { page, limit, total },
    });
  } catch (error) {
    console.error("ADMIN WALLET ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load wallet overview" },
      { status: 500 }
    );
  }
}