import { OTPStore } from "../../../lib/otpStore";
import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";

export async function POST(req: Request) {
  const { email, securityQuestion, securityAnswer } = await req.json();
  await dbConnect();

  if (!email || !securityQuestion || !securityAnswer) {
    return new Response("Email, security question, and answer are required", { status: 400 });
  }

  const validQuestions = new Set(["favoritePet", "favoriteColor", "nickname"]);
  if (!validQuestions.has(String(securityQuestion))) {
    return new Response("Invalid security question", { status: 400 });
  }

  const normalize = (value: string) => value.trim().toLowerCase();
  const normalizedEmail = normalize(String(email));
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return new Response("Invalid Email", { status: 400 });

  const answerKey = String(securityQuestion) as "favoritePet" | "favoriteColor" | "nickname";
  const storedAnswer = normalize(String(user[answerKey] || ""));
  const submittedAnswer = normalize(String(securityAnswer));
  const isValidSecurityAnswer = storedAnswer !== "" && storedAnswer === submittedAnswer;

  if (!isValidSecurityAnswer) {
    return new Response("Security answers do not match", { status: 400 });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  OTPStore[normalizedEmail] = {
    otp,
    expires: Date.now() + 10 * 60 * 1000, // 10 mins
  };

  return new Response(JSON.stringify({ otp }), { status: 200 });
}
