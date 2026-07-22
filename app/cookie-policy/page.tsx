import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Cookie Policy | OrbitByte",
  description: "How OrbitByte uses cookies, local storage, preferences, analytics, and security-related browser data.",
};

export default function CookiePolicyPage() {
  return (
    <PolicyExperience
      title="Cookie Policy"
      sections={["Introduction", "Essential Cookies", "Preferences", "Analytics", "Security", "Managing Cookies", "Policy Updates", "Contact Support"]}
    />
  );
}
