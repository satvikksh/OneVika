import type { Metadata } from "next";
import { AboutExperience } from "./about-pages";

export const metadata: Metadata = {
  title: "About OrbitByte | Connect. Create. Inspire.",
  description:
    "Learn about OrbitByte, Satvik Kushwaha's AI-powered Indian social networking platform built for secure communication, communities, creators, and privacy-first AI.",
};

export default function AboutPage() {
  return <AboutExperience />;
}
