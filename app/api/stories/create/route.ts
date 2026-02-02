import { NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Story from '../../../models/Story';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import cloudinary from '../../../lib/cloudinary';

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* 1️⃣ AUTH REQUIRED */
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    /* 2️⃣ READ FORM DATA */
    const formData = await req.formData();
    const file = formData.get('media') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Media file required' },
        { status: 400 }
      );
    }

    /* 3️⃣ CONVERT FILE → BUFFER */
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /* 4️⃣ UPLOAD TO CLOUDINARY */
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'stories',
          resource_type: 'auto', // image / video
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    /* 5️⃣ SAVE STORY IN DB */
    const story = await Story.create({
      userId: session.user.id,
      mediaUrl: uploadResult.secure_url, // ✅ IMPORTANT
      mediaType: uploadResult.resource_type === 'video' ? 'video' : 'image',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // ⏱️ 24h
      viewers: [],
    });

    return NextResponse.json(story, { status: 201 });
  } catch (err) {
    console.error('STORY CREATE ERROR:', err);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}
