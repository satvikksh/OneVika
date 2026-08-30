export const REVIEW_EMAIL = "satvikksh@gmail.com";

export const ACCOUNT_SUSPENDED_MESSAGE =
  "Your account has been suspended. While the suspension is active you can no longer access feeds, messages, projects, analytics, settings, or other protected features.";

export const LOCKED_ACCOUNT_STATUSES = ["suspended", "banned"] as const;
export type LockedAccountStatus = (typeof LOCKED_ACCOUNT_STATUSES)[number];

export function isAccountLocked(status?: string | null): boolean {
  return LOCKED_ACCOUNT_STATUSES.includes(
    (status ?? "") as LockedAccountStatus
  );
}