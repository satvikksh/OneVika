import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Community Guidelines | OrbitByte",
  description: "OrbitByte community guidelines for safe, inclusive, respectful, and creative participation.",
};

export default function CommunityGuidelinesPage() {
  return (
    <PolicyExperience
      title="Community Guidelines"
      sections={["Be Respectful", "Inclusive Communities", "No Harassment", "No Spam", "Safe Communication", "Reporting", "Enforcement", "Appeals"]}
    />
  );
}
