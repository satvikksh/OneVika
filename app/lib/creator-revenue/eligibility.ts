import type { EligibilityRule } from "@/app/models/RevenueConfiguration";
import { CreatorRevenueState } from "@/app/models/CreatorMetricSnapshot";

export interface EligibilityInput {
  accountAgeDays: number;
  followers: number;
  qualifiedViews: number;
  qualifiedWatchSeconds: number;
  score: number;
  verified: boolean;
  fraudRiskScore: number;
  goodStanding: boolean;
  contentPolicyCompliant: boolean;
  approvedCreator: boolean;
  fraudStatus?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  revenueState: CreatorRevenueState;
}

/**
 * Creator eligibility requirements. Every rule is configurable from the Admin
 * Panel (`RevenueConfiguration.eligibility`).
 */
export function evaluateEligibility(
  input: EligibilityInput,
  rules: EligibilityRule
): EligibilityResult {
  const reasons: string[] = [];

  if (input.accountAgeDays < rules.minAccountAgeDays) {
    reasons.push(`Account age below ${rules.minAccountAgeDays} days`);
  }
  if (input.qualifiedViews < rules.minQualifiedViews) {
    reasons.push(`Below minimum qualified views (${rules.minQualifiedViews})`);
  }
  if (input.followers < rules.minFollowers) {
    reasons.push(`Below minimum followers (${rules.minFollowers})`);
  }
  if (input.qualifiedWatchSeconds < rules.minQualifiedWatchSeconds) {
    reasons.push(`Below minimum qualified watch time (${rules.minQualifiedWatchSeconds}s)`);
  }
  if (input.score < rules.minEarningScore) {
    reasons.push(`Earning score below minimum (${rules.minEarningScore})`);
  }
  if (rules.verifiedOnly && !input.verified) {
    reasons.push("Account not verified");
  }
  if (input.fraudRiskScore > rules.maxFraudRisk) {
    reasons.push(`Fraud risk score above acceptable threshold (${rules.maxFraudRisk})`);
  }
  if (rules.requireGoodStanding && !input.goodStanding) {
    reasons.push("Account not in good standing");
  }
  if (rules.requireContentPolicyCompliant && !input.contentPolicyCompliant) {
    reasons.push("Content policy non-compliance");
  }
  if (rules.requireApprovedCreator && !input.approvedCreator) {
    reasons.push("Not an approved creator");
  }

  const frozenOrRejected = ["FROZEN", "REJECTED"].includes(input.fraudStatus ?? "");
  if (frozenOrRejected) {
    reasons.push(
      input.fraudStatus === "FROZEN"
        ? "Earnings frozen by admin"
        : "Earnings rejected due to fraud"
    );
  }

  return {
    eligible: reasons.length === 0 && !frozenOrRejected,
    reasons,
    revenueState: frozenOrRejected ? (input.fraudStatus as CreatorRevenueState) : "PENDING_REVIEW",
  };
}

export interface WithdrawalEligibilityInput {
  availablePaise: number;
  minimumPaise: number;
}

export function canWithdraw(input: WithdrawalEligibilityInput): {
  eligible: boolean;
  reason: string;
} {
  if (input.availablePaise < input.minimumPaise) {
    return {
      eligible: false,
      reason: "Available balance is below the minimum withdrawal amount",
    };
  }
  return { eligible: true, reason: "" };
}