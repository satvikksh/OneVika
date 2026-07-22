import type { Metadata } from "next";
import { PolicyExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Copyright Policy | OrbitByte",
  description: "OrbitByte copyright policy covering ownership, infringement reports, takedowns, and appeals.",
};

export default function CopyrightPolicyPage() {
  return (
    <PolicyExperience
      title="Copyright Policy"
      sections={["Ownership", "Copyright Reports", "Takedown Requests", "Counter Notices", "Repeat Infringement", "Fair Use", "Contact Information", "Policy Updates"]}
    />
  );
}
