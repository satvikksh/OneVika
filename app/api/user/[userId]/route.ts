import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

interface UserProfile {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  status?: string;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  social?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Get user ID from params */
    const { userId: profileId } = await context.params;
    const currentUserId = session.user.id;

    if (!profileId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    /* Validate MongoDB ObjectId */
    if (!ObjectId.isValid(profileId) || !ObjectId.isValid(currentUserId)) {
      return NextResponse.json(
        { error: "Invalid MongoDB user ID" },
        { status: 400 }
      );
    }

    /* ---------------- DB CONNECTION ---------------- */
    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const profileObjectId = new ObjectId(profileId);
    const currentUserObjectId = new ObjectId(currentUserId);

    /* ---------------- FETCH USER PROFILE ---------------- */
    const userProfile = await db.collection("users").findOne(
      { _id: profileObjectId },
      {
        projection: {
          password: 0,
          refreshToken: 0,
          emailVerified: 0,
          twoFactorSecret: 0,
          twoFactorEnabled: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
          verificationToken: 0,
        }
      }
    ) as UserProfile | null;

    if (!userProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* ---------------- FETCH FOLLOW DATA ---------------- */
    // Get followers count
    const followersCount = await db.collection("follows").countDocuments({
      followingId: profileObjectId,
      status: "active"
    });

    // Get following count
    const followingCount = await db.collection("follows").countDocuments({
      followerId: profileObjectId,
      status: "active"
    });

    // Check if current user is following this profile
    const isFollowing = await db.collection("follows").findOne({
      followerId: currentUserObjectId,
      followingId: profileObjectId,
      status: "active"
    });

    /* ---------------- FORMAT RESPONSE ---------------- */
    const formattedProfile = {
      id: userProfile._id.toString(),
      name: userProfile.name,
      email: userProfile.email,
      avatar: userProfile.avatar,
      bio: userProfile.bio,
      location: userProfile.location,
      phone: userProfile.phone,
      website: userProfile.website,
      status: userProfile.status,
      joinedDate: userProfile.createdAt.toISOString(),
      lastSeen: userProfile.lastSeen ? userProfile.lastSeen.toISOString() : null,
      social: userProfile.social || {},
      isActive: userProfile.lastSeen ? 
        (Date.now() - new Date(userProfile.lastSeen).getTime()) < 5 * 60 * 1000 : false,
      createdAt: userProfile.createdAt.toISOString(),
      updatedAt: userProfile.updatedAt.toISOString(),
      followersCount,
      followingCount,
      isFollowing: !!isFollowing,
      isCurrentUser: profileId === currentUserId
    };

    /* ---------------- CHECK IF CURRENT USER IS BLOCKED ---------------- */
    if (profileId !== currentUserId) {
      const blockedCheck = await db.collection("blockedUsers").findOne({
        $or: [
          { blockerId: profileObjectId, blockedId: currentUserObjectId },
          { blockerId: currentUserObjectId, blockedId: profileObjectId }
        ]
      });

      if (blockedCheck) {
        return NextResponse.json({
          ...formattedProfile,
          isBlocked: true,
          message: "This profile is restricted"
        });
      }
    }

    return NextResponse.json(formattedProfile);

  } catch (error) {
    console.error("FETCH USER PROFILE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

/* Optional: Update user profile (PATCH method) */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: profileId } = await context.params;
    const currentUserId = session.user.id;

    // Only allow users to update their own profile
    if (profileId !== currentUserId) {
      return NextResponse.json(
        { error: "You can only update your own profile" },
        { status: 403 }
      );
    }

    if (!ObjectId.isValid(profileId)) {
      return NextResponse.json(
        { error: "Invalid MongoDB user ID" },
        { status: 400 }
      );
    }

    const updates = await req.json();
    
    // Define allowed fields that can be updated
    const allowedUpdates = [
      'name', 'avatar', 'bio', 'location', 'phone', 
      'website', 'status', 'social'
    ];

    // Filter updates to only include allowed fields
    const filteredUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    // Add updatedAt timestamp
    filteredUpdates.updatedAt = new Date();

    await dbConnect();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(profileId) },
      { $set: filteredUpdates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      updatedFields: Object.keys(filteredUpdates)
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}