export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "../../models/User";
import { dbConnect } from "../../lib/mongodb";
import cloudinary from "../../lib/cloudinary";

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

    // Create user
    await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: avatarUrl,
      image: avatarUrl,
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
