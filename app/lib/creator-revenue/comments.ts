import type { CommentQualityRule } from "@/app/models/RevenueConfiguration";

export interface MeaningfulCommentResult {
  qualified: boolean;
  reasons: string[];
}

const EMOJI_REGEX =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

function countEmojis(text: string) {
  return [...(text.match(EMOJI_REGEX) ?? [])].length;
}

function countRepeatedChars(text: string) {
  let repeated = 0;
  for (let i = 2; i < text.length; i++) {
    if (text[i] === text[i - 1] && text[i] === text[i - 2]) {
      repeated++;
    }
  }
  return repeated;
}

export function countUppercase(text: string) {
  const letters = [...text].filter((ch) => /[A-Za-z]/.test(ch));
  if (letters.length === 0) return 0;
  const upper = letters.filter((ch) => ch === ch.toUpperCase() && /[A-Z]/.test(ch)).length;
  return upper / letters.length;
}

export function normalizeCommentText(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+/g, "")
    .trim();
}

/**
 * Meaningful-comment qualification layer. Spam, duplicates, automated
 * comments, meaningless repeated characters, promotional noise and obvious
 * engagement manipulation do not count.
 */
export function qualifiesMeaningfulComment(
  text: string,
  rules: CommentQualityRule
): MeaningfulCommentResult {
  const reasons: string[] = [];
  if (!rules.enabled) {
    return { qualified: true, reasons: [] };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { qualified: false, reasons: ["EMPTY"] };
  }

  if (trimmed.length < rules.minLength) {
    reasons.push("TOO_SHORT");
  }

  if (trimmed.length > rules.maxLength) {
    reasons.push("TOO_LONG");
  }

  const chars = [...trimmed];
  const emojiRatio = chars.length > 0 ? countEmojis(trimmed) / chars.length : 0;
  if (emojiRatio > rules.emojiRatioCap) {
    reasons.push("EMOJI_HEAVY");
  }

  const repeatedRatio = chars.length > 0 ? countRepeatedChars(trimmed) / Math.max(chars.length, 1) : 0;
  if (repeatedRatio > rules.repeatedCharRatioCap) {
    reasons.push("REPEATED_CHARS");
  }

  if (countUppercase(trimmed) > rules.uppercaseRatioCap) {
    reasons.push("ALL_CAPS");
  }

  const normalized = normalizeCommentText(trimmed);
  for (const pattern of rules.bannedPatterns) {
    const regex = safeRegex(pattern);
    if (regex && regex.test(normalized)) {
      reasons.push("BANNED_PATTERN");
      break;
    }
  }

  for (const pattern of rules.promotionalPatterns) {
    const regex = safeRegex(pattern);
    if (regex && regex.test(normalized)) {
      reasons.push("PROMOTIONAL");
      break;
    }
  }

  if (reasons.length > 0) {
    return { qualified: false, reasons };
  }

  return { qualified: true, reasons: [] };
}

export function isDuplicateComment(
  existingNormalized: string[],
  text: string,
  maximum: number
): boolean {
  if (maximum <= 0) return false;
  const normalized = normalizeCommentText(text);
  return existingNormalized.filter((item) => item === normalized).length >= maximum;
}

function safeRegex(pattern: string) {
  try {
    return new RegExp(pattern, "iu");
  } catch {
    return null;
  }
}