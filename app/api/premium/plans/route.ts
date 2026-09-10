import { NextResponse } from "next/server";

import { dbConnect } from "@/app/lib/mongodb";
import PremiumPlan from "@/app/models/PremiumPlan";
import { paiseToRupees } from "@/app/lib/earnings";

export const runtime = "nodejs";

/**
 * Public catalog of active Premium plans. The client only ever sends a
 * `planKey` to the checkout route — the price is always derived server-side
 * from these documents, never from the client.
 */
export async function GET() {
  try {
    await dbConnect();
    const plans = await PremiumPlan.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

    return NextResponse.json({
      plans: plans.map((plan) => ({
        key: plan.key,
        name: plan.name,
        description: plan.description || "",
        pricePaise: plan.pricePaise,
        priceRupees: paiseToRupees(plan.pricePaise),
        currency: plan.currency,
        durationDays: plan.durationDays,
        features: plan.features || [],
        displayOrder: plan.displayOrder,
      })),
    });
  } catch (error) {
    console.error("PREMIUM PLANS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch premium plans" },
      { status: 500 },
    );
  }
}