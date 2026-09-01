import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import PaymentTransaction from "@/app/models/PaymentTransaction";
import User from "@/app/models/User";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import { sendPaymentEmail, PaymentEmailType } from "@/app/lib/payment-email";
import { paiseToRupees, rupeesToPaise } from "@/app/lib/earnings";
import { PaymentService } from "@/app/services/payment-service";
import PaymentMethod from "@/app/models/PaymentMethod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const ALLOWED_FILTERS = new Set([
  "all",
  "active",
  "expired",
  "cancelled",
  "suspended",
  "pending",
  "paid",
]);

const ALLOWED_SORTS = new Set([
  "createdAt",
  "createdAtAsc",
  "updatedAt",
  "membershipStart",
  "membershipEnd",
  "amount",
]);

const SORT_SPECS: Record<string, Record<string, 1 | -1>> = {
  createdAt: { createdAt: -1 },
  createdAtAsc: { createdAt: 1 },
  updatedAt: { updatedAt: -1 },
  membershipStart: { membershipStart: -1 },
  membershipEnd: { membershipEnd: -1 },
  amount: { amountPaise: -1 },
};

type AdminAction =
  | "activate"
  | "extend"
  | "cancel"
  | "suspend"
  | "restore"
  | "refund";

type ActionReason =
  | "payment_completed"
  | "admin_manual"
  | "refund_processed"
  | "membership_cancelled"
  | "expired_membership"
  | "other";

interface PremiumMembershipTableRow {
  _id: mongoose.Types.ObjectId;
  transactionId: string;
  userId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  membershipPlan: string;
  price: number;
  currency: string;
  paymentTransactionId: string;
  status: string;
  membershipStart: Date | null;
  membershipEnd: Date | null;
  autoRenewal: boolean;
  paymentStatus: string;
  createdAt: Date;
}

interface PremiumOverviewStats {
  totalMembers: number;
  activeMemberships: number;
  expiredMemberships: number;
  cancelledMemberships: number;
  newPurchasesLast30Days: number;
  premiumRevenueLast30Days: number;
  pendingPayments: number;
  failedPayments: number;
  refundsLast30Days: number;
}

export const runtime = "nodejs";

async function sendMembershipEmail(
  email: string | null,
  name: string | null,
  action: string,
  reason: string,
  referenceId: string
): Promise<boolean> {
  if (!email) return false;

  const typeMap: Record<string, PaymentEmailType> = {
    premium_activated: "activation",
    premium_extended: "membership_extended",
    premium_cancelled: "membership_cancelled",
    premium_suspended: "admin_action",
    premium_restored: "admin_action",
    refund_processed: "refund_completed",
  };

  const result = await sendPaymentEmail({
    email,
    name,
    type: typeMap[action] || "admin_action",
    reason,
    transactionId: referenceId,
  });

  // Email delivery failure must not roll back the database action.
  // Only log the failure.
  if (!result.delivered) {
    console.log(`Email delivery failed for ${email}: ${result.error}`);
  }

  return result.delivered;
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
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Number(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE)
    );
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const sortBy =
      searchParams.get("sortBy") || "membershipStart";
    const filter = searchParams.get("filter") || "all";
    const searchQuery = searchParams.get("q") || "";
    const fromDate = searchParams.get("fromDate")
      ? new Date(searchParams.get("fromDate"))
      : undefined;
    const toDate = searchParams.get("toDate")
      ? new Date(searchParams.get("toDate"))
      : undefined;

    if (!ALLOWED_FILTERS.has(filter)) {
      return NextResponse.json(
        { error: "Invalid filter option" },
        { status: 400 }
      );
    }

    if (!ALLOWED_SORTS.has(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sort option" },
        { status: 400 }
      );
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const mongooseSort: Record<string, 1 | -1> = {
      ...SORT_SPECS[sortBy],
      ...(sortBy === "amount" ? { amountPaise: sortOrder } : {}),
    };

    const filterQuery: any = {};

    // Apply filter
    if (filter !== "all") {
      const now = new Date();
      if (filter === "active") {
        filterQuery.status = "COMPLETED";
        filterQuery.$expr = {
          $gt: ["$completedAt", new Date()],
        };
      } else if (filter === "expired") {
        filterQuery.status = "COMPLETED";
        filterQuery.$expr = {
          $lt: ["$completedAt", new Date()],
        };
      } else if (filter === "cancelled") {
        filterQuery.status = "CANCELLED";
      } else if (filter === "suspended") {
        filterQuery.status = "REFUNDED";
      } else if (filter === "pending") {
        filterQuery.status = "INITIATED";
      } else if (filter === "paid") {
        filterQuery.status = "COMPLETED";
      }
    }

    // Search query
    if (searchQuery) {
      filterQuery.$or = [
        { "userId.email": new RegExp(searchQuery, "i") },
        { transactionId: new RegExp(searchQuery, "i") },
        { "metadata.product": new RegExp(searchQuery, "i") },
      ];
    }

    // Date range filter
    if (fromDate) {
      filterQuery.createdAt = filterQuery.createdAt || {};
      filterQuery.createdAt.$gte = fromDate;
    }
    if (toDate) {
      filterQuery.createdAt = filterQuery.createdAt || {};
      filterQuery.createdAt.$lte = toDate;
    }

    // Count total documents
    const total = await PaymentTransaction.countDocuments(filterQuery);

    // Fetch transactions with pagination
    const transactions = await PaymentTransaction.find(filterQuery)
      .sort(mongooseSort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("userId", "name email image avatar isPremium premiumExpiresAt")
      .lean();

    // Transform transactions for the table
    const tableData = transactions.map((t) => {
      const user = t.userId ? (t.userId as any) : null;
      const userEmail = user?.email || "Unknown";
      const userName = user?.name || "Unknown User";
      // Compute membership dates based on status
      let membershipStart: Date | null = null;
      let membershipEnd: Date | null = null;
      if (t.status === "COMPLETED") {
        membershipStart = t.createdAt ? new Date(t.createdAt) : null;
        membershipEnd = t.completedAt ? new Date(t.completedAt) : null;
      }
      return {
        _id: t._id,
        transactionId: t.transactionId,
        userId: t.userId ? t.userId.toString() : "",
        email: userEmail,
        name: userName,
        membershipPlan: t.metadata?.product || "premium_membership",
        price: t.amountPaise ? paiseToRupees(t.amountPaise) : 0,
        currency: t.currency || "INR",
        paymentTransactionId: t.transactionId,
        status: t.status,
        membershipStart,
        membershipEnd,
        autoRenewal: t.metadata?.autoRenewal ?? false,
        paymentStatus: t.status,
        createdAt: t.createdAt,
      };
    });

    // Calculate overview stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalMembers, activeMemberships, expiredMemberships, cancelledMemberships, newPurchases, premiumRevenue, pendingPayments, failedPayments, refunds] = await Promise.all([
      // Total premium members (users with active premium)
      User.countDocuments({
        isPremium: true,
        $or: [
          { premiumExpiresAt: null },
          { premiumExpiresAt: { $gt: now } },
        ],
      }),

      // Active memberships (completed premium payments)
      PaymentTransaction.countDocuments({
        status: "COMPLETED",
        "metadata.product": "premium_membership",
        $expr: { $gt: ["$completedAt", new Date()] },
      }),

      // Expired memberships
      PaymentTransaction.countDocuments({
        status: "COMPLETED",
        "metadata.product": "premium_membership",
        $expr: { $lt: ["$completedAt", now] },
      }),

      // Cancelled memberships
      PaymentTransaction.countDocuments({
        status: "CANCELLED",
        "metadata.product": "premium_membership",
      }),

      // New purchases last 30 days
      PaymentTransaction.countDocuments({
        status: "COMPLETED",
        "metadata.product": "premium_membership",
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Premium revenue last 30 days
      PaymentTransaction.aggregate([
        {
          $match: {
            status: "COMPLETED",
            "metadata.product": "premium_membership",
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenuePaise: { $sum: "$amountPaise" },
            transactionCount: { $sum: 1 },
          },
        },
      ]),

      // Pending payments
      PaymentTransaction.countDocuments({ status: "INITIATED" }),

      // Failed payments
      PaymentTransaction.countDocuments({ status: "FAILED" }),

      // Refunds last 30 days
      PaymentTransaction.countDocuments({
        status: "REFUNDED",
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    // Calculate revenue in rupees
    const premiumRevenueRupees = premiumRevenue.length > 0
      ? paiseToRupees(premiumRevenue[0].totalRevenuePaise ?? 0)
      : 0;

    // Calculate pending payments amount
    const pendingPaymentsAmount = await PaymentTransaction.aggregate([
      { $match: { status: "INITIATED" } },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
    ]);
    const pendingAmount = pendingPaymentsAmount.length > 0
      ? paiseToRupees(pendingPaymentsAmount[0].totalPaise ?? 0)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalMembers: totalMembers ?? 0,
        activeMemberships: activeMemberships ?? 0,
        expiredMemberships: expiredMemberships ?? 0,
        cancelledMemberships: cancelledMemberships ?? 0,
        newPurchasesLast30Days: newPurchases ?? 0,
        premiumRevenueLast30Days: premiumRevenueRupees,
        pendingPayments: pendingPayments ?? 0,
        failedPayments: failedPayments ?? 0,
        refundsLast30Days: refunds ?? 0,
        pendingAmount,
      },
      table: {
        data: tableData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        filter,
        searchQuery,
        fromDate: fromDate?.toISOString().split("T")[0],
        toDate: toDate?.toISOString().split("T")[0],
      },
      sorts: {
        sortBy,
        order,
        availableSorts: [
          { value: "createdAt", label: "Newest First" },
          { value: "createdAtAsc", label: "Oldest First" },
          { value: "updatedAt", label: "Last Updated" },
          { value: "membershipStart", label: "Membership Start" },
          { value: "membershipEnd", label: "Membership End" },
          { value: "amount", label: "Price" },
        ],
      },
    });
  } catch (error) {
    console.error("ADMIN PREMIUM ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load premium management data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      action,
      targetId,
      userId,
      reason,
      extendDays,
    } = body;

    // Validate required fields
    if (!action || !targetId) {
      return NextResponse.json(
        { error: "Action and target transaction ID are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify admin
    const adminId = admin._id || admin.id || new mongoose.Types.ObjectId();

    // Find the transaction
    const transaction = await PaymentTransaction.findById(targetId).lean();
    if (!transaction) {
      return NextResponse.json(
        { error: "Payment transaction not found" },
        { status: 404 }
      );
    }

    // Handle different actions
    let success = false;
    let redirectInfo: any = {};

    switch (action) {
      case "activate": {
        // Activate premium membership for a user
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required for activation" },
            { status: 400 }
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Check if user already has active premium
        if (user.isPremium && user.premiumExpiresAt) {
          const expiresAt = new Date(user.premiumExpiresAt);
          if (expiresAt > new Date()) {
            return NextResponse.json(
              {
                error: "User already has active premium membership",
                existingExpiresAt: user.premiumExpiresAt,
              },
              { status: 400 }
            );
          }
        }

        // Activate premium using existing utility
        const { applyPremiumToUser } = await import("@/app/lib/premium");
        await applyPremiumToUser(user, {
          provider: "orbitbyte",
          paymentIntentId: transaction.transactionId,
          checkoutSessionId: null,
          paymentMethod: {
            type: await getPaymentType(transaction.paymentMethod),
          },
        });

        // Log the admin action
        await AdminAuditLog.create({
          adminId: adminId,
          targetId: transaction._id.toString(),
          action: "PREMIUM_ACTIVATION",
          reason: reason || "admin_manual",
          previousStatus: "INITIATED",
          newStatus: "COMPLETED",
          description: `Premium activated by admin for user ${user.email}`,
        });

        // Send email notification
        await sendMembershipEmail(
          user.email,
          user.name,
          "premium_activated",
          reason || "admin_manual",
          transaction.transactionId
        );

        success = true;
        redirectInfo = {
          message: "Premium membership activated successfully",
          userId,
        };
        break;
      }

      case "extend": {
        // Extend premium membership
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required for extension" },
            { status: 400 }
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Calculate new expiry date
        const extensionDays = extendDays || 30; // default 30 days
        const now = new Date();
        let newExpiresAt: Date;

        if (user.isPremium && user.premiumExpiresAt) {
          // Add to existing expiry
          const currentExpiresAt = new Date(user.premiumExpiresAt);
          newExpiresAt = new Date(
            currentExpiresAt.getTime() + extensionDays * 24 * 60 * 60 * 1000
          );
        } else {
          // Start from now
          newExpiresAt = new Date(
            now.getTime() + extensionDays * 24 * 60 * 60 * 1000
          );
        }

        // Update user premium expiry
        await User.findByIdAndUpdate(userId, {
          premiumExpiresAt: newExpiresAt,
        });

        // Log the admin action
        await AdminAuditLog.create({
          adminId: adminId,
          targetId: transaction._id.toString(),
          action: "PREMIUM_EXTENSION",
          reason: reason || "admin_manual",
          previousStatus: user.isPremium ? "active" : "inactive",
          newStatus: "active extended",
          description: `Premium membership extended by ${extensionDays} days by admin for user ${user.email}`,
        });

        // Send email notification
        await sendMembershipEmail(
          user.email,
          user.name,
          "premium_extended",
          reason || "admin_manual",
          transaction.transactionId
        );

        success = true;
        redirectInfo = {
          message: `Premium membership extended by ${extensionDays} days`,
          userId,
        };
        break;
      }

      case "cancel": {
        // Cancel premium membership
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required for cancellation" },
            { status: 400 }
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Revoke premium status
        await User.findByIdAndUpdate(userId, {
          isPremium: false,
          premiumExpiresAt: null,
          premiumPlan: null,
        });

        // Log the admin action
        await AdminAuditLog.create({
          adminId: adminId,
          targetId: transaction._id.toString(),
          action: "PREMIUM_CANCELLATION",
          reason: reason || "admin_manual",
          previousStatus: user.isPremium ? "active" : "inactive",
          newStatus: "cancelled",
          description: `Premium membership cancelled by admin for user ${user.email}`,
        });

        // Send email notification
        await sendMembershipEmail(
          user.email,
          user.name,
          "premium_cancelled",
          reason || "admin_manual",
          transaction.transactionId
        );

        success = true;
        redirectInfo = {
          message: "Premium membership cancelled successfully",
          userId,
        };
        break;
      }

      case "suspend": {
        // Suspend premium membership
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required for suspension" },
            { status: 400 }
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Revoke premium status temporarily
        await User.findByIdAndUpdate(userId, {
          isPremium: false,
          premiumExpiresAt: null,
        });

        // Log the admin action
        await AdminAuditLog.create({
          adminId: adminId,
          targetId: transaction._id.toString(),
          action: "PREMIUM_SUSPENSION",
          reason: reason || "admin_manual",
          previousStatus: user.isPremium ? "active" : "inactive",
          newStatus: "suspended",
          description: `Premium membership suspended by admin for user ${user.email}`,
        });

        // Send email notification
        await sendMembershipEmail(
          user.email,
          user.name,
          "premium_suspended",
          reason || "admin_manual",
          transaction.transactionId
        );

        success = true;
        redirectInfo = {
          message: "Premium membership suspended successfully",
          userId,
        };
        break;
      }

      case "restore": {
        // Restore suspended premium membership
        if (!userId) {
          return NextResponse.json(
            { error: "User ID is required for restoration" },
            { status: 400 }
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Restore premium status
        // Check if there's an active transaction or just reactivate
        await User.findByIdAndUpdate(userId, {
          isPremium: true,
          premiumExpiresAt: user.premiumExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        // Log the admin action
        await AdminAuditLog.create({
          adminId: adminId,
          targetId: transaction._id.toString(),
          action: "PREMIUM_RESTORATION",
          reason: reason || "admin_manual",
          previousStatus: "suspended",
          newStatus: "active restored",
          description: `Premium membership restored by admin for user ${user.email}`,
        });

        // Send email notification
        await sendMembershipEmail(
          user.email,
          user.name,
          "premium_restored",
          reason || "admin_manual",
          transaction.transactionId
        );

        success = true;
        redirectInfo = {
          message: "Premium membership restored successfully",
          userId,
        };
        break;
      }

      case "refund": {
        // Process a full refund for a payment (initiate + approve + complete)
        const refund = await PaymentService.initiateRefund(
          new mongoose.Types.ObjectId(transaction._id.toString()),
          reason || "Admin-processed refund",
          adminId ? new mongoose.Types.ObjectId(adminId.toString()) : undefined
        );

        await PaymentService.processRefund(
          refund.refundId,
          "APPROVED",
          adminId ? new mongoose.Types.ObjectId(adminId.toString()) : new mongoose.Types.ObjectId(),
          reason || "Admin-processed refund"
        );

        const completedRefund = await PaymentService.completeRefund(
          refund.refundId,
          adminId ? new mongoose.Types.ObjectId(adminId.toString()) : new mongoose.Types.ObjectId()
        );

        // Look up user for email context
        const refundUser = transaction.userId
          ? await User.findById(transaction.userId).lean()
          : null;

        // Log the admin action
        await AdminAuditLog.create({
          adminId: adminId,
          targetId: transaction._id.toString(),
          action: "PREMIUM_REFUND",
          reason: reason || "admin_manual",
          previousStatus: transaction.status,
          newStatus: "REFUNDED",
          description: `Refund processed by admin for transaction ${transaction.transactionId}`,
        });

        // Send email notification
        await sendMembershipEmail(
          refundUser?.email || transaction.userId?.toString() || "",
          refundUser?.name || "",
          "refund_processed",
          reason || "admin_manual",
          transaction.transactionId
        );

        success = true;
        redirectInfo = {
          message: "Refund processed successfully",
          refundId: completedRefund?.refundId,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 }
        );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Action not implemented or failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      ...redirectInfo,
    });
  } catch (error) {
    console.error("ADMIN PREMIUM ACTION ERROR:", error);
    return NextResponse.json(
      { error: "Failed to process admin action" },
      { status: 500 }
    );
  }
}

async function getPaymentType(paymentMethodId: unknown): Promise<string> {
  if (!paymentMethodId) return "orbitbyte";
  if (typeof paymentMethodId === "string") {
    if (mongoose.Types.ObjectId.isValid(paymentMethodId)) {
      const pm = await PaymentMethod.findById(paymentMethodId).lean();
      return pm?.type || "orbitbyte";
    }
    return paymentMethodId;
  }
  if (paymentMethodId && typeof paymentMethodId === "object" && "type" in paymentMethodId) {
    const type = (paymentMethodId as { type?: unknown }).type;
    if (typeof type === "string") return type;
  }
  if (mongoose.Types.ObjectId.isValid(paymentMethodId as string)) {
    const pm = await PaymentMethod.findById(paymentMethodId as string).lean();
    return pm?.type || "orbitbyte";
  }
  return "orbitbyte";
}