import User from "@/app/models/User";
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  isAccountLocked,
  REVIEW_EMAIL,
} from "@/app/lib/account-policy";

export type AccountStatus =
  | "active"
  | "warned"
  | "restricted"
  | "suspended"
  | "banned";

export const USER_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "Active",
  warned: "Warned",
  restricted: "Restricted",
  suspended: "Suspended",
  banned: "Banned",
};

const INACTIVE_REASON: Partial<Record<AccountStatus, string>> = {
  restricted:
    "Your account is restricted. This action is temporarily unavailable.",
  suspended: `${ACCOUNT_SUSPENDED_MESSAGE} To request a review, contact ${REVIEW_EMAIL}.`,
  banned:
    "Your account has been banned. This action is no longer available to you.",
};

/**
 * Returns the reason a user of the given status should be blocked from
 * mutating actions, or null when the account is allowed to act.
 * A missing status defaults to "active" (legacy accounts).
 */
export function inactiveReason(status?: AccountStatus | null): string | null {
  const key = status || "active";
  return INACTIVE_REASON[key] || null;
}

/**
 * Checks whether an authenticated user is still allowed to perform
 * mutating actions (posting, commenting, messaging, payments, etc.).
 *
 * Returns an error string when the request should be rejected, or null
 * when the account can act. ADMIN accounts are always allowed, and
 * `warned` accounts are still allowed (warning is non-blocking).
 */
export async function rejectIfInactive(userId?: string | null): Promise<string | null> {
  if (!userId) return "Unauthorized";

  const user = await User.findById(userId).select("accountStatus role").lean();

  if (!user) {
    return "Unauthorized";
  }

  if (user.role === "ADMIN") return null;

  return inactiveReason(user.accountStatus as AccountStatus | undefined);
}

export { isAccountLocked };