import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";
import { OTPStore } from "../../../lib/otpStore";
import { hash } from "bcryptjs";

type SecurityKey = "favoritePet" | "favoriteColor" | "nickname";

export async function POST(req: Request) {
  const { email, otp, pass, securityQuestion, securityAnswer } = await req.json();
  await dbConnect();

  const normalize = (value: string) => value.trim().toLowerCase();
  const normalizedEmail = normalize(String(email || ""));

  if (!normalizedEmail || !pass) {
    return new Response("Email and new password are required", { status: 400 });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return new Response("Invalid Email", { status: 400 });
  }

  if (otp) {
    const record = OTPStore[normalizedEmail];
    if (!record || record.otp !== otp)
      return new Response("Invalid OTP", { status: 400 });
    if (record.expires < Date.now())
      return new Response("OTP expired", { status: 400 });

    delete OTPStore[normalizedEmail];
  } else {
    const validQuestions = new Set(["favoritePet", "favoriteColor", "nickname"]);
    if (!securityQuestion || !securityAnswer) {
      return new Response("Security question and answer are required", {
        status: 400,
      });
    }

    if (!validQuestions.has(String(securityQuestion))) {
      return new Response("Invalid security question", { status: 400 });
    }

    const answerKey = String(securityQuestion) as SecurityKey;
    const storedAnswer = normalize(String(user[answerKey] || ""));
    const submittedAnswer = normalize(String(securityAnswer));

    if (!storedAnswer || storedAnswer !== submittedAnswer) {
      return new Response("Security answer does not match", { status: 400 });
    }
  }

  const hashed = await hash(pass, 10);
  await User.updateOne({ email: normalizedEmail }, { password: hashed });

  return new Response("Password updated", { status: 200 });
}
