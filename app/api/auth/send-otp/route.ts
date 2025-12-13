import { OTPStore } from "../../../lib/otpStore";
import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";

export async function POST(req: Request) {
  const { email } = await req.json();
  await connectDB();

  const user = await User.findOne({ email });
  if (!user) return new Response("Invalid Email", { status: 400 });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  OTPStore[email] = {
    otp,
    expires: Date.now() + 10 * 60 * 1000, // 10 mins
  };

  return new Response(JSON.stringify({ otp }), { status: 200 });
}
