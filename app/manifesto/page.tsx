import type { Metadata } from "next";
import { ManifestoExperience } from "../about/about-pages";

export const metadata: Metadata = {
  title: "OrbitByte Manifesto",
  description:
    "Read OrbitByte's beliefs about human-centered AI, privacy, creativity, inclusive communities, trust, and open collaboration.",
};

export default function ManifestoPage() {
  return <ManifestoExperience />;
}
