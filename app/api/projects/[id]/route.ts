export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Project, { PROJECT_STATUSES } from "@/app/models/Project";
import { rejectIfInactive } from "@/app/lib/user-status";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json({ error: inactiveReason }, { status: 403 });
    }

    const { id } = await props.params;

    const body = await req.json();

    const hasStatus =
      typeof body?.status === "string" && body.status.trim() !== "";
    const hasProgress =
      body?.progress !== undefined && body?.progress !== null && body?.progress !== "";

    if (!hasStatus && !hasProgress) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    let status: string | undefined;
    if (hasStatus) {
      status = String(body.status).trim();
      if (!(PROJECT_STATUSES as string[]).includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    let progress: number | undefined;
    if (hasProgress) {
      progress = Number(body.progress);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
        return NextResponse.json(
          { error: "Progress must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    const project = await Project.findById(id).select("userId").lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const ownerId =
      project.userId && typeof project.userId === "object" && "_id" in project.userId
        ? String((project.userId as { _id: unknown })._id)
        : String(project.userId);

    if (ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to update this project" },
        { status: 403 }
      );
    }

    const $set: Record<string, unknown> = {};
    if (status !== undefined) $set.status = status;
    if (progress !== undefined) $set.progress = progress;

    const updated = await Project.findByIdAndUpdate(
      id,
      { $set },
      { new: true }
    );

    return NextResponse.json({
      project: {
        id: updated ? updated._id.toString() : id,
        status: updated ? updated.status : (status ?? undefined),
        progress: updated ? updated.progress : (progress ?? 0),
        updatedAt: updated?.updatedAt
          ? updated.updatedAt.toISOString()
          : new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("PROJECT STATUS UPDATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update project status" },
      { status: 500 }
    );
  }
}