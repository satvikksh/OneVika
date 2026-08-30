import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";
import mongoose from "mongoose";
import Post from "@/app/models/Post";

const { ObjectId } = mongoose.Types;

interface UserProfile {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  isPrivate?: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: Date | string | null;
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  status?: string;
  cover?: string;
  profession?: string;
  headline?: string;
  company?: string;
  education?: string;
  resume?: string;
  portfolio?: string;
  skills?: unknown[];
  experiences?: unknown[];
  experience?: unknown[];
  educationHistory?: unknown[];
  educations?: unknown[];
  certifications?: unknown[];
  certificates?: unknown[];
  projects?: unknown[];
  achievements?: unknown[];
  languages?: unknown[];
  interests?: string[];
  recommendations?: unknown[];
  profileViews?: number;
  connectionsCount?: number;
  username?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
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

type PremiumStatus = {
  isPremium?: boolean;
  premiumExpiresAt?: Date | string | null;
};

function isSafeStoredImageUrl(value: unknown) {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
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

    // Check if this profile follows current user
    const followsYou = await db.collection("follows").findOne({
      followerId: profileObjectId,
      followingId: currentUserObjectId,
      status: "active"
    });

    const isMutualFollow = !!isFollowing && !!followsYou;

    const currentUser = await db.collection("users").findOne(
      { _id: currentUserObjectId },
      { projection: { isPremium: 1, premiumExpiresAt: 1 } }
    );
    const viewerPremiumActive = isPremiumActive(currentUser as PremiumStatus | null);
    const profilePremiumActive = isPremiumActive(userProfile as PremiumStatus);

    const isCurrentUser = profileId === currentUserId;
    const isPrivateProfile = Boolean(userProfile.isPrivate);
    const hasActiveFollowRelationship = Boolean(isFollowing || followsYou);
    const canViewPosts =
      isCurrentUser ||
      !isPrivateProfile ||
      isMutualFollow ||
      (viewerPremiumActive && isPrivateProfile && !profilePremiumActive);
    const canMessage =
      !isCurrentUser && (isPrivateProfile ? Boolean(isFollowing) : hasActiveFollowRelationship);

    /* ---------------- FORMAT RESPONSE ---------------- */
    const formattedProfile = {
      id: userProfile._id.toString(),
      name: userProfile.name,
      username: userProfile.username,
      email: userProfile.email,
      avatar: userProfile.avatar,
      cover: userProfile.cover,
      bio: userProfile.bio,
      location: userProfile.location,
      phone: userProfile.phone,
      website: userProfile.website,
      status: userProfile.status,
      profession: userProfile.profession,
      headline: userProfile.headline,
      company: userProfile.company,
      education: userProfile.education,
      resume: userProfile.resume,
      portfolio: userProfile.portfolio,
      skills: userProfile.skills || [],
      experiences: userProfile.experiences || userProfile.experience || [],
      educationHistory: userProfile.educationHistory || userProfile.educations || [],
      certifications: userProfile.certifications || userProfile.certificates || [],
      projects: userProfile.projects || [],
      achievements: userProfile.achievements || [],
      languages: userProfile.languages || [],
      interests: userProfile.interests || [],
      recommendations: userProfile.recommendations || [],
      profileViews: userProfile.profileViews,
      connectionsCount: userProfile.connectionsCount,
      isVerified: Boolean(userProfile.isVerified || userProfile.emailVerified),
      joinedDate: userProfile.createdAt.toISOString(),
      lastSeen: userProfile.lastSeen ? userProfile.lastSeen.toISOString() : null,
      social: userProfile.social || {},
      isActive: userProfile.lastSeen ? 
        (Date.now() - new Date(userProfile.lastSeen).getTime()) < 5 * 60 * 1000 : false,
      createdAt: userProfile.createdAt.toISOString(),
      updatedAt: userProfile.updatedAt.toISOString(),
      isPrivate: isPrivateProfile,
      isPremium: profilePremiumActive,
      viewerPremiumActive,
      followersCount,
      followingCount,
      isFollowing: !!isFollowing,
      followsYou: !!followsYou,
      isMutualFollow,
      canMessage,
      canViewPosts,
      isCurrentUser
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

    const posts = canViewPosts
      ? await Post.find({ userId: profileObjectId, status: { $ne: "removed" } })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    return NextResponse.json({
      ...formattedProfile,
      posts,
      postsHidden: !canViewPosts,
    });


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
      'name', 'avatar', 'cover', 'bio', 'location', 'phone',
      'website', 'status', 'profession', 'headline', 'company',
      'education', 'resume', 'portfolio', 'social'
    ];

    // Filter updates to only include allowed fields
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if ((key === "avatar" || key === "cover") && !isSafeStoredImageUrl(value)) {
          return NextResponse.json(
            { error: "Invalid image. Please upload a valid image file." },
            { status: 400 }
          );
        }
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

export async function POST(
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

    if (
      !ObjectId.isValid(profileId) ||
      !ObjectId.isValid(currentUserId) ||
      profileId === currentUserId
    ) {
      return NextResponse.json(
        { error: "Invalid user selection" },
        { status: 400 }
      );
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const blockerId = new ObjectId(currentUserId);
    const blockedId = new ObjectId(profileId);

    await db.collection("blockedUsers").updateOne(
      { blockerId, blockedId },
      {
        $set: {
          blockerId,
          blockedId,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      blocked: true,
    });
  } catch (error) {
    console.error("BLOCK USER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to block user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!ObjectId.isValid(profileId) || !ObjectId.isValid(currentUserId)) {
      return NextResponse.json(
        { error: "Invalid user selection" },
        { status: 400 }
      );
    }

    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB not connected");
    }

    await db.collection("blockedUsers").deleteOne({
      blockerId: new ObjectId(currentUserId),
      blockedId: new ObjectId(profileId),
    });

    return NextResponse.json({
      success: true,
      blocked: false,
    });
  } catch (error) {
    console.error("UNBLOCK USER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to unblock user" },
      { status: 500 }
    );
  }
}
