export interface RateScoreInput {
  rate: number;
  cap: number;
  count: number;
  minCount: number;
  curvePower: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize a quality rate (0..1) into a 0..100 score.
 *
 * - Counts below `minCount` get a score of 0 (floor guards against a tiny
 *   number of events producing unrealistic scores).
 * - The rate is clamped at `cap` so that extreme ratios cannot dominate.
 * - `curvePower` compresses the curve: powers below 1 narrow the gap between
 *   mid-tier and top-tier creators, powers above 1 widen it.
 */
export function scoreFromRate({
  rate,
  cap,
  count,
  minCount,
  curvePower,
}: RateScoreInput): number {
  if (count < minCount) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;

  const capped = clamp(rate, 0, cap);
  const ratio = cap > 0 ? capped / cap : 0;
  const scaled = Math.pow(ratio, curvePower);

  return Math.round(clamp(scaled * 100, 0, 100) * 100) / 100;
}

export function safeRate(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function safePercent(part: number, whole: number) {
  return Math.round(safeRate(part, whole) * 10000) / 100;
}