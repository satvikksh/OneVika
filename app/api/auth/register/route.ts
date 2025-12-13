import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    await connectDB();

    const userExists = await User.findOne({ email });
    if (userExists) {
      return new Response(JSON.stringify({ error: "User already exists" }), { status: 400 });
    }

    const hashedPassword = await hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: name[0].toUpperCase(),
    });

    return new Response(JSON.stringify({ message: "User created" }), { status: 201 });
  } catch {
    return new Response(JSON.stringify({error: "Error creating user" }), { status: 500 });
  }
}
