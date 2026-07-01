export const runtime = "nodejs";

import { NextResponse } from "next/server";
import User from "@/app/models/User";
import OtpChallenge from "@/app/models/OtpChallenge";
import { dbConnect } from "@/app/lib/mongodb";
import {
  generateOtp,
  generateOtpSalt,
  hashOtp,
  normalizeEmail,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_DELAY_MS,
  sendOtpEmail,
} from "@/app/lib/otp";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.exists({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: "No account was found for that email" }, { status: 404 });
    }

    await OtpChallenge.updateMany(
      { email: normalizedEmail, purpose: "password-reset", usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    const otp = generateOtp();
    const salt = generateOtpSalt();
    const challenge = await OtpChallenge.create({
      email: normalizedEmail,
      purpose: "password-reset",
      otpHash: hashOtp(otp, salt),
      otpSalt: salt,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      resendCount: 0,
      resendAvailableAt: new Date(Date.now() + OTP_RESEND_DELAY_MS),
    });

    try {
      await sendOtpEmail({ email: normalizedEmail, otp, purpose: "password-reset" });
    } catch (error) {
      await OtpChallenge.findByIdAndDelete(challenge._id);
      throw error;
    }

    return NextResponse.json({
      message: "OTP sent to your email",
      challengeId: challenge.id,
      resendAfter: 60,
    });
  } catch (error) {
    console.error("Password reset OTP error:", error);
    return NextResponse.json({ error: "Unable to send OTP" }, { status: 500 });
  }
}
