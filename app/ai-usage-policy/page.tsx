import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "AI Usage Policy | OrbitByte",
  description: "OrbitByte AI usage policy for safe AI interactions, transparency, user responsibility, and platform safeguards.",
};

export default function AiUsagePolicyPage() {
  return (
    <PolicyExperience
      title="AI Usage Policy"
      sections={["Responsible AI", "User Control", "AI Interactions", "AI Content", "Safety Limits", "Transparency", "Prohibited Uses", "Contact Support"]}
    />
  );
}
