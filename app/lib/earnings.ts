import crypto from "crypto";
import mongoose, { ClientSession, Types } from "mongoose";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/authOptions";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import CreatorRevenueAllocation from "@/app/models/CreatorRevenueAllocation";
import CreatorEarningTransaction from "@/app/models/CreatorEarningTransaction";
import EarningCycle from "@/app/models/EarningCycle";
import EarningTransaction from "@/app/models/EarningTransaction";
import PlatformSettings from "@/app/models/PlatformSettings";
import type { PayoutProvider } from "@/app/models/PlatformSettings";
import User from "@/app/models/User";
import Wallet, { IWallet } from "@/app/models/Wallet";
import Withdrawal, { PayoutMethodType, WithdrawalStatus } from "@/app/models/Withdrawal";

export const INR_CURRENCY = "INR" as const;

type SerializableDate = Date | { toISOString?: () => string } | null | undefined;

type PublicWithdrawalSource = {
  _id: Types.ObjectId | { toString: () => string };
  amountPaise: number;
  currency: string;
  status: string;
  payoutMethod: string;
  payoutDetailsMasked: string;
  providerPayoutId?: string | null;
  eligibleLikes: number;
  failureReason?: string;
  adminNote?: string;
  createdAt?: SerializableDate;
  processedAt?: SerializableDate;
  completedAt?: SerializableDate;
};

export function paiseToRupees(paise: number) {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100);
}

// The only supported payout providers. `razorpayx` must never be used.
function normalizePayoutProvider(value: unknown): PayoutProvider {
  return value === "cashfree" ? "cashfree" : "manual";
}

export async function getEarningsSettings(session?: ClientSession | null) {
  const existing = await PlatformSettings.findOne({ key: "earnings" }).session(
    session ?? null
  );

  if (existing) {
    // Safe migration: if a legacy/unsupported payout provider (e.g.
    // "razorpayx") is stored, migrate it to "manual". This keeps the document
    // valid under the ["manual", "cashfree"] enum so save() never throws.
    const normalized = normalizePayoutProvider(existing.payoutProvider as unknown);
    if (normalized !== existing.payoutProvider) {
      existing.payoutProvider = normalized;
      await existing.save({ session: session ?? undefined });
    }
    return existing;
  }

  const [created] = await PlatformSettings.create(
    [
      {
        key: "earnings",
        likeRatePaise: 5,
        minimumWithdrawalPaise: 10000,
        withdrawalsEnabled: true,
        payoutProvider: "manual",
        maintenanceMode: false,
      },
    ],
    { session: session ?? undefined }
  );

  return created;
}

export async function getOrCreateWallet(
  userId: Types.ObjectId,
  session?: ClientSession | null
) {
  const wallet = await Wallet.findOne({ userId }).session(session ?? null);
  if (wallet) return wallet;

  const created = await Wallet.create(
    [{ userId, availableBalancePaise: 0, totalCreditsPaise: 0, totalDebitsPaise: 0 }],
    { session: session ?? undefined }
  );
  return (created as IWallet[])?.[0] || wallet;
}

export async function getOpenCycle(
  userId: Types.ObjectId,
  session?: ClientSession | null
) {
  const cycle = await EarningCycle.findOne({ userId, status: "OPEN" }).session(
    session ?? null
  );
  if (cycle) return cycle;

  const [created] = await EarningCycle.create(
    [{ userId, cycleStart: new Date(), status: "OPEN" }],
    { session: session ?? undefined }
  );
  return created;
}

export function buildLikeId(contentId: Types.ObjectId | string, likerId: Types.ObjectId | string) {
  return `post:${contentId.toString()}:like:${likerId.toString()}`;
}

export async function creditLikeEarning({
  creatorId,
  likerId,
  contentId,
}: {
  creatorId: Types.ObjectId;
  likerId: Types.ObjectId;
  contentId: Types.ObjectId;
}) {
  if (creatorId.equals(likerId)) {
    return { credited: false, reason: "SELF_LIKE" };
  }

  const likeId = buildLikeId(contentId, likerId);
  const dbSession = await mongoose.startSession();

  try {
    let credited = false;
    await dbSession.withTransaction(async () => {
      const settings = await getEarningsSettings(dbSession);
      const wallet = await getOrCreateWallet(creatorId, dbSession);
      const cycle = await getOpenCycle(creatorId, dbSession);

      const result = await EarningTransaction.updateOne(
        { likeId },
        {
          $setOnInsert: {
            userId: creatorId,
            type: "EARNING",
            amountPaise: settings.likeRatePaise,
            currency: INR_CURRENCY,
            status: "COMPLETED",
            likeId,
            contentId,
            earningCycleId: cycle._id,
            description: "Eligible like earning",
          },
        },
        { upsert: true, session: dbSession }
      );

      if (result.upsertedCount !== 1) return;

      wallet.availableBalancePaise += settings.likeRatePaise;
      wallet.totalCreditsPaise += settings.likeRatePaise;
      await wallet.save({ session: dbSession });

      cycle.eligibleLikes += 1;
      cycle.earnedAmountPaise += settings.likeRatePaise;
      await cycle.save({ session: dbSession });

      credited = true;
    });

    return { credited, reason: credited ? "CREDITED" : "ALREADY_CREDITED" };
  } finally {
    await dbSession.endSession();
  }
}

export function maskUpi(vpa: string) {
  const [name, domain] = vpa.split("@");
  if (!name || !domain) return "UPI: ***";
  const visible = name.slice(0, 3);
  return `UPI: ${visible}${"*".repeat(Math.max(name.length - 3, 3))}@${domain}`;
}

export function maskBank(accountNumber: string) {
  const last4 = accountNumber.replace(/\D/g, "").slice(-4);
  return `Bank: **** **** ${last4 || "****"}`;
}

function encryptionKey() {
  const secret =
    process.env.PAYOUT_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "development-only-payout-key-change-me";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptPayoutDetails(details: Record<string, unknown>) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(details), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function parsePayoutDetails(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new Error("Payout details are required");
  }

  const details = input as Record<string, string>;
  const method = String(details.method || "").toUpperCase() as PayoutMethodType;

  if (method === "UPI") {
    const vpa = String(details.vpa || "").trim().toLowerCase();
    if (!/^[a-z0-9.\-_]{2,}@[a-z0-9.\-_]{2,}$/i.test(vpa)) {
      throw new Error("Enter a valid UPI ID");
    }
    return {
      method,
      encrypted: encryptPayoutDetails({ method, vpa }),
      masked: maskUpi(vpa),
    };
  }

  if (method === "BANK") {
    const accountNumber = String(details.accountNumber || "").replace(/\s/g, "");
    const ifsc = String(details.ifsc || "").trim().toUpperCase();
    const accountHolderName = String(details.accountHolderName || "").trim();
    if (!/^\d{9,18}$/.test(accountNumber)) {
      throw new Error("Enter a valid bank account number");
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new Error("Enter a valid IFSC code");
    }
    if (accountHolderName.length < 2) {
      throw new Error("Enter the account holder name");
    }
    return {
      method,
      encrypted: encryptPayoutDetails({ method, accountNumber, ifsc, accountHolderName }),
      masked: maskBank(accountNumber),
    };
  }

  throw new Error("Choose UPI or bank payout");
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !Types.ObjectId.isValid(session.user.id)) {
    return null;
  }

  const admin = await User.findById(session.user.id).select("_id role email name");
  if (admin?.role !== "ADMIN") return null;
  return admin;
}

export async function logAdminAction({
  adminId,
  action,
  targetId,
  description,
  session,
}: {
  adminId: Types.ObjectId;
  action: string;
  targetId?: string;
  description: string;
  session?: ClientSession | null;
}) {
  await AdminAuditLog.create(
    [{ adminId, action, targetId: targetId || "", description }],
    { session: session ?? undefined }
  );
}

function toIsoDate(value: SerializableDate) {
  return value && typeof value === "object" && "toISOString" in value
    ? value.toISOString?.() ?? null
    : null;
}

export function publicWithdrawal(withdrawal: PublicWithdrawalSource) {
  return {
    id: withdrawal._id.toString(),
    amount: paiseToRupees(withdrawal.amountPaise),
    amountPaise: withdrawal.amountPaise,
    currency: withdrawal.currency,
    status: withdrawal.status,
    payoutMethod: withdrawal.payoutMethod,
    payoutDetailsMasked: withdrawal.payoutDetailsMasked,
    transactionId: withdrawal.providerPayoutId || withdrawal._id.toString(),
    eligibleLikes: withdrawal.eligibleLikes,
    failureReason: withdrawal.failureReason || "",
    adminNote: withdrawal.adminNote || "",
    createdAt: toIsoDate(withdrawal.createdAt),
    processedAt: toIsoDate(withdrawal.processedAt),
    completedAt: toIsoDate(withdrawal.completedAt),
  };
}

export async function transitionWithdrawal({
  withdrawalId,
  nextStatus,
  adminId,
  note,
}: {
  withdrawalId: string;
  nextStatus: WithdrawalStatus;
  adminId: Types.ObjectId;
  note?: string;
}) {
  if (!Types.ObjectId.isValid(withdrawalId)) {
    throw new Error("Invalid withdrawal ID");
  }

  const dbSession = await mongoose.startSession();
  try {
    let updated: PublicWithdrawalSource | null = null;
    await dbSession.withTransaction(async () => {
      const withdrawal = await Withdrawal.findById(withdrawalId)
        .select("+payoutDetailsEncrypted")
        .session(dbSession);
      if (!withdrawal) throw new Error("Withdrawal not found");

      const wallet = await getOrCreateWallet(withdrawal.userId, dbSession);
      const isCreatorAllocation = Boolean(
        withdrawal.creatorAllocationIds?.length
      );
      const cycle = isCreatorAllocation
        ? null
        : await EarningCycle.findById(withdrawal.earningCycleId).session(dbSession);

      if (!isCreatorAllocation && !cycle) {
        throw new Error("Earning cycle not found");
      }

      const allocations = isCreatorAllocation
        ? await CreatorRevenueAllocation.find({
            _id: { $in: withdrawal.creatorAllocationIds },
          }).session(dbSession)
        : [];

      const allocationIds = allocations.map((a) => a._id);
      const markAllocationWithdrawalTxn = async (status: string) => {
        if (allocationIds.length > 0) {
          await CreatorEarningTransaction.updateMany(
            {
              allocationId: { $in: allocationIds },
              type: "WITHDRAWAL",
              withdrawalId: withdrawal._id,
            },
            { $set: { status, description: `Withdrawal ${status.toLowerCase()}` } },
            { session: dbSession }
          );
        }
      };
      const refundAllocations = async () => {
        if (allocations.length > 0) {
          for (const allocation of allocations) {
            const existing = await CreatorEarningTransaction.findOne({
              allocationId: allocation._id,
              type: "REFUND",
            }).session(dbSession);
            if (!existing) {
              await CreatorEarningTransaction.create(
                [
                  {
                    creatorId: allocation.creatorId,
                    cycleId: allocation.cycleId,
                    allocationId: allocation._id,
                    withdrawalId: withdrawal._id,
                    type: "REFUND",
                    amountPaise: allocation.finalRevenuePaise,
                    currency: INR_CURRENCY,
                    status: "COMPLETED",
                    description: "Withdrawal refunded",
                  },
                ],
                { session: dbSession }
              );
            }
          }
          await CreatorRevenueAllocation.updateMany(
            { _id: { $in: allocationIds } },
            { $set: { revenueState: "RELEASED" } },
            { session: dbSession }
          );
        }
      };

      if (nextStatus === "APPROVED") {
        if (withdrawal.status !== "PENDING") throw new Error("Only pending withdrawals can be approved");
        withdrawal.status = "APPROVED";
        if (cycle) cycle.status = "APPROVED";
      } else if (nextStatus === "REJECTED") {
        if (withdrawal.status !== "PENDING") throw new Error("Only pending withdrawals can be rejected");
        wallet.availableBalancePaise += withdrawal.amountPaise;
        withdrawal.status = "REJECTED";
        withdrawal.failureReason = note || "Rejected by admin";
        if (cycle) {
          cycle.status = "REJECTED";
          cycle.withdrawalId = null;
          cycle.cycleEnd = null;
        }
        await markAllocationWithdrawalTxn("FAILED");
        await refundAllocations();
        if (!isCreatorAllocation) {
          await EarningTransaction.updateOne(
            { withdrawalId: withdrawal._id, type: "WITHDRAWAL" },
            { $set: { status: "FAILED", description: "Withdrawal rejected" } },
            { session: dbSession }
          );
        }
      } else if (nextStatus === "PROCESSING") {
        if (withdrawal.status !== "APPROVED") throw new Error("Only approved withdrawals can be processed");
        withdrawal.status = "PROCESSING";
        withdrawal.processedAt = new Date();
        if (cycle) cycle.status = "PROCESSING";
      } else if (nextStatus === "COMPLETED") {
        if (!["APPROVED", "PROCESSING"].includes(withdrawal.status)) {
          throw new Error("Only approved or processing withdrawals can be completed");
        }
        withdrawal.status = "COMPLETED";
        withdrawal.completedAt = new Date();
        wallet.totalDebitsPaise += withdrawal.amountPaise;
        if (cycle) cycle.status = "PAID";
        await markAllocationWithdrawalTxn("COMPLETED");
        if (!isCreatorAllocation) {
          await EarningTransaction.updateOne(
            { withdrawalId: withdrawal._id, type: "WITHDRAWAL" },
            { $set: { status: "COMPLETED", description: "Withdrawal completed" } },
            { session: dbSession }
          );
        }
      } else if (nextStatus === "FAILED") {
        if (!["APPROVED", "PROCESSING"].includes(withdrawal.status)) {
          throw new Error("Only approved or processing withdrawals can fail");
        }
        wallet.availableBalancePaise += withdrawal.amountPaise;
        withdrawal.status = "FAILED";
        withdrawal.failureReason = note || "Payout failed";
        if (cycle) {
          cycle.status = "FAILED";
          cycle.withdrawalId = null;
          cycle.cycleEnd = null;
        }
        await markAllocationWithdrawalTxn("FAILED");
        await refundAllocations();
        if (!isCreatorAllocation) {
          await EarningTransaction.updateOne(
            { withdrawalId: withdrawal._id, type: "WITHDRAWAL" },
            { $set: { status: "FAILED", description: "Withdrawal failed" } },
            { session: dbSession }
          );
        }
      } else if (nextStatus === "REVERSED") {
        if (!["COMPLETED", "PROCESSING"].includes(withdrawal.status)) {
          throw new Error("Only completed or processing withdrawals can be reversed");
        }
        if (isCreatorAllocation) {
          wallet.availableBalancePaise += withdrawal.amountPaise;
          if (withdrawal.status === "COMPLETED") {
            wallet.totalDebitsPaise = Math.max(
              0,
              wallet.totalDebitsPaise - withdrawal.amountPaise
            );
          }
          await markAllocationWithdrawalTxn("REVERSED");
          await refundAllocations();
        } else {
          const existingRefund = await EarningTransaction.findOne({
            withdrawalId: withdrawal._id,
            type: "REFUND",
          }).session(dbSession);
          if (!existingRefund) {
            wallet.availableBalancePaise += withdrawal.amountPaise;
            if (withdrawal.status === "COMPLETED") {
              wallet.totalDebitsPaise = Math.max(
                0,
                wallet.totalDebitsPaise - withdrawal.amountPaise
              );
            }
            await EarningTransaction.create(
              [
                {
                  userId: withdrawal.userId,
                  type: "REFUND",
                  amountPaise: withdrawal.amountPaise,
                  currency: INR_CURRENCY,
                  status: "COMPLETED",
                  withdrawalId: withdrawal._id,
                  earningCycleId: withdrawal.earningCycleId,
                  description: "Withdrawal reversed",
                },
              ],
              { session: dbSession }
            );
          }
          if (cycle) {
            cycle.status = "REVERSED";
            cycle.withdrawalId = null;
            cycle.cycleEnd = null;
          }
        }
        withdrawal.status = "REVERSED";
        withdrawal.failureReason = note || "Payout reversed";
      } else {
        throw new Error("Unsupported withdrawal transition");
      }

      withdrawal.adminNote = note || withdrawal.adminNote || "";
      await wallet.save({ session: dbSession });
      if (cycle) await cycle.save({ session: dbSession });
      await withdrawal.save({ session: dbSession });
      await logAdminAction({
        adminId,
        action: `WITHDRAWAL_${nextStatus}`,
        targetId: withdrawal._id.toString(),
        description: `Withdrawal moved to ${nextStatus}`,
        session: dbSession,
      });
      updated = withdrawal;
    });

    if (!updated) throw new Error("Withdrawal was not updated");
    return updated;
  } finally {
    await dbSession.endSession();
  }
}
