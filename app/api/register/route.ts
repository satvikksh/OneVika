import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "../../models/User";
import { dbConnect } from "../../lib/mongodb";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, password, securityQuestion, securityAnswer } =
      await req.json();
    const validQuestions = new Set(["favoritePet", "favoriteColor", "nickname"]);

    if (
      !name ||
      !email ||
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create({
      name,
      email,
      password: hashedPassword,
      favoritePet:
        securityQuestion === "favoritePet"
          ? String(securityAnswer).trim().toLowerCase()
          : "",
      favoriteColor:
        securityQuestion === "favoriteColor"
          ? String(securityAnswer).trim().toLowerCase()
          : "",
      nickname:
        securityQuestion === "nickname"
          ? String(securityAnswer).trim().toLowerCase()
          : "",
    });

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
