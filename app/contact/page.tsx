import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Contact OrbitByte",
  description: "Contact OrbitByte for support, legal questions, partnerships, safety, and platform feedback.",
};

export default function ContactPage() {
  return (
    <PolicyExperience
      title="Contact OrbitByte"
      sections={["Support", "Safety", "Legal", "Partnerships", "Creator Program", "Developer Program", "Press", "Feedback"]}
    />
  );
}
