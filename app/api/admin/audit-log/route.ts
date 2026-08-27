import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/lib/earnings";
import { dbConnect } from "@/app/lib/mongodb";
import AdminAuditLog from "@/app/models/AdminAuditLog";

type AuditLogRow = {
  _id: { toString: () => string };
  adminId?: { name?: string; email?: string };
  action: string;
  targetId?: string;
  description: string;
  createdAt?: Date;
};

export async function GET() {
  await dbConnect();
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const logs = await AdminAuditLog.find({})
    .populate("adminId", "name email")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    logs: (logs as unknown as AuditLogRow[]).map((log) => ({
      id: log._id.toString(),
      admin: log.adminId?.name || log.adminId?.email || "Admin",
      action: log.action,
      targetId: log.targetId || "",
      description: log.description,
      createdAt: log.createdAt?.toISOString?.() ?? null,
    })),
  });
}
