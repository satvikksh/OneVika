export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { dbConnect } from "@/app/lib/mongodb";
import {
  generateOtp,
  generateOtpSalt,
  hashOtp,
  OTP_EXPIRY_MS,
  OTP_MAX_RESENDS,
  OTP_RESEND_DELAY_MS,
  sendOtpEmail,
} from "@/app/lib/otp";
import OtpChallenge from "@/app/models/OtpChallenge";

export async function POST(req: Request) {
  try {
    const { challengeId } = await req.json();
    await dbConnect();

    const challenge = await OtpChallenge.findById(challengeId);
    if (!challenge || challenge.usedAt || challenge.verifiedAt) {
      return NextResponse.json({ error: "OTP request is no longer active" }, { status: 400 });
    }

    const waitMs = challenge.resendAvailableAt.getTime() - Date.now();
    if (waitMs > 0) {
      return NextResponse.json(
        { error: "Please wait before requesting another OTP", retryAfter: Math.ceil(waitMs / 1000) },
        { status: 429 }
      );
    }

    if (challenge.resendCount >= OTP_MAX_RESENDS) {
      return NextResponse.json({ error: "OTP resend limit reached" }, { status: 429 });
    }

    const otp = generateOtp();
    const salt = generateOtpSalt();
    challenge.otpSalt = salt;
    challenge.otpHash = hashOtp(otp, salt);
    challenge.expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    challenge.resendAvailableAt = new Date(Date.now() + OTP_RESEND_DELAY_MS);
    challenge.resendCount += 1;
    challenge.attempts = 0;
    await challenge.save();

    await sendOtpEmail({
      email: challenge.email,
      otp,
      purpose: challenge.purpose,
    });

    return NextResponse.json({ message: "A new OTP was sent", resendAfter: 60 });
  } catch (error) {
    console.error("OTP resend error:", error);
    return NextResponse.json({ error: "Unable to resend OTP" }, { status: 500 });
  }
}
