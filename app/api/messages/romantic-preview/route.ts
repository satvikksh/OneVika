export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { OpenRouterError, createOpenRouterCompletion } from "@/app/lib/ai";

const MAX_INPUT_LENGTH = 2000;

function getProviderErrorResponse(error: unknown) {
  if (error instanceof OpenRouterError) {
    switch (error.status) {
      case 401:
      case 503:
        return {
          error: "AI preview is not configured on this server.",
          status: 503,
        };
      case 429:
        return {
          error: "AI preview is busy right now. Please try again in a moment.",
          status: 429,
        };
      case 504:
        return {
          error: "AI preview timed out. Please try again.",
          status: 504,
        };
      default:
        return null;
    }
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

    const enhancedText = await createOpenRouterCompletion({
      messages: [
        {
          role: "system",
          content:
            "Rewrite the user's message into affectionate, expressive, thoughtful, natural polished language. Preserve the exact meaning, intent, names, facts, promises, boundaries, and language where possible. Do not add pressure, sexual content, manipulation, or new commitments. Return only the rewritten message.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.75,
      maxTokens: 500,
    });

    if (!enhancedText) {
      return NextResponse.json(
        { error: "Unable to enhance this message right now" },
        { status: 502 }
      );
    }

    return NextResponse.json({ enhancedText });
  } catch (error) {
    console.error("[Polished Mode] Preview generation failed:", error);

    const providerErrorResponse = getProviderErrorResponse(error);
    if (providerErrorResponse) {
      return NextResponse.json(
        { error: providerErrorResponse.error },
        { status: providerErrorResponse.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate polished preview" },
      { status: 500 }
    );
  }
}
