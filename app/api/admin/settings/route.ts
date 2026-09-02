import { Types } from "mongoose";
import { NextResponse } from "next/server";

import {
  getEarningsSettings,
  logAdminAction,
  paiseToRupees,
  requireAdmin,
  rupeesToPaise,
} from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import type { IPlatformSettings, PayoutProvider } from "@/app/models/PlatformSettings";

type SettingsBody = {
  likeRate?: unknown;
  minimumWithdrawal?: unknown;
  maximumWithdrawal?: unknown;
  withdrawalsEnabled?: unknown;
  payoutProvider?: unknown;
  maintenanceMode?: unknown;
};

// The only supported payout providers. `razorpayx` is intentionally NOT
// included anywhere and is rejected outright.
function isPayoutProvider(value: unknown): value is PayoutProvider {
  return value === "manual" || value === "cashfree";
}

function publicSettings(settings: IPlatformSettings) {
  return {
    likeRate: paiseToRupees(settings.likeRatePaise),
    minimumWithdrawal: paiseToRupees(settings.minimumWithdrawalPaise),
    maximumWithdrawal: settings.maximumWithdrawalPaise
      ? paiseToRupees(settings.maximumWithdrawalPaise)
      : null,
    withdrawalsEnabled: settings.withdrawalsEnabled,
    payoutProvider: settings.payoutProvider,
    maintenanceMode: settings.maintenanceMode,
  };
}

export async function GET() {
  await dbConnect();
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const settings = await getEarningsSettings();
  return NextResponse.json({ settings: publicSettings(settings) });
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as SettingsBody;
    const settings = await getEarningsSettings();

    if (typeof body.likeRate === "number") {
      const paise = rupeesToPaise(body.likeRate);
      if (paise < 1) throw new Error("Like rate must be at least 1 paise");
      settings.likeRatePaise = paise;
    }
    if (typeof body.minimumWithdrawal === "number") {
      const paise = rupeesToPaise(body.minimumWithdrawal);
      if (paise < 1) throw new Error("Minimum withdrawal must be positive");
      settings.minimumWithdrawalPaise = paise;
    }
    if (body.maximumWithdrawal === null || typeof body.maximumWithdrawal === "number") {
      settings.maximumWithdrawalPaise =
        body.maximumWithdrawal === null
          ? null
          : rupeesToPaise(body.maximumWithdrawal as number);
    }
    if (typeof body.withdrawalsEnabled === "boolean") {
      settings.withdrawalsEnabled = body.withdrawalsEnabled;
    }
    if (body.payoutProvider !== undefined && body.payoutProvider !== null) {
      // Only allow manual or cashfree. Any other value (e.g. razorpayx) is
      // rejected.
      if (!isPayoutProvider(body.payoutProvider)) {
        throw new Error('Invalid payout provider. Supported values: "manual", "cashfree"');
      }
      settings.payoutProvider = body.payoutProvider;
    }
    if (typeof body.maintenanceMode === "boolean") {
      settings.maintenanceMode = body.maintenanceMode;
    }

    await settings.save();
    await logAdminAction({
      adminId: admin._id as Types.ObjectId,
      action: "SETTINGS_UPDATED",
      targetId: settings._id.toString(),
      description: "Admin updated earnings and payout settings",
    });

    return NextResponse.json({ settings: publicSettings(settings) });
  } catch (error) {
    console.error("ADMIN SETTINGS ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save settings" },
      { status: 400 }
    );
  }
}
