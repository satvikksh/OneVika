import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { rejectIfInactive } from "@/app/lib/user-status";
import SavedRepository from "@/app/models/SavedRepository";

export const runtime = "nodejs";

/**
 * DELETE /api/saved-repositories/[id]
 * Removes a saved repository. Only the OrbitByte user who saved it can remove
 * it (ownership enforced server-side).
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid saved repository id." },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await SavedRepository.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Saved repository not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ unsaved: true });
  } catch (error) {
    console.error("SAVED REPO DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to remove the saved repository. Please try again." },
      { status: 500 }
    );
  }
}