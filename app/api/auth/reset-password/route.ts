export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import User from "@/app/models/User";
import OtpChallenge from "@/app/models/OtpChallenge";
import { dbConnect } from "@/app/lib/mongodb";
import { hashResetToken } from "@/app/lib/otp";

export async function POST(req: Request) {
  try {
    const { challengeId, resetToken, pass } = await req.json();
    if (!challengeId || !resetToken || !pass) {
      return NextResponse.json({ error: "Verified reset request and new password are required" }, { status: 400 });
    }
    if (String(pass).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await dbConnect();
    const challenge = await OtpChallenge.findOne({
      _id: challengeId,
      purpose: "password-reset",
      verifiedAt: { $ne: null },
      usedAt: null,
      expiresAt: { $gt: new Date() },
      resetTokenHash: hashResetToken(String(resetToken)),
    });

    if (!challenge) {
      return NextResponse.json({ error: "Reset link is invalid, expired, or already used" }, { status: 400 });
    }

    const hashed = await hash(String(pass), 10);
    const updated = await User.updateOne(
      { email: challenge.email },
      { $set: { password: hashed }, $inc: { sessionVersion: 1 } }
    );
    if (updated.matchedCount === 0) {
      return NextResponse.json({ error: "Account no longer exists" }, { status: 404 });
    }

    challenge.usedAt = new Date();
    challenge.resetTokenHash = undefined;
    await challenge.save();

    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 });
  }
}
