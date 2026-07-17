export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/app/lib/authOptions";
import { getNativeDb } from "@/app/lib/mongodb";
import { isPremiumActive } from "@/app/lib/premium";

const { ObjectId } = mongoose.Types;

type UserPremiumDoc = {
  isPremium?: boolean;
  premiumExpiresAt?: Date | string | null;
};

type OpenRouterMessage = {
  role: "system" | "user";
  content: string;
};

const OPENROUTER_BASE_URL = (
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
)
  .replace(/\/+$/, "")
  .replace(/\/chat\/completions\/?$/, "");

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash:free";

const OPENROUTER_FALLBACK_MODELS = (
  process.env.OPENROUTER_FALLBACK_MODELS || "cohere/north-mini-code:free"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const OPENROUTER_MODELS = Array.from(
  new Set([OPENROUTER_MODEL, ...OPENROUTER_FALLBACK_MODELS])
);

const DAILY_LIMIT = Number(process.env.POLISHED_CHAT_DAILY_LIMIT || "100");
const MAX_INPUT_CHARS = Number(process.env.POLISHED_CHAT_MAX_INPUT_CHARS || "2400");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getDayKey = () => new Date().toISOString().slice(0, 10);

const isRetryableStatus = (status: number) =>
  status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;

async function callOpenRouter(messages: OpenRouterMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  let lastError: Error | null = null;

  for (const model of OPENROUTER_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              process.env.NEXT_PUBLIC_BASE_URL ||
              process.env.NEXTAUTH_URL ||
              "http://localhost:3000",
            "X-OpenRouter-Title":
              process.env.OPENROUTER_APP_TITLE || "OrbitByte",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 360,
            temperature: 0.65,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            data?.error?.message ||
            data?.message ||
            `OpenRouter API error ${response.status}`;
          const error = new Error(message);
          lastError = error;

          if (isRetryableStatus(response.status) && attempt < 2) {
            await sleep(response.status === 429 ? 900 : 350);
            continue;
          }

          if (isRetryableStatus(response.status)) {
            break;
          }

          throw error;
        }

        const enhancedText =
          data?.choices?.[0]?.message?.content?.toString?.().trim() || "";

        if (!enhancedText) {
          throw new Error("OpenRouter returned an empty enhancement.");
        }

        return {
          enhancedText,
          model,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < 2) {
          await sleep(350);
          continue;
        }
      }
    }
  }

  throw lastError || new Error("OpenRouter enhancement failed.");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const originalText = body?.text?.toString?.().trim() || "";

    if (!originalText) {
      return NextResponse.json(
        { error: "Message text is required." },
        { status: 400 }
      );
    }

    if (originalText.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Polished Chat supports up to ${MAX_INPUT_CHARS} characters.` },
        { status: 413 }
      );
    }

    const db = await getNativeDb();
    const userId = new ObjectId(session.user.id);
    const user = await db.collection<UserPremiumDoc>("users").findOne(
      { _id: userId },
      { projection: { isPremium: 1, premiumExpiresAt: 1 } }
    );

    if (!isPremiumActive(user)) {
      return NextResponse.json(
        {
          error: "Polished Chat is a Premium feature.",
          code: "PREMIUM_REQUIRED",
        },
        { status: 402 }
      );
    }

    const now = new Date();
    const usageResult = await db.collection("polishedChatUsage").findOneAndUpdate(
      { userId, day: getDayKey() },
      {
        $inc: { count: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { userId, day: getDayKey(), createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    const usageCount = Number(usageResult?.count || 0);

    if (usageCount > DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: "Daily Polished Chat limit reached. Try again tomorrow.",
          retryable: false,
        },
        { status: 429 }
      );
    }

    const messages: OpenRouterMessage[] = [
      {
        role: "system",
        content:
          "You refine user-written chat messages. Improve grammar, clarity, tone, engagement, readability, emotional intelligence, and professionalism. Preserve the user's original meaning, intent, context, language, and approximate length. Do not add claims, promises, facts, emojis, questions, or emotional intensity that the user did not imply. Return only the enhanced message text.",
      },
      {
        role: "user",
        content: `Original message:\n${originalText}`,
      },
    ];

    const result = await callOpenRouter(messages);

    await db.collection("polishedChatUsageEvents").insertOne({
      userId,
      day: getDayKey(),
      inputChars: originalText.length,
      outputChars: result.enhancedText.length,
      model: result.model,
      createdAt: now,
    });

    return NextResponse.json({
      enhancedText: result.enhancedText,
      model: result.model,
      usage: {
        count: usageCount,
        limit: DAILY_LIMIT,
      },
    });
  } catch (error) {
    console.error("[Polished Chat] Preview failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate polished preview.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
