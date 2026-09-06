/**
 * Shorts recommendations — client-safe, pure helpers that turn real user
 * signals into fresh, varied Shorts queries.
 *
 * Personalization only uses data we actually have: the user's current query
 * and the Shorts they have already watched this session. There are no fake
 * interests or hard-coded topic lists — everything is derived from real
 * interaction signals.
 *
 * Every helper is deterministic and side-effect free so it stays modular and
 * easy to test or reason about.
 */

export type ShortsWatchSignal = {
  title: string;
  channel: string | null;
};

/** Generic discovery queries, rotated so successive refreshes vary the feed. */
export const DISCOVERY_SPINS = [
  "trending shorts",
  "viral shorts",
  "new shorts",
  "funny shorts",
  "satisfying shorts",
  "amazing shorts",
  "pov shorts",
  "shorts of the day",
];

/** Topic modifiers appended to the user's base topic on refresh rotations. */
export const TOPIC_MODIFIERS = [
  "funny",
  "best",
  "viral",
  "amazing",
  "satisfying",
  "educational",
  "cute",
  "cool",
  "top",
  "creative",
];

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "her",
  "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man",
  "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let",
  "put", "say", "she", "too", "use", "that", "with", "have", "this", "will",
  "your", "from", "they", "know", "want", "been", "good", "much", "some",
  "time", "very", "when", "come", "here", "just", "like", "long", "make",
  "many", "more", "only", "over", "such", "take", "than", "them", "well",
  "were", "what", "which", "would", "there", "their", "about", "before",
  "after", "really", "shorts", "short", "video", "videos", "watch", "youtube",
  "shortsfeed", "shortsyoutube", "fyp", "foryou", "foryoupage", "foryoupage",
]);

/** Same charset the server accepts in `parseYoutubeQuery`. */
const QUERY_CHARSET = /^[\p{L}\p{N}\s.,#'’\-&+()/@%!:=]+$/u;

/** Tokenize text into lowercase words (Unicode letters/digits). */
function tokenize(text: string): string[] {
  return String(text ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Drop empty/filler tokens from a token list. */
function significant(tokens: string[]): string[] {
  return tokens.filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

/** Pick the most distinctive term in a short query (e.g. "coding shorts"). */
function firstSignificantTerm(query: string): string | null {
  const kept = significant(tokenize(query));
  if (kept.length === 0) return null;
  return [...kept].sort((a, b) => b.length - a.length)[0];
}

/** True when the text is nearly all stopwords/unknown. */
function isGenericPhrase(tokens: string[]): boolean {
  const kept = significant(tokens);
  return kept.length === 0;
}

function tokenScore(text: string, weight: number): Map<string, number> {
  const scores = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (token.length < 4 || STOPWORDS.has(token)) continue;
    scores.set(token, (scores.get(token) ?? 0) + weight);
  }
  return scores;
}

/**
 * Derive a personalization keyword from the most recent watched Shorts.
 * Title words are weighted by recency; channel words count half as much.
 * Returns the strongest recurring topic, or null when nothing distinctive
 * has been watched yet (so the caller can fall back to discovery).
 */
export function deriveKeywordFromWatch(watched: ShortsWatchSignal[]): string | null {
  const scores = new Map<string, number>();
  watched.forEach((signal, i) => {
    const weight = i + 1; // later = more recent = heavier
    for (const [token, s] of tokenScore(signal.title, weight)) {
      scores.set(token, (scores.get(token) ?? 0) + s);
    }
    if (signal.channel) {
      for (const [token, s] of tokenScore(signal.channel, weight * 0.6)) {
        scores.set(token, (scores.get(token) ?? 0) + s);
      }
    }
  });
  if (scores.size === 0) return null;

  let best = "";
  let bestScore = 0;
  for (const [token, s] of scores) {
    if (s > bestScore || (s === bestScore && token.length > best.length)) {
      best = token;
      bestScore = s;
    }
  }
  return best || null;
}

/** Validate/normalize a query to what the server accepts (or null). */
export function sanitizeQuery(q: string): string | null {
  const v = String(q ?? "").replace(/\s+/g, " ").trim();
  if (!v || v.length > 100) return null;
  if (!QUERY_CHARSET.test(v)) return null;
  return v;
}

/**
 * Build a fresh query for a "load more"/"refresh rotation" pass.
 *
 * Priority:
 *   1. watched-derived keyword (real user signal)  → "coding shorts"
 *   2. discovery spin for this cycle
 *   3. user's base topic + a themed modifier       → "funny coding shorts"
 *   4. a different discovery spin
 *   5. the user's own base query (always a valid last resort)
 *
 * Queries already tried recently (recentQueries) are skipped when an
 * alternative exists, so refreshes keep surfacing genuinely new results.
 */
export function buildFreshQuery({
  base,
  cycle,
  watched,
  recentQueries,
}: {
  base: string;
  cycle: number;
  watched: ShortsWatchSignal[];
  recentQueries: string[];
}): string {
  const keyword = deriveKeywordFromWatch(watched);
  const candidates: string[] = [];

  if (keyword) candidates.push(`${keyword} shorts`);

  const spinA = DISCOVERY_SPINS[cycle % DISCOVERY_SPINS.length];
  if (spinA) candidates.push(spinA);

  const baseTerm = firstSignificantTerm(base);
  if (baseTerm && !isGenericPhrase(tokenize(base))) {
    const modifier = TOPIC_MODIFIERS[cycle % TOPIC_MODIFIERS.length];
    if (modifier) candidates.push(`${baseTerm} ${modifier} shorts`);
  }

  const spinB = DISCOVERY_SPINS[(cycle * 7 + 3) % DISCOVERY_SPINS.length];
  if (spinB && spinB !== spinA) candidates.push(spinB);

  candidates.push(base); // user's own query is always a valid last resort

  for (const c of candidates) {
    const clean = sanitizeQuery(c);
    if (clean && !recentQueries.includes(clean)) return clean;
  }
  return sanitizeQuery(base) || DEFAULT_FALLBACK_QUERY;
}

const DEFAULT_FALLBACK_QUERY = "trending shorts";