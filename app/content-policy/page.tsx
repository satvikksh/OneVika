import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Content Policy | OrbitByte",
  description: "OrbitByte content policy for posts, media, AI-generated content, reports, and moderation.",
};

export default function ContentPolicyPage() {
  return (
    <PolicyExperience
      title="Content Policy"
      sections={["Allowed Content", "Restricted Content", "AI-generated Content", "Media Safety", "Reporting", "Moderation", "Appeals", "Policy Updates"]}
    />
  );
}
