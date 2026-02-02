import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { dbConnect } from "../../../lib/mongodb";
import Story from "../../../models/Story";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("media") as File;

  if (!file) {
    return new Response("No file", { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(uploadDir, filename);

  fs.writeFileSync(filepath, buffer);

  await Story.create({
    userId: session.user.id, // ✅ FINAL ANSWER
    mediaUrl: `/uploads/${filename}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return Response.json({ success: true });
}
