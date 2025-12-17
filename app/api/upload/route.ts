import { NextResponse } from "next/server";
import cloudinary from "../../lib/cloudinary";

export async function POST(req: Request) {
  const { file } = await req.json();

  const upload = await cloudinary.uploader.upload(file, {
    folder: "profiles",
  });

  return NextResponse.json({ url: upload.secure_url });
}
