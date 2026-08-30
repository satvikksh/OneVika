import { safeRate } from "./normalize";

export interface RevenueItemInput {
  creatorId: string;
  score: number;
  eligible: boolean;
}

export interface DistributedRevenueItem {
  creatorId: string;
  score: number;
  fraction: number;
  sharePercent: number;
  revenuePaise: number;
}

export interface DistributionResult {
  items: DistributedRevenueItem[];
  totalScore: number;
  poolPaise: number;
  residuePaise: number;
  distributedPaise: number;
  eligibleCreators: number;
}

const ZERO_RESULT: DistributionResult = {
  items: [],
  totalScore: 0,
  poolPaise: 0,
  residuePaise: 0,
  distributedPaise: 0,
  eligibleCreators: 0,
};

/**
 * Monthly revenue distribution.
 *
 *   creatorRevenuePaise = poolPaise * (score / totalEligibleScores)
 *
 * Uses integer minor-currency units with the largest-remainder method so that:
 *   SUM(final revenues) + residue == poolPaise   (never exceeds the pool)
 * Ties are broken deterministically by creatorId so reruns are identical.
 */
export function distributeRevenue(
  poolPaise: number,
  inputs: RevenueItemInput[]
): DistributionResult {
  const pool = Math.floor(poolPaise);
  if (pool <= 0) return ZERO_RESULT;

  const eligible = inputs
    .filter((item) => item.eligible && Number.isFinite(item.score) && item.score > 0)
    .map((item) => ({ creatorId: item.creatorId, score: item.score }));

  const totalScore = eligible.reduce((sum, item) => sum + item.score, 0);
  if (totalScore <= 0) {
    // Zero total eligible scores: nothing can be distributed. The cycle must
    // stay pending review so the caller handles the fallback.
    return { ...ZERO_RESULT, totalScore: 0, poolPaise: pool };
  }

  const raw = eligible.map((item) => {
    const fraction = safeRate(item.score, totalScore);
    const exact = pool * fraction;
    return {
      creatorId: item.creatorId,
      score: item.score,
      fraction,
      exact,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  const flooredSum = raw.reduce((sum, item) => sum + item.floor, 0);
  let remainingPaise = pool - flooredSum;

  // Largest-remainder allocation. Deterministic tie-break: lowest creatorId first.
  const sortedByRemainder = [...raw].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      (a.creatorId < b.creatorId ? -1 : a.creatorId > b.creatorId ? 1 : 0)
  );

  const distributed = new Map<string, DistributedRevenueItem>();
  for (const item of raw) {
    distributed.set(item.creatorId, {
      creatorId: item.creatorId,
      score: item.score,
      fraction: roundFraction(item.fraction),
      sharePercent: Math.round(item.fraction * 10000) / 100,
      revenuePaise: item.floor,
    });
  }

  for (const item of sortedByRemainder) {
    if (remainingPaise <= 0) break;
    const entry = distributed.get(item.creatorId);
    if (!entry) continue;
    entry.revenuePaise += 1;
    remainingPaise -= 1;
  }

  const items = [...distributed.values()].sort((a, b) =>
    a.creatorId < b.creatorId ? -1 : a.creatorId > b.creatorId ? 1 : 0
  );

  const distributedPaise = items.reduce((sum, item) => sum + item.revenuePaise, 0);

  return {
    items,
    totalScore: Math.round(totalScore * 100) / 100,
    poolPaise: pool,
    residuePaise: Math.max(pool - distributedPaise, 0),
    distributedPaise,
    eligibleCreators: items.length,
  };
}

function roundFraction(value: number) {
  return Math.round(value * 1e9) / 1e9;
}