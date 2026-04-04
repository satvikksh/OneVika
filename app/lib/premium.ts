import type { IUser } from "@/app/models/User";
import { generateAITheme } from "@/app/lib/theme-generator";

const DEFAULT_PREMIUM_THEME = {
  background: "#000000",
  card: "#111111",
  accent: "#14b8a6",
  text: "#ffffff",
  radius: "20px",
};

export const PREMIUM_DURATION_DAYS = Number(
  process.env.PREMIUM_DURATION_DAYS || "30",
);

type PremiumUser = Pick<
  IUser,
  | "isPremium"
  | "premiumExpiresAt"
  | "premiumActivatedAt"
  | "premiumPlan"
  | "premiumPaymentProvider"
  | "premiumLastPaymentAt"
  | "premiumLastPaymentIntentId"
  | "premiumLastCheckoutSessionId"
  | "premiumExpiryReminderSentAt"
  | "premiumExpiryReminderFor"
  | "premiumPaymentMethod"
  | "uiTheme"
>;

export function isPremiumActive(user?: {
  isPremium?: boolean;
  premiumExpiresAt?: Date | string | null;
} | null) {
  if (!user?.isPremium || !user.premiumExpiresAt) return false;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
}

export function premiumExpiryFrom(baseDate: Date, durationDays = PREMIUM_DURATION_DAYS) {
  const expiry = new Date(baseDate);
  expiry.setDate(expiry.getDate() + durationDays);
  return expiry;
}

export async function applyPremiumToUser(
  user: PremiumUser,
  payment: {
    paymentIntentId?: string | null;
    checkoutSessionId?: string | null;
    provider?: "stripe" | "razorpay";
    paymentMethod?: {
      type?: string;
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
      vpa?: string;
    } | null;
  },
) {
  const now = new Date();
  const extensionStart =
    isPremiumActive(user) && user.premiumExpiresAt
      ? new Date(user.premiumExpiresAt)
      : now;

  let theme = user.uiTheme;
  if (!theme) {
    try {
      theme = await generateAITheme();
    } catch {
      theme = DEFAULT_PREMIUM_THEME;
    }
  }

  user.isPremium = true;
  user.premiumActivatedAt = now;
  user.premiumExpiresAt = premiumExpiryFrom(extensionStart);
  user.premiumPlan = "monthly";
  user.premiumPaymentProvider = payment.provider || "razorpay";
  user.premiumLastPaymentAt = now;
  user.premiumLastPaymentIntentId = payment.paymentIntentId || null;
  user.premiumLastCheckoutSessionId = payment.checkoutSessionId || null;
  user.premiumExpiryReminderSentAt = null;
  user.premiumExpiryReminderFor = null;
  user.premiumPaymentMethod = payment.paymentMethod || null;
  user.uiTheme = theme;
}
