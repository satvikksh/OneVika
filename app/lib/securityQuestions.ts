export type SecurityKey = "favoritePet" | "favoriteColor" | "nickname";

export const SECURITY_QUESTIONS: { key: SecurityKey; label: string }[] = [
  { key: "favoritePet", label: "What is your favorite pet?" },
  { key: "favoriteColor", label: "What is your favorite color?" },
  { key: "nickname", label: "What is your nickname?" },
];

const SECURITY_QUESTION_KEY_SET = new Set<SecurityKey>(
  SECURITY_QUESTIONS.map((question) => question.key)
);

export const isSecurityKey = (value: string): value is SecurityKey =>
  SECURITY_QUESTION_KEY_SET.has(value as SecurityKey);

export const normalizeSecurityAnswer = (value: string) =>
  value.trim().toLowerCase();
