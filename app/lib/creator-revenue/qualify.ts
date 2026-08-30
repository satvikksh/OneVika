import type {
  ActivityQuality,
  CreatorActivityType,
  ViewQualityRule,
} from "@/app/models/RevenueConfiguration";

export interface EventInput {
  eventType: CreatorActivityType;
  viewerIsSelf: boolean;
  viewerIsAI: boolean;
  viewerAccountAgeSeconds: number;
  dailyStarts: number;
  dailySessions: number;
  durationMs?: number;
  watchedMs?: number;
}

export interface QualificationResult {
  quality: ActivityQuality;
  riskScore: number;
  signals: string[];
  qualifiedWatchMs: number;
  countsAsQualifiedView: boolean;
  countsAsCompletedView: boolean;
}

export const SIGNALS = {
  selfEngagement: "SELF_ENGAGEMENT",
  botAccount: "BOT_ACCOUNT",
  newAccount: "NEW_ACCOUNT_BURST",
  impossibleWatchTime: "IMPOSSIBLE_WATCH_TIME",
  shortView: "SHORT_VIEW",
  repeatedViewing: "REPEATED_VIEWING",
  excessiveSessions: "EXCESSIVE_SESSIONS",
} as const;

const REJECTED = (signals: string[], riskScore: number): QualificationResult => ({
  quality: "REJECTED",
  riskScore,
  signals,
  qualifiedWatchMs: 0,
  countsAsQualifiedView: false,
  countsAsCompletedView: false,
});

function finalizeView(
  input: EventInput,
  rules: ViewQualityRule,
  signals: string[],
  riskScore: number
): QualificationResult {
  const watched = Math.max(input.watchedMs ?? 0, 0);

  // Impossible watch-time behavior (longer than the content).
  if (
    typeof input.durationMs === "number" &&
    input.durationMs > 0 &&
    watched > input.durationMs * rules.watchMsOverDurationTolerance
  ) {
    return REJECTED([SIGNALS.impossibleWatchTime], Math.max(riskScore, 85));
  }

  // A qualified view requires genuine watch time.
  const countsAsQualifiedView =
    input.eventType !== "view_start" && watched >= rules.minWatchMs;

  if (input.eventType === "watch" && !countsAsQualifiedView) {
    signals.push(SIGNALS.shortView);
    riskScore = Math.max(riskScore, 30);
  }

  let quality: ActivityQuality = "VALID";

  if (input.dailyStarts >= rules.maxViewsPerViewerPerContentPerDay) {
    signals.push(SIGNALS.repeatedViewing);
    riskScore = Math.max(riskScore, 60);
    quality = "SUSPICIOUS";
  }

  if (input.dailySessions >= rules.maxWatchSessionsPerViewerPerContentPerDay) {
    signals.push(SIGNALS.excessiveSessions);
    riskScore = Math.max(riskScore, 65);
    quality = "SUSPICIOUS";
  }

  const qualified = countsAsQualifiedView;

  return {
    quality,
    riskScore,
    signals,
    qualifiedWatchMs: qualified ? watched : 0,
    countsAsQualifiedView: qualified,
    countsAsCompletedView:
      qualified &&
      input.eventType === "complete" &&
      input.watchedMs !== undefined &&
      input.watchedMs >= rules.completionWatchMs,
  };
}

/**
 * Fraud / quality layer for a single activity event. Runs BEFORE the event is
 * allowed to contribute to qualified metrics:
 *
 *   Raw activity -> Validation -> Fraud Detection -> Qualified Activity
 *
 * Returns VALID/SUSPICIOUS/REJECTED alongside a risk score. Only VALID events
 * feed creator scoring.
 */
export function qualifyEvent(
  input: EventInput,
  rules: ViewQualityRule
): QualificationResult {
  let signals: string[] = [];
  let riskScore = 0;

  // Repeated self-watching / self engagement.
  if (input.viewerIsSelf) {
    return REJECTED([SIGNALS.selfEngagement], 95);
  }

  // Known automated / fake accounts.
  if (input.viewerIsAI) {
    return REJECTED([SIGNALS.botAccount], 100);
  }

  // Account-creation bursts: very fresh viewing accounts are elevated risk.
  if (input.viewerAccountAgeSeconds < rules.minViewerAccountAgeSeconds) {
    signals = [...signals, SIGNALS.newAccount];
    riskScore = 45;
  }

  const isViewEvent =
    input.eventType === "watch" ||
    input.eventType === "view_start" ||
    input.eventType === "complete";

  if (!isViewEvent) {
    const suspicious = riskScore >= 50;
    return {
      quality: suspicious ? "SUSPICIOUS" : "VALID",
      riskScore,
      signals,
      qualifiedWatchMs: 0,
      countsAsQualifiedView: false,
      countsAsCompletedView: false,
    };
  }

  return finalizeView(input, rules, signals, riskScore);
}