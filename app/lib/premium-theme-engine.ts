export type PersonalityType =
  | "minimal"
  | "creative"
  | "bold"
  | "calm"
  | "mystic";

export interface PremiumTheme {
  background: string;
  card: string;
  accent: string;
  text: string;
  radius: string;
  glow: boolean;
}

/* ======================
   🎨 100+ Palette System
====================== */

const basePalettes = [
  ["#0f0f1a", "#1c1c2e", "#7c3aed"],
  ["#111827", "#1f2937", "#06b6d4"],
  ["#0b0f19", "#141a28", "#ec4899"],
  ["#0c0a1f", "#1e1b4b", "#6366f1"],
  ["#0a0f1f", "#1e293b", "#22d3ee"],
  ["#1a0f0f", "#2e1c1c", "#ef4444"],
  ["#0f1a14", "#1c2e22", "#10b981"],
  ["#140f1a", "#221c2e", "#a855f7"],
  ["#0f141a", "#1c222e", "#38bdf8"],
  ["#1a140f", "#2e221c", "#f97316"],
];

/* ======================
   🧠 Hash Generator
====================== */

function generateHash(str: string) {
  return str.split("").reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
}

/* ======================
   🎭 Personality Modifier
====================== */

function applyPersonality(
  theme: PremiumTheme,
  personality: PersonalityType
): PremiumTheme {
  switch (personality) {
    case "minimal":
      return { ...theme, radius: "12px", glow: false };

    case "creative":
      return { ...theme, radius: "28px", glow: true };

    case "bold":
      return { ...theme, radius: "20px", glow: true };

    case "calm":
      return { ...theme, radius: "24px", glow: false };

    case "mystic":
      return { ...theme, radius: "32px", glow: true };

    default:
      return theme;
  }
}

/* ======================
   🚀 Main Generator
====================== */

export function generatePremiumTheme(
  email: string,
  personality: PersonalityType
): PremiumTheme {
  const hash = generateHash(email);

  const palette = basePalettes[hash % basePalettes.length];

  const baseTheme: PremiumTheme = {
    background: palette[0],
    card: palette[1],
    accent: palette[2],
    text: "#ffffff",
    radius: "20px",
    glow: false,
  };

  return applyPersonality(baseTheme, personality);
}
