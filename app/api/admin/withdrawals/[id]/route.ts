import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireAdmin, transitionWithdrawal } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import type { WithdrawalStatus } from "@/app/models/Withdrawal";

const ACTION_TO_STATUS: Record<string, WithdrawalStatus> = {
  approve: "APPROVED",
  reject: "REJECTED",
  process: "PROCESSING",
  complete: "COMPLETED",
  fail: "FAILED",
  reverse: "REVERSED",
};

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await props.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid withdrawal ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();
    const nextStatus = ACTION_TO_STATUS[action];
    if (!nextStatus) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const withdrawal = await transitionWithdrawal({
      withdrawalId: id,
      nextStatus,
      adminId: admin._id,
      note: typeof body.note === "string" ? body.note : "",
    });

    return NextResponse.json({
      withdrawal: {
        id: withdrawal._id.toString(),
        status: withdrawal.status,
      },
    });
  } catch (error) {
    console.error("ADMIN WITHDRAWAL ACTION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update withdrawal" },
      { status: 400 }
    );
  }
}
