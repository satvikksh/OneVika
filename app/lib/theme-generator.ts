import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateAITheme() {
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
  });

  const raw = completion.choices[0].message.content || "{}";

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("AI theme parsing failed");
  }
}
