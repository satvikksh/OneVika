import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Terms & Conditions | OrbitByte",
  description:
    "OrbitByte Terms & Conditions covering eligibility, responsibilities, content ownership, AI usage, messaging, premium features, prohibited activity, and liability.",
};

const sections = [
  "Acceptance of Terms",
  "Eligibility",
  "User Responsibilities",
  "Community Guidelines",
  "Content Ownership",
  "AI Usage",
  "Messaging Rules",
  "Account Suspension",
  "Intellectual Property",
  "Payments (Future)",
  "Premium Features",
  "Prohibited Activities",
  "Disclaimer",
  "Limitation of Liability",
  "Termination",
  "Governing Law",
  "Contact Information",
];

export default function TermsPage() {
  return <PolicyExperience title="Terms & Conditions" sections={sections} />;
}
