import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Privacy Policy | OrbitByte",
  description:
    "OrbitByte Privacy Policy covering data collection, messages, AI interactions, cookies, analytics, security, user rights, retention, and contact information.",
};

const sections = [
  "Introduction",
  "Information We Collect",
  "Account Information",
  "Messages",
  "AI Interactions",
  "Cookies",
  "Analytics",
  "Device Information",
  "Data Usage",
  "Security",
  "User Rights",
  "Data Retention",
  "Third-party Services",
  "Children's Privacy",
  "International Users",
  "Contact Information",
  "Policy Updates",
];

export default function PrivacyPolicyPage() {
  return <PolicyExperience title="Privacy Policy" sections={sections} />;
}
