export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import Project, { PROJECT_STATUSES, ProjectStatus } from "@/app/models/Project";
import { rejectIfInactive } from "@/app/lib/user-status";

type FollowRow = {
  followerId?: mongoose.Types.ObjectId;
  followingId?: mongoose.Types.ObjectId;
};

type ProjectUser = {
  _id?: mongoose.Types.ObjectId | string;
  name?: string;
  email?: string;
  image?: string;
  avatar?: string;
};

type ProjectDocumentShape = {
  _id: mongoose.Types.ObjectId;
  userId: ProjectUser | mongoose.Types.ObjectId | string;
  title: string;
  tagline?: string;
  category?: string;
  description: string;
  status: ProjectStatus;
  progress?: number;
  techStack?: string[];
  highlights?: string[];
  githubUrl?: string;
  liveUrl?: string;
  duration?: string;
  teamSize?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

const toProjectResponse = (project: ProjectDocumentShape) => {
  const user = project.userId as ProjectUser;

  return {
    id: project._id.toString(),
    title: project.title,
    tagline: project.tagline || "",
    category: project.category || "General",
    description: project.description,
    status: project.status,
    progress: project.progress ?? 0,
    techStack: Array.isArray(project.techStack) ? project.techStack : [],
    highlights: Array.isArray(project.highlights) ? project.highlights : [],
    githubUrl: project.githubUrl || "",
    liveUrl: project.liveUrl || "",
    duration: project.duration || "",
    teamSize: project.teamSize ?? 1,
    createdAt: project.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: project.updatedAt?.toISOString?.() || new Date().toISOString(),
    user: {
      id:
        typeof user?._id === "string"
          ? user._id
          : user?._id?.toString?.() || "",
      name: user?.name || "Unknown User",
      email: user?.email || "",
      avatar: user?.avatar || user?.image || "",
    },
  };
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUserId = new mongoose.Types.ObjectId(session.user.id);
    const db = mongoose.connection.db;
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "all";
    const search = searchParams.get("search")?.trim() || "";

    if (!db) {
      throw new Error("MongoDB not connected");
    }

    const currentUser = await db.collection("users").findOne(
      { _id: currentUserId },
      { projection: { isPremium: 1 } }
    );
    const isPremium = Boolean(currentUser?.isPremium);

    const [iFollowRows, followsMeRows] = await Promise.all([
      db
        .collection("follows")
        .find(
          { followerId: currentUserId, status: "active" },
          { projection: { followingId: 1 } }
        )
        .toArray() as Promise<FollowRow[]>,
      db
        .collection("follows")
        .find(
          { followingId: currentUserId, status: "active" },
          { projection: { followerId: 1 } }
        )
        .toArray() as Promise<FollowRow[]>,
    ]);

    const followingSet = new Set(
      iFollowRows
        .map((row) => row.followingId?.toString?.())
        .filter((value): value is string => Boolean(value))
    );

    const mutualUserIds = followsMeRows
      .map((row) => row.followerId?.toString?.())
      .filter((value): value is string => Boolean(value) && followingSet.has(value));

    let allowedOtherUserIds: string[] = [];

    if (isPremium) {
      const premiumUsers = await db
        .collection("users")
        .find(
          {
            _id: { $ne: currentUserId },
            ...(search ? { name: { $regex: search, $options: "i" } } : {}),
          },
          { projection: { _id: 1 } }
        )
        .toArray() as Array<{ _id: mongoose.Types.ObjectId }>;

      allowedOtherUserIds = premiumUsers.map((user) => user._id.toString());
    } else {
      allowedOtherUserIds = mutualUserIds;

      if (search) {
        const searchedUsers = await db
          .collection("users")
          .find(
            {
              _id: {
                $in: allowedOtherUserIds.map((id) => new mongoose.Types.ObjectId(id)),
              },
              name: { $regex: search, $options: "i" },
            },
            { projection: { _id: 1 } }
          )
          .toArray() as Array<{ _id: mongoose.Types.ObjectId }>;

        allowedOtherUserIds = searchedUsers.map((user) => user._id.toString());
      }
    }

    const [ownProjects, otherProjects] = await Promise.all([
      Project.find({ userId: currentUserId })
        .populate("userId", "name email image avatar")
        .sort({ createdAt: -1 })
        .lean<ProjectDocumentShape[]>(),
      allowedOtherUserIds.length > 0
        ? Project.find({
            userId: {
              $in: allowedOtherUserIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          })
            .populate("userId", "name email image avatar")
            .sort({ createdAt: -1 })
            .lean<ProjectDocumentShape[]>()
        : Promise.resolve([]),
    ]);

    const responsePayload = {
      ownProjects: ownProjects.map(toProjectResponse),
      otherProjects: otherProjects.map(toProjectResponse),
      isPremium,
    };

    if (scope === "own") {
      return NextResponse.json({
        projects: responsePayload.ownProjects,
        isPremium,
      });
    }

    if (scope === "other") {
      return NextResponse.json({
        projects: responsePayload.otherProjects,
        isPremium,
      });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("PROJECTS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json({ error: inactiveReason }, { status: 403 });
    }

    const body = await req.json();

    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const tagline = String(body?.tagline || "").trim();
    const category = String(body?.category || "").trim() || "General";
    const status = String(body?.status || "active").trim() as ProjectStatus;
    const progress = Number(body?.progress ?? 0);
    const githubUrl = String(body?.githubUrl || "").trim();
    const liveUrl = String(body?.liveUrl || "").trim();
    const duration = String(body?.duration || "").trim();
    const teamSize = Math.max(1, Number(body?.teamSize ?? 1));
    const techStack = Array.isArray(body?.techStack)
      ? body.techStack
          .map((item: unknown) => String(item || "").trim())
          .filter(Boolean)
      : [];
    const highlights = Array.isArray(body?.highlights)
      ? body.highlights
          .map((item: unknown) => String(item || "").trim())
          .filter(Boolean)
      : [];

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    if (!(PROJECT_STATUSES as string[]).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.create({
      userId: session.user.id,
      title,
      tagline,
      category,
      description,
      status,
      progress: Number.isFinite(progress)
        ? Math.min(100, Math.max(0, progress))
        : 0,
      githubUrl,
      liveUrl,
      duration,
      teamSize,
      techStack,
      highlights,
    });

    const populated = await project.populate("userId", "name email image avatar");

    return NextResponse.json({ project: toProjectResponse(populated.toObject()) }, { status: 201 });
  } catch (error) {
    console.error("PROJECTS POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
