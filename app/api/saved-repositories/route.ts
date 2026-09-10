import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { dbConnect } from "@/app/lib/mongodb";
import { rejectIfInactive } from "@/app/lib/user-status";
import SavedRepository, {
  ISavedRepository,
} from "@/app/models/SavedRepository";

export const runtime = "nodejs";

type SavedRepositoryPayload = {
  githubRepositoryId?: unknown;
  name?: unknown;
  fullName?: unknown;
  ownerLogin?: unknown;
  ownerAvatar?: unknown;
  description?: unknown;
  htmlUrl?: unknown;
  language?: unknown;
  stars?: unknown;
  forks?: unknown;
  topics?: unknown;
};

function toSavedRepositoryResponse(doc: ISavedRepository) {
  return {
    id: doc._id.toString(),
    githubRepositoryId: doc.githubRepositoryId,
    name: doc.name,
    fullName: doc.fullName,
    ownerLogin: doc.ownerLogin,
    ownerAvatar: doc.ownerAvatar || "",
    description: doc.description || "",
    htmlUrl: doc.htmlUrl,
    language: doc.language || "",
    stars: doc.stars ?? 0,
    forks: doc.forks ?? 0,
    topics: Array.isArray(doc.topics) ? doc.topics : [],
    savedAt: doc.savedAt?.toISOString?.() || doc.createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

/**
 * GET /api/saved-repositories
 * Lists the current user's saved GitHub repositories (newest first). Scoped to
 * the authenticated user only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const docs = await SavedRepository.find({ userId: session.user.id })
      .sort({ savedAt: -1 })
      .lean<ISavedRepository[]>();

    return NextResponse.json({
      repositories: docs.map(toSavedRepositoryResponse),
    });
  } catch (error) {
    console.error("SAVED REPOS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load saved repositories." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-repositories
 * Saves a GitHub repository's metadata to the authenticated user's account.
 * Duplicate saves for the same (user, githubRepositoryId) are prevented by
 * the unique index and short-circuited here.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inactiveReason = await rejectIfInactive(session.user.id);
    if (inactiveReason) {
      return NextResponse.json({ error: inactiveReason }, { status: 403 });
    }

    const body = (await req.json()) as SavedRepositoryPayload;

    const githubRepositoryId = String(body?.githubRepositoryId || "").trim();
    const name = String(body?.name || "").trim();
    const fullName = String(body?.fullName || "").trim();
    const ownerLogin = String(body?.ownerLogin || "").trim();
    const htmlUrl = String(body?.htmlUrl || "").trim();
    const ownerAvatar = String(body?.ownerAvatar || "").trim();
    const description = String(body?.description || "").trim();
    const language = String(body?.language || "").trim();
    const stars = Math.max(0, Number(body?.stars) || 0);
    const forks = Math.max(0, Number(body?.forks) || 0);
    const topics = Array.isArray(body?.topics)
      ? body.topics
          .map((topic: unknown) => String(topic || "").trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    if (!githubRepositoryId || !name || !ownerLogin || !htmlUrl) {
      return NextResponse.json(
        { error: "Invalid repository details." },
        { status: 400 }
      );
    }

    if (!/^https:\/\/github\.com\//i.test(htmlUrl)) {
      return NextResponse.json(
        { error: "Invalid repository URL." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Idempotent save: never create a second entry for the same repo.
    const existing = await SavedRepository.findOne({
      userId: session.user.id,
      githubRepositoryId,
    });

    if (existing) {
      return NextResponse.json({
        saved: true,
        alreadySaved: true,
        repository: toSavedRepositoryResponse(existing),
      });
    }

    let saved: ISavedRepository;
    try {
      saved = await SavedRepository.create({
        userId: session.user.id,
        githubRepositoryId,
        name,
        fullName: fullName || name,
        ownerLogin,
        ownerAvatar,
        description,
        htmlUrl,
        language,
        stars,
        forks,
        topics,
        savedAt: new Date(),
      });
    } catch (error) {
      // Race between the findOne and create: the unique index wins — reuse.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        const raced = await SavedRepository.findOne({
          userId: session.user.id,
          githubRepositoryId,
        });
        if (raced) {
          return NextResponse.json({
            saved: true,
            alreadySaved: true,
            repository: toSavedRepositoryResponse(raced),
          });
        }
      }
      throw error;
    }

    return NextResponse.json(
      {
        saved: true,
        alreadySaved: false,
        repository: toSavedRepositoryResponse(saved),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SAVED REPOS POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to save the repository. Please try again." },
      { status: 500 }
    );
  }
}