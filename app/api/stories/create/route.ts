import { NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Story from '../../../models/Story';
import Notification from '../../../models/Notification';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authOptions';
import cloudinary from '../../../lib/cloudinary';
import mongoose from "mongoose";
import { emitRealtimeNotification } from '../../../lib/socketServerEmitter';
import { rejectIfInactive } from '../../../lib/user-status';

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

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json(
        { error: inactiveReason },
        { status: 403 }
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

    const db = mongoose.connection.db;
    if (db) {
      const followerRows = await db.collection("follows")
        .find({
          followingId: new mongoose.Types.ObjectId(session.user.id),
          status: "active",
        })
        .project({ followerId: 1 })
        .toArray();

      const followers = followerRows
        .map((row: any) => row.followerId?.toString?.())
        .filter(Boolean) as string[];

      if (followers.length > 0) {
        const createdAt = new Date();
        const storyMessage = `${session.user.name ?? "Someone"} added a new story`;
        const notifications = followers.map((followerId) => ({
          userId: new mongoose.Types.ObjectId(followerId),
          senderId: new mongoose.Types.ObjectId(session.user.id),
          type: "story" as const,
          message: storyMessage,
          isRead: false,
          createdAt,
          updatedAt: createdAt,
        }));

        await Notification.insertMany(notifications, { ordered: false });

        await Promise.all(
          followers.map((followerId) =>
            emitRealtimeNotification(followerId, {
              title: "New Story",
              message: storyMessage,
              senderId: session.user.id,
              url: "/feed",
              createdAt,
              type: "story",
              isRead: false,
            })
          )
        );
      }
    }

    return NextResponse.json(story, { status: 201 });
  } catch (err) {
    console.error('STORY CREATE ERROR:', err);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}
