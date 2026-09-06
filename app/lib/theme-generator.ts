import { createOpenRouterCompletion } from "./ai";
import type { IUITheme } from "@/app/models/User";

export async function generateAITheme(): Promise<IUITheme> {
  const prompt = `
Generate a unique modern dark UI theme for a premium social app.

Return STRICT JSON only in this format:

{
  "background": "#hexcolor",
  "card": "#hexcolor",
  "accent": "#hexcolor",
  "text": "#hexcolor",
  "radius": "px value between 12px and 32px"
}

Rules:
- Dark theme only
- Background must be very dark
- Accent must be vibrant
- No explanations
`;

  const raw = await createOpenRouterCompletion({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    maxTokens: 600,
  });

  try {
    return JSON.parse(raw) as IUITheme;
  } catch {
    throw new Error("AI theme parsing failed");
  }
}