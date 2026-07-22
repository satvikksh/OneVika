import type { Metadata } from "next";
import { JoinCollectiveExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "Join Our Collective | OrbitByte",
  description:
    "Join OrbitByte's creator, developer, beta testing, ambassador, open source, careers, and partnership programs.",
};

export default function JoinPage() {
  return <JoinCollectiveExperience />;
}
