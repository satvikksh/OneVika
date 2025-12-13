import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = Date.now() + "-" + file.name;
  const filepath = path.join(process.cwd(), "public/uploads/avatars", filename);

  fs.writeFileSync(filepath, buffer);

  return NextResponse.json({ url: `/uploads/avatars/${filename}` });
}
