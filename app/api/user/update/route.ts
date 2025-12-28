export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import cloudinary from "@/app/lib/cloudinary";
import { dbConnect } from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const name = formData.get("name") as string | null;
    const bio = formData.get("bio") as string | null;
    const isPrivate = formData.get("isPrivate") === "true";
    const removeAvatar = formData.get("removeAvatar") === "true";
    const file = formData.get("file") as File | null;

    // ✅ Update text fields FIRST (SAFE)
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        ...(name !== null && { name }),
        ...(bio !== null && { bio }),
        isPrivate,
        ...(removeAvatar && { avatar: "" }),
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Upload avatar SECOND (ONLY IF PRESENT)
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadResult: any = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "avatars", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      user.avatar = uploadResult.secure_url;
      await user.save();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    return NextResponse.json(
      { error: "Profile update failed" },
      { status: 500 }
    );
  }
}
