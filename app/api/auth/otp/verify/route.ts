export const runtime = "nodejs";

import { NextResponse } from "next/server";
import User from "@/app/models/User";
import OtpChallenge from "@/app/models/OtpChallenge";
import { dbConnect } from "@/app/lib/mongodb";
import {
  generateResetToken,
  hashResetToken,
  verifyOtp,
} from "@/app/lib/otp";

export async function POST(req: Request) {
  try {
    const { challengeId, otp } = await req.json();
    if (!challengeId || !/^\d{6}$/.test(String(otp || ""))) {
      return NextResponse.json({ error: "Enter a valid 6-digit OTP" }, { status: 400 });
    }

    await dbConnect();
    const challenge = await OtpChallenge.findById(challengeId);

    if (!challenge || challenge.usedAt) {
      return NextResponse.json({ error: "OTP request is invalid or already used" }, { status: 400 });
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 400 });
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      return NextResponse.json({ error: "Too many incorrect attempts" }, { status: 429 });
    }

    if (!verifyOtp(String(otp), challenge.otpSalt, challenge.otpHash)) {
      challenge.attempts += 1;
      await challenge.save();
      return NextResponse.json(
        { error: `Incorrect OTP. ${Math.max(0, challenge.maxAttempts - challenge.attempts)} attempts remaining.` },
        { status: 400 }
      );
    }

    if (challenge.purpose === "registration") {
      const pending = challenge.registration;
      if (!pending) {
        return NextResponse.json({ error: "Registration details are missing" }, { status: 400 });
      }

      const existing = await User.exists({ email: challenge.email });
      if (existing) {
        challenge.usedAt = new Date();
        await challenge.save();
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }

      const answerFields = {
        favoritePet: "",
        favoriteColor: "",
        nickname: "",
        [pending.securityQuestion]: pending.securityAnswer,
      };

      await User.create({
        name: pending.name,
        email: challenge.email,
        password: pending.passwordHash,
        avatar: pending.avatar || "",
        image: pending.avatar || "",
        ...answerFields,
      });

      challenge.verifiedAt = new Date();
      challenge.usedAt = new Date();
      await challenge.save();

      return NextResponse.json({
        message: "Email verified and account created",
        purpose: challenge.purpose,
        redirect: "/login",
      });
    }

    const resetToken = generateResetToken();
    challenge.verifiedAt = new Date();
    challenge.resetTokenHash = hashResetToken(resetToken);
    // Give the verified reset step ten minutes as well.
    challenge.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await challenge.save();

    return NextResponse.json({
      message: "Email verified",
      purpose: challenge.purpose,
      resetToken,
      redirect: `/reset-password?challenge=${challenge.id}`,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ error: "Unable to verify OTP" }, { status: 500 });
  }
}
