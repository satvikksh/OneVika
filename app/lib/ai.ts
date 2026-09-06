export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export class OpenRouterError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

const normalizeBaseUrl = (raw: string | undefined) =>
  (raw || DEFAULT_BASE_URL)
    .replace(/\/chat\/completions\/?$/, "")
    .replace(/\/+$/, "");

export async function createOpenRouterCompletion(options: {
  messages: OpenRouterMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not configured on this server.",
      503
    );
  }

  const baseUrl = normalizeBaseUrl(process.env.OPENROUTER_BASE_URL);
  const model = options.model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const timeoutMs = Math.max(
    Number(process.env.OPENROUTER_TIMEOUT_MS || "60000"),
    10000
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          ...(options.temperature !== undefined
            ? { temperature: options.temperature }
            : {}),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new OpenRouterError("AI provider timed out.", 504);
      }
      throw new OpenRouterError("Unable to reach the AI provider.", 502);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      let detail = bodyText;
      try {
        const parsed = JSON.parse(bodyText) as {
          error?: { message?: string };
        };
        detail = parsed.error?.message || bodyText;
      } catch {
        // keep raw body text as the detail
      }

      if (response.status === 401 || response.status === 403) {
        throw new OpenRouterError("Invalid AI provider API key.", 401);
      }
      if (response.status === 429) {
        throw new OpenRouterError("AI provider rate limit reached.", 429);
      }
      if (response.status === 404) {
        throw new OpenRouterError("The configured AI model is invalid.", 502);
      }
      if (response.status === 408 || response.status === 504) {
        throw new OpenRouterError("AI provider timed out.", 504);
      }
      throw new OpenRouterError(
        `AI provider error (${response.status}): ${detail || response.statusText}`,
        response.status >= 500 ? 502 : response.status
      );
    }

    const data = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    } | null;

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new OpenRouterError("AI provider returned an empty response.", 502);
    }

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}