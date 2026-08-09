import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import cloudinary from "@/app/lib/cloudinary";
import { authOptions } from "@/app/lib/authOptions";

const { ObjectId } = mongoose.Types;
const VALID_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const VALID_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const MAX_COVER_SIZE = 8 * 1024 * 1024;

type UploadResult = {
  secure_url?: string;
  resource_type?: string;
};

function hasValidMagicBytes(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mime === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mime === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  if (mime === "image/avif") {
    return buffer.subarray(4, 12).toString("ascii").includes("ftypavif");
  }

  return false;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await context.params;
    if (session.user.id !== userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid profile selection" }, { status: 403 });
    }

    const formData = await req.formData();
    const kind = formData.get("kind");
    const file = formData.get("file");

    if ((kind !== "avatar" && kind !== "cover") || !(file instanceof File)) {
      return NextResponse.json({ error: "Invalid image. Please upload a valid image file." }, { status: 400 });
    }

    const maxSize = kind === "avatar" ? MAX_AVATAR_SIZE : MAX_COVER_SIZE;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (!VALID_IMAGE_TYPES.has(file.type) || !VALID_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Invalid image. Please upload a JPG, PNG, WebP, or AVIF file." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > maxSize) {
      return NextResponse.json(
        { error: `Image is too large. Please upload a file under ${Math.round(maxSize / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "Invalid image. Please upload a valid image file." }, { status: 400 });
    }

    const uploadResult = await new Promise<UploadResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: kind === "avatar" ? "avatars" : "profile-covers",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result || {});
          }
        )
        .end(buffer);
    });

    if (!uploadResult.secure_url || uploadResult.resource_type !== "image") {
      return NextResponse.json({ error: "Invalid image. Please upload a valid image file." }, { status: 400 });
    }

    return NextResponse.json({ url: uploadResult.secure_url });
  } catch (error) {
    console.error("PROFILE IMAGE UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: "Invalid image. Please upload a valid image file." },
      { status: 500 }
    );
  }
}
