import mongoose from "mongoose";
import { dbConnect } from "@/app/lib/mongodb";
import Coupon from "@/app/models/Coupon";
import CouponUsage from "@/app/models/CouponUsage";
import type { IPremiumPlan } from "@/app/models/PremiumPlan";

export type CouponValidationResult =
  | { valid: true; couponId: string; code: string; discountPaise: number; finalAmountPaise: number }
  | { valid: false; code: string; reason: string };

/**
 * Validate a coupon and compute the discount for a given premium plan,
 * entirely server-side. The caller is responsible for passing the plan's
 * authoritative server-side price (never a client-supplied price).
 */
export async function validateAndApplyCoupon(input: {
  couponCode?: string | null;
  userId: string;
  plan: Pick<IPremiumPlan, "key" | "pricePaise">;
}): Promise<CouponValidationResult> {
  const { couponCode, userId, plan } = input;

  const noCoupon: CouponValidationResult = {
    valid: true,
    couponId: "",
    code: "",
    discountPaise: 0,
    finalAmountPaise: plan.pricePaise,
  };

  if (!couponCode) {
    return noCoupon;
  }

  const code = String(couponCode).trim().toUpperCase();
  if (!code) {
    return noCoupon;
  }

  await dbConnect();

  const coupon = await Coupon.findOne({ code }).lean();
  if (!coupon) {
    return { valid: false, code, reason: "Invalid coupon code" };
  }

  const now = new Date();

  if (!coupon.isActive) {
    return { valid: false, code, reason: "This coupon is inactive" };
  }

  if (coupon.startDate && now < new Date(coupon.startDate)) {
    return { valid: false, code, reason: "This coupon is not yet active" };
  }

  if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
    return { valid: false, code, reason: "This coupon has expired" };
  }

  if (
    coupon.applicablePremiumPlanKeys &&
    coupon.applicablePremiumPlanKeys.length > 0 &&
    !coupon.applicablePremiumPlanKeys.includes(plan.key)
  ) {
    return {
      valid: false,
      code,
      reason: "This coupon does not apply to the selected plan",
    };
  }

  if (plan.pricePaise < coupon.minPurchaseAmount) {
    return {
      valid: false,
      code,
      reason: "Purchase amount is below the minimum for this coupon",
    };
  }

  const usageCount = await CouponUsage.countDocuments({
    couponId: coupon._id,
    ...(coupon.perUserUsageLimit
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : {}),
  });

  if (coupon.usageLimit != null && usageCount >= coupon.usageLimit) {
    return { valid: false, code, reason: "This coupon has reached its usage limit" };
  }

  if (
    coupon.perUserUsageLimit != null &&
    usageCount >= coupon.perUserUsageLimit
  ) {
    return {
      valid: false,
      code,
      reason: "This coupon has reached your usage limit",
    };
  }

  let discountPaise = 0;
  if (coupon.discountType === "percentage") {
    discountPaise = Math.floor((plan.pricePaise * coupon.discountValue) / 100);
    if (coupon.maxDiscount != null) {
      discountPaise = Math.min(discountPaise, coupon.maxDiscount);
    }
  } else {
    discountPaise = coupon.discountValue;
  }

  discountPaise = Math.min(discountPaise, plan.pricePaise);
  const finalAmountPaise = Math.max(0, plan.pricePaise - discountPaise);

  return {
    valid: true,
    couponId: coupon._id.toString(),
    code,
    discountPaise,
    finalAmountPaise,
  };
}
