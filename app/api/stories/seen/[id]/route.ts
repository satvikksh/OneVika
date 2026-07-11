import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../lib/mongodb';
import Story from '../../../../models/Story';
import User from '../../../../models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/authOptions';
import mongoose from 'mongoose';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 🔥 THIS IS THE CRITICAL FIX
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Invalid story id' }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid story id' }, { status: 400 });
  }

  const story = await Story.findOne({
    _id: id,
    expiresAt: { $gt: new Date() },
  }).select("_id userId");

  if (!story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  if (story.userId.toString() === session.user.id) {
    return NextResponse.json({ success: true, skippedOwner: true });
  }

  const user = await User.findById(session.user.id)
    .select("name email image avatar")
    .lean<{
      name?: string;
      email?: string;
      image?: string;
      avatar?: string;
    } | null>();

  const viewedAt = new Date();
  const viewerName = user?.name || session.user.name || "Unknown";
  const viewerUsername =
    user?.email?.split("@")[0] ||
    session.user.email?.split("@")[0] ||
    viewerName;
  const viewerProfilePicture =
    user?.image || user?.avatar || session.user.image || "";

  await Story.findByIdAndUpdate(id, {
    $addToSet: { viewers: new mongoose.Types.ObjectId(session.user.id) },
    $pull: { viewerDetails: { viewerId: new mongoose.Types.ObjectId(session.user.id) } },
  });

  await Story.findByIdAndUpdate(
    id,
    {
      $push: {
        viewerDetails: {
          $each: [
            {
              viewerId: new mongoose.Types.ObjectId(session.user.id),
              viewerName,
              viewerUsername,
              viewerProfilePicture,
              viewedAt,
            },
          ],
          $position: 0,
        },
      },
    },
    { new: true }
  );

  return NextResponse.json({ success: true });
}
