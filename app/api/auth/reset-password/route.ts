import User from "../../../models/User";
import { dbConnect } from "../../../lib/mongodb";
import { OTPStore } from "../../../lib/otpStore";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const { email, otp, pass } = await req.json();
  await dbConnect();

  const record = OTPStore[email];
  if (!record || record.otp !== otp)
    return new Response("Invalid OTP", { status: 400 });

  const hashed = await hash(pass, 10);

  await User.updateOne({ email }, { password: hashed });

  delete OTPStore[email]; // remove OTP

  return new Response("Password updated", { status: 200 });
}
