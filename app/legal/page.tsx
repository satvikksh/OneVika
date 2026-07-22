import type { Metadata } from "next";
import { LegalCenterExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Legal Center | OrbitByte",
  description:
    "Access OrbitByte's privacy policy, terms, cookie policy, community guidelines, content policy, AI usage policy, copyright policy, and support.",
};

export default function LegalPage() {
  return <LegalCenterExperience />;
}
