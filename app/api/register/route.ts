export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "../../models/User";
import { dbConnect } from "../../lib/mongodb";
import cloudinary from "../../lib/cloudinary";
import OtpChallenge from "../../models/OtpChallenge";
import {
  generateOtp,
  generateOtpSalt,
  hashOtp,
  normalizeEmail,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_DELAY_MS,
  sendOtpEmail,
} from "../../lib/otp";

type SignupPayload = {
  name: string;
  email: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
  file?: File | null;
};

async function parseSignupPayload(req: Request): Promise<SignupPayload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      securityQuestion: String(form.get("securityQuestion") || ""),
      securityAnswer: String(form.get("securityAnswer") || ""),
      file: (form.get("file") as File | null) ?? null,
    };
  }

  const json = await req.json();
  return {
    name: String(json?.name || ""),
    email: String(json?.email || ""),
    password: String(json?.password || ""),
    securityQuestion: String(json?.securityQuestion || ""),
    securityAnswer: String(json?.securityAnswer || ""),
  };
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, password, securityQuestion, securityAnswer, file } =
      await parseSignupPayload(req);
    const normalizedEmail = normalizeEmail(email);
    const validQuestions = new Set(["favoritePet", "favoriteColor", "nickname"]);

    if (
      !name ||
      !normalizedEmail ||
      !password ||
      !securityQuestion ||
      !securityAnswer
    ) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    if (!validQuestions.has(String(securityQuestion))) {
      return NextResponse.json({ error: "Invalid security question" }, { status: 400 });
    }

    // Check existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let avatarUrl = "";
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadResult = (await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "avatars", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      })) as { secure_url?: string };

      avatarUrl = uploadResult.secure_url || "";
    }

    await OtpChallenge.updateMany(
      { email: normalizedEmail, purpose: "registration", usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    const otp = generateOtp();
    const salt = generateOtpSalt();
    const challenge = await OtpChallenge.create({
      email: normalizedEmail,
      purpose: "registration",
      otpHash: hashOtp(otp, salt),
      otpSalt: salt,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      resendCount: 0,
      resendAvailableAt: new Date(Date.now() + OTP_RESEND_DELAY_MS),
      registration: {
        name: name.trim(),
        passwordHash: hashedPassword,
        avatar: avatarUrl,
        securityQuestion,
        securityAnswer: String(securityAnswer).trim().toLowerCase(),
      },
    });

    try {
      await sendOtpEmail({ email: normalizedEmail, otp, purpose: "registration" });
    } catch (error) {
      await OtpChallenge.findByIdAndDelete(challenge._id);
      throw error;
    }

    return NextResponse.json(
      {
        message: "Verification code sent",
        challengeId: challenge.id,
        resendAfter: 60,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
