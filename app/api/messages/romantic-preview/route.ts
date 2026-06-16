export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getOpenAIClient } from "@/app/lib/ai";

const MAX_INPUT_LENGTH = 2000;

function getOpenAIErrorResponse(error: unknown) {
  const openAIError = error as {
    status?: number;
    code?: string | null;
    type?: string | null;
    message?: string;
    error?: {
      code?: string | null;
      type?: string | null;
      message?: string;
    };
  };

  const status = openAIError.status;
  const code = openAIError.code ?? openAIError.error?.code;
  const type = openAIError.type ?? openAIError.error?.type;

  if (code === "insufficient_quota") {
    return {
      error:
        "AI quota exhausted. Please check the OpenAI billing/quota for this project.",
      status: 402,
    };
  }

  if (status === 429 || type === "rate_limit_exceeded") {
    return {
      error: "AI preview is busy right now. Please try again in a moment.",
      status: 429,
    };
  }

  if (
    error instanceof Error &&
    error.message === "OPENAI_API_KEY is not configured"
  ) {
    return {
      error: "AI preview is not configured on this server.",
      status: 503,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? "").toString().trim();
    const chatType = body?.chatType === "group" ? "group" : "direct";

    if (chatType === "group") {
      return NextResponse.json(
        { error: "Polished Mode is only available in personal chats" },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_INPUT_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: process.env.POLISHED_MODE_MODEL || "gpt-4o-mini",
      temperature: 0.75,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "Rewrite the user's message into affectionate, expressive, thoughtful, natural polished language. Preserve the exact meaning, intent, names, facts, promises, boundaries, and language where possible. Do not add pressure, sexual content, manipulation, or new commitments. Return only the rewritten message.",
        },
        { role: "user", content: text },
      ],
    });

    const enhancedText = completion.choices[0]?.message?.content?.trim();

    if (!enhancedText) {
      return NextResponse.json(
        { error: "Unable to enhance this message right now" },
        { status: 502 }
      );
    }

    return NextResponse.json({ enhancedText });
  } catch (error) {
    console.error("[Polished Mode] Preview generation failed:", error);

    const openAIErrorResponse = getOpenAIErrorResponse(error);
    if (openAIErrorResponse) {
      return NextResponse.json(
        { error: openAIErrorResponse.error },
        { status: openAIErrorResponse.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate polished preview" },
      { status: 500 }
    );
  }
}
