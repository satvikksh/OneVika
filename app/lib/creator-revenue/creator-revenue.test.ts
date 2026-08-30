import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_NORMALIZATION, DEFAULT_WEIGHTS, DEFAULT_VIEW_QUALITY } from "@/app/models/RevenueConfiguration";
import { round2 } from "./constants";
import { qualifiesMeaningfulComment, isDuplicateComment, countUppercase, normalizeCommentText } from "./comments";
import { distributeRevenue } from "./distribute";
import { evaluateEligibility, canWithdraw } from "./eligibility";
import { safeRate, scoreFromRate, clamp } from "./normalize";
import { qualifyEvent } from "./qualify";
import { assessRisk } from "./risk";
import { computeScore, CreatorMetrics } from "./scoring";

test("normalize: scoreFromRate floors tiny sample sizes and clamps/curves", () => {
  assert.equal(scoreFromRate({ rate: 0.5, cap: 1, count: 0, minCount: 1, curvePower: 1 }), 0);
  assert.equal(scoreFromRate({ rate: 0.5, cap: 1, count: 5, minCount: 1, curvePower: 1 }), 50);
  assert.equal(scoreFromRate({ rate: 2, cap: 1, count: 5, minCount: 1, curvePower: 1 }), 100);
  assert.equal(scoreFromRate({ rate: -1, cap: 1, count: 5, minCount: 1, curvePower: 1 }), 0);
  assert.equal(scoreFromRate({ rate: 0.25, cap: 0.5, count: 5, minCount: 1, curvePower: 2 }), 25);
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(safeRate(4, 0), 0);
  assert.equal(safeRate(4, 2), 2);
});

test("scoring: 100% healthy metrics produce the exact weighted sum", () => {
  const metrics: CreatorMetrics = {
    qualifiedViews: 200,
    qualifiedWatchMs: 200_000,
    qualifiedWatchOpportunityMs: 200_000,
    completedViews: 190,
    uniqueViewers: 200,
    returningViewers: 200,
    meaningfulComments: 60,
    qualifiedShares: 20,
    qualifiedFollows: 20,
    qualifiedLikes: 0,
    riskScore: 0,
    qualityFactor: 1,
  };

  const result = computeScore(metrics, DEFAULT_WEIGHTS, DEFAULT_NORMALIZATION);

  const parts = Object.fromEntries(result.parts.map((p) => [p.key, p]));
  assert.equal(parts.watchQuality.subScore, 100);
  assert.equal(parts.watchQuality.weighted, 30);
  assert.equal(parts.completion.subScore, 100);
  assert.equal(parts.completion.weighted, 20);
  assert.equal(parts.uniqueAudience.subScore, 100);
  assert.equal(parts.uniqueAudience.weighted, 15);
  assert.equal(parts.shares.subScore, 50);
  assert.equal(parts.shares.weighted, 5);
  assert.equal(parts.meaningfulComments.subScore, 100);
  assert.equal(parts.meaningfulComments.weighted, 10);
  assert.equal(parts.returningViewers.subScore, 100);
  assert.equal(parts.returningViewers.weighted, 10);
  assert.equal(parts.followsGenerated.subScore, 100);
  assert.equal(parts.followsGenerated.weighted, 5);
  assert.equal(result.score, 95);
});

test("scoring: missing engagement metrics cannot inflate a score", () => {
  const metrics: CreatorMetrics = {
    qualifiedViews: 200,
    qualifiedWatchMs: 200_000,
    qualifiedWatchOpportunityMs: 200_000,
    completedViews: 190,
    uniqueViewers: 200,
    returningViewers: 0,
    meaningfulComments: 0,
    qualifiedShares: 0,
    qualifiedFollows: 0,
    qualifiedLikes: 0,
    riskScore: 0,
    qualityFactor: 1,
  };
  const result = computeScore(metrics, DEFAULT_WEIGHTS, DEFAULT_NORMALIZATION);
  const shares = result.parts.find((p) => p.key === "shares");
  assert.equal(shares?.subScore, 0);
  assert.ok(result.score < 95);
});

test("qualify: rejects self-engagement and AI accounts outright", () => {
  const rules = DEFAULT_VIEW_QUALITY;
  const self = qualifyEvent({ eventType: "watch", viewerIsSelf: true, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 0, watchedMs: 60000 }, rules);
  assert.equal(self.quality, "REJECTED");
  assert.deepEqual(self.signals, ["SELF_ENGAGEMENT"]);
  assert.equal(self.riskScore, 95);

  const bot = qualifyEvent({ eventType: "watch", viewerIsSelf: false, viewerIsAI: true, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 0, watchedMs: 60000 }, rules);
  assert.equal(bot.quality, "REJECTED");
  assert.deepEqual(bot.signals, ["BOT_ACCOUNT"]);
  assert.equal(bot.riskScore, 100);
});

test("qualify: qualified views, completions and shorts", () => {
  const rules = DEFAULT_VIEW_QUALITY;
  assert.equal(rules.minWatchMs, 3000);
  assert.equal(rules.completionWatchMs, 15000);

  const good = qualifyEvent({ eventType: "watch", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 0, watchedMs: 5000 }, rules);
  assert.equal(good.quality, "VALID");
  assert.equal(good.countsAsQualifiedView, true);
  assert.equal(good.qualifiedWatchMs, 5000);
  assert.equal(good.countsAsCompletedView, false);

  const done = qualifyEvent({ eventType: "complete", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 0, watchedMs: 20000, durationMs: 20000 }, rules);
  assert.equal(done.quality, "VALID");
  assert.equal(done.countsAsQualifiedView, true);
  assert.equal(done.countsAsCompletedView, true);

  const short = qualifyEvent({ eventType: "watch", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 0, watchedMs: 1000 }, rules);
  assert.equal(short.countsAsQualifiedView, false);
  assert.equal(short.qualifiedWatchMs, 0);
  assert.ok(short.signals.includes("SHORT_VIEW"));
  assert.ok(short.riskScore >= 30);

  const impossible = qualifyEvent({ eventType: "watch", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 0, watchedMs: 20000, durationMs: 10000 }, rules);
  assert.equal(impossible.quality, "REJECTED");
  assert.ok(impossible.signals.includes("IMPOSSIBLE_WATCH_TIME"));
  assert.ok(impossible.riskScore >= 85);
});

test("qualify: repeated viewing and session bombs are SUSPICIOUS", () => {
  const rules = DEFAULT_VIEW_QUALITY;
  const repeated = qualifyEvent({ eventType: "watch", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 50, dailySessions: 0, watchedMs: 5000 }, rules);
  assert.equal(repeated.quality, "SUSPICIOUS");
  assert.ok(repeated.signals.includes("REPEATED_VIEWING"));
  assert.ok(repeated.riskScore >= 60);

  const sessions = qualifyEvent({ eventType: "watch", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10000, dailyStarts: 0, dailySessions: 120, watchedMs: 5000 }, rules);
  assert.equal(sessions.quality, "SUSPICIOUS");
  assert.ok(sessions.signals.includes("EXCESSIVE_SESSIONS"));
  assert.ok(sessions.riskScore >= 65);
});

test("qualify: fresh accounts are tracked but organic likes still pass", () => {
  const rules = DEFAULT_VIEW_QUALITY;
  const freshLike = qualifyEvent({ eventType: "like", viewerIsSelf: false, viewerIsAI: false, viewerAccountAgeSeconds: 10, dailyStarts: 0, dailySessions: 0 }, rules);
  assert.equal(freshLike.quality, "VALID");
  assert.ok(freshLike.signals.includes("NEW_ACCOUNT_BURST"));
  assert.equal(freshLike.riskScore, 45);
});

test("comments: spam, caps and promo text are rejected", () => {
  const commentRules = {
    enabled: true,
    minLength: 3,
    maxLength: 1200,
    repeatedCharRatioCap: 0.5,
    emojiRatioCap: 0.6,
    uppercaseRatioCap: 0.8,
    maxDuplicatesPerUserPerContent: 1,
    bannedPatterns: ["\\b(free\\s+follow)\\b", "\\b(follow\\s+for\\s+follow)\\b"],
    promotionalPatterns: ["\\b(buy|sell)\\b"],
    minCommentFloor: 1,
  };

  assert.equal(qualifiesMeaningfulComment("ok", commentRules).qualified, false);
  assert.deepEqual(qualifiesMeaningfulComment("ok", commentRules).reasons, ["TOO_SHORT"]);
  assert.deepEqual(qualifiesMeaningfulComment("I will free follow for follow you", commentRules).reasons, ["BANNED_PATTERN"]);
  assert.deepEqual(qualifiesMeaningfulComment("Buy followers now!", commentRules).reasons, ["PROMOTIONAL"]);
  assert.deepEqual(qualifiesMeaningfulComment("aaaaaaaaaaaaaaaaaaaa", commentRules).reasons, ["REPEATED_CHARS"]);
  assert.deepEqual(qualifiesMeaningfulComment("THIS IS A GREAT VIDEO", commentRules).reasons, ["ALL_CAPS"]);

  const good = qualifiesMeaningfulComment("This made my day, thank you!", commentRules);
  assert.equal(good.qualified, true);
  assert.deepEqual(good.reasons, []);

  assert.equal(countUppercase("HELLO"), 1);
  assert.equal(countUppercase("hello"), 0);
  assert.equal(normalizeCommentText("  Buy IT NOW!!  "), "buy it now");
});

test("comments: duplicate detection is exact and normalized", () => {
  const rule = { maxDuplicatesPerUserPerContent: 1 } as { maxDuplicatesPerUserPerContent: number };
  assert.equal(isDuplicateComment(["great video"], "GREAT VIDEO!", rule.maxDuplicatesPerUserPerContent), true);
  assert.equal(isDuplicateComment(["great video"], "different thought", rule.maxDuplicatesPerUserPerContent), false);
  assert.equal(isDuplicateComment([], "something", rule.maxDuplicatesPerUserPerContent), false);
});

test("eligibility: healthy creator passes, reasons accumulate", () => {
  const rules = {
    minAccountAgeDays: 30,
    minQualifiedViews: 100,
    minFollowers: 50,
    minQualifiedWatchSeconds: 600,
    minEarningScore: 0,
    verifiedOnly: false,
    maxFraudRisk: 60,
    requireGoodStanding: false,
    requireContentPolicyCompliant: false,
    requireApprovedCreator: false,
  };

  const pass = evaluateEligibility(
    { accountAgeDays: 100, followers: 200, qualifiedViews: 500, qualifiedWatchSeconds: 2000, score: 60, verified: true, fraudRiskScore: 5, goodStanding: true, contentPolicyCompliant: true, approvedCreator: true },
    rules
  );
  assert.equal(pass.eligible, true);
  assert.deepEqual(pass.reasons, []);
  assert.equal(pass.revenueState, "PENDING_REVIEW");

  const fail = evaluateEligibility(
    { accountAgeDays: 2, followers: 1, qualifiedViews: 3, qualifiedWatchSeconds: 10, score: 0, verified: false, fraudRiskScore: 80, goodStanding: false, contentPolicyCompliant: false, approvedCreator: false },
    rules
  );
  assert.equal(fail.eligible, false);
  assert.ok(fail.reasons.some((r) => r.includes("minimum followers")));
  assert.ok(fail.reasons.some((r) => r.includes("risk score above")));
});

test("eligibility: frozen or rejected creators cannot earn", () => {
  const rules = {
    minAccountAgeDays: 0, minQualifiedViews: 0, minFollowers: 0, minQualifiedWatchSeconds: 0,
    minEarningScore: 0, verifiedOnly: false, maxFraudRisk: 100,
    requireGoodStanding: false, requireContentPolicyCompliant: false, requireApprovedCreator: false,
  };
  const result = evaluateEligibility(
    { accountAgeDays: 100, followers: 100, qualifiedViews: 100, qualifiedWatchSeconds: 100, score: 50, verified: true, fraudRiskScore: 0, goodStanding: true, contentPolicyCompliant: true, approvedCreator: true, fraudStatus: "FROZEN" },
    rules
  );
  assert.equal(result.eligible, false);
  assert.equal(result.revenueState, "FROZEN");
  assert.ok(result.reasons.includes("Earnings frozen by admin"));
});

test("eligibility: withdrawal minimum is enforced", () => {
  const under = canWithdraw({ availablePaise: 99, minimumPaise: 100 });
  assert.equal(under.eligible, false);
  assert.ok(under.reason.length > 0);
  const over = canWithdraw({ availablePaise: 100, minimumPaise: 100 });
  assert.equal(over.eligible, true);
});

test("distribute: proportional split never exceeds the pool", () => {
  const result = distributeRevenue(1000, [
    { creatorId: "a", score: 1, eligible: true },
    { creatorId: "b", score: 3, eligible: true },
  ]);
  assert.equal(result.totalScore, 4);
  assert.equal(result.poolPaise, 1000);
  assert.equal(result.distributedPaise, 1000);
  assert.equal(result.residuePaise, 0);
  assert.equal(result.eligibleCreators, 2);
  const byId = Object.fromEntries(result.items.map((i) => [i.creatorId, i]));
  assert.equal(byId.a.revenuePaise, 250);
  assert.equal(byId.b.revenuePaise, 750);
  assert.equal(byId.a.sharePercent, 25);
});

test("distribute: largest-remainder rounds deterministically", () => {
  const result = distributeRevenue(100, [
    { creatorId: "1", score: 1, eligible: true },
    { creatorId: "2", score: 1, eligible: true },
    { creatorId: "3", score: 1, eligible: true },
  ]);
  const byId = Object.fromEntries(result.items.map((i) => [i.creatorId, i]));
  assert.equal(byId["1"].revenuePaise, 34);
  assert.equal(byId["2"].revenuePaise, 33);
  assert.equal(byId["3"].revenuePaise, 33);
  assert.equal(result.distributedPaise, 100);
  assert.equal(result.residuePaise, 0);

  const rerun = distributeRevenue(100, [
    { creatorId: "1", score: 1, eligible: true },
    { creatorId: "2", score: 1, eligible: true },
    { creatorId: "3", score: 1, eligible: true },
  ]);
  assert.deepEqual(rerun.items, result.items);
});

test("distribute: zero total scores and ineligible rows are handled safely", () => {
  const zero = distributeRevenue(1000, [
    { creatorId: "a", score: 0, eligible: true },
    { creatorId: "b", score: 0, eligible: true },
  ]);
  assert.equal(zero.items.length, 0);
  assert.equal(zero.totalScore, 0);

  const filtered = distributeRevenue(500, [
    { creatorId: "good", score: 5, eligible: true },
    { creatorId: "frozen", score: 5, eligible: false },
  ]);
  assert.equal(filtered.eligibleCreators, 1);
  assert.equal(filtered.items[0].creatorId, "good");
  assert.equal(filtered.items[0].revenuePaise, 500);

  const noPool = distributeRevenue(0, [{ creatorId: "a", score: 5, eligible: true }]);
  assert.equal(noPool.items.length, 0);
});

test("risk: clean creators score zero, engagement inflation trips a signal", () => {
  const clean = assessRisk({
    qualifiedViews: 100, rawViewStarts: 100, qualifiedWatchMs: 300_000, rawWatchMs: 300_000,
    completedViews: 90, meaningfulComments: 5, qualifiedShares: 2, qualifiedFollows: 1,
    qualifiedLikes: 4, flaggedDocs: 0, totalDocs: 10, docsWithExcessStarts: 0, docsWithLowCompletion: 0,
    uniqueViewers: 20,
  });
  assert.equal(clean.riskScore, 0);
  assert.equal(clean.qualityFactor, 1);
  assert.deepEqual(clean.signals, []);

  const inflated = assessRisk({
    qualifiedViews: 100, rawViewStarts: 150, qualifiedWatchMs: 300_000, rawWatchMs: 500_000,
    completedViews: 90, meaningfulComments: 100, qualifiedShares: 0, qualifiedFollows: 100,
    qualifiedLikes: 100, flaggedDocs: 0, totalDocs: 10, docsWithExcessStarts: 0, docsWithLowCompletion: 0,
    uniqueViewers: 20,
  });
  assert.ok(inflated.signals.includes("AUTOMATED_ENGAGEMENT"));
  assert.ok(inflated.riskScore > 0);
  assert.ok(inflated.qualityFactor < 1);
  assert.equal(inflated.suspiciousViews, 50);
});

test("round2 keeps scoring values clean", () => {
  assert.equal(round2(1.23456), 1.23);
  assert.equal(round2(1.249), 1.25);
  assert.equal(round2(1), 1);
});