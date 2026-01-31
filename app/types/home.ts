// app/types/home.ts

import type React from "react";

/* ======================================================
   MOOD TYPES
====================================================== */

export type MoodId = "low" | "meh" | "calm" | "good" | "hyped" | "skipped";

export type MoodOption = {
  id: MoodId;
  emoji: string;
  label: string;
  value: number; // 1–5 scale
  color: string; // Tailwind gradient
  description: string;
  pulse?: boolean;
  glow?: boolean;
};

export type MoodSelection = {
  mood: MoodOption;
  timestamp: Date;
  note?: string;
  energyLevel: number; // 1–5
};

export type MoodHistory = {
  date: string;
  mood: MoodOption;
  energyLevel: number;
  activities?: string[];
};

export interface MoodSelectorProps {
  onMoodSelect: (mood: MoodOption) => void;
  initialMood?: MoodOption;
  showHistory?: boolean;
  compact?: boolean;
}

/* ======================================================
   DAILY DROP TYPES
====================================================== */

export type DailyDropCategory =
  | "mindfulness"
  | "creativity"
  | "connection"
  | "reflection";

export type DailyDrop = {
  id: string;
  date: string;
  prompt: string;
  totalAnswers: number;
  category?: DailyDropCategory;
  themeColor?: string;
  characterLimit?: number;

  hasUserAnswered?: boolean;
  userResponse?: string;
  lastInteraction?: Date;
  responses?: DailyDropResponse[];
};

export type DailyDropResponse = {
  id: string;
  userId: string;
  userName: string;
  response: string;
  emoji?: string;
  likes: number;
  timestamp: Date;
  isLiked?: boolean;
  isAnonymous?: boolean;
};

export type DailyDropState =
  | "idle"
  | "answering"
  | "submitted"
  | "viewing"
  | "skipped";

export interface DailyDropCardProps {
  drop: DailyDrop;
  onAnswerSubmit?: (response: string) => Promise<void>;
  onViewResponses?: () => void;
  onSkip?: () => void;
  userHasInteracted?: boolean;

  showConfetti?: boolean;
  enableEditing?: boolean;
  maxCharacterCount?: number;
}

/* ======================================================
   SPACE TYPES
====================================================== */

export type SpaceCategory =
  | "wellness"
  | "creative"
  | "lifestyle"
  | "learning"
  | "community";

export type SpaceActivityLevel = "low" | "medium" | "high";

export type Space = {
  id: string;
  name: string;
  emoji: string;
  description?: string;

  memberCount: number;
  category: SpaceCategory;

  // Semantic activity for UI
  activity: SpaceActivityLevel;

  // Realtime & UX
  isActiveNow?: boolean;
  isNew?: boolean;
  isJoined?: boolean;
  joinDate?: Date;

  // Visuals
  color?: string;
  glowEffect?: boolean;
  pulseEffect?: boolean;

  // Community
  rules?: string[];
  recentTopics?: string[];
};

export type SpaceActivity = {
  spaceId: string;
  activeUsers: number;
  recentMessages: number;
  liveTyping: boolean;
};

export type SpaceInteraction = {
  spaceId: string;
  action: "join" | "leave" | "visit" | "post";
  timestamp: Date;
};

export interface SpacesGridProps {
  spaces: Space[];
  onSpaceClick?: (space: Space) => void;
  onJoinSpace?: (spaceId: string, join: boolean) => Promise<void>;

  enableSearch?: boolean;
  enableFilter?: boolean;
  initialCategory?: SpaceCategory;

  defaultView?: "grid" | "list" | "compact";
  showCreateSpace?: boolean;
  showActivityIndicators?: boolean;
  maxVisible?: number;
}

/* ======================================================
   USER INTERACTION & APP STATE
====================================================== */

export type UserInteraction = {
  type: "mood" | "daily_drop" | "space_join" | "space_post" | "like";
  timestamp: Date;
  data: Record<string, unknown>;
  duration?: number;
};

export type UserPreferences = {
  theme: "light" | "dark" | "auto";
  notifications: {
    dailyDrop: boolean;
    spaceActivity: boolean;
    moodReminder: boolean;
  };
  privacy: {
    showMoodPublicly: boolean;
    anonymousAnswers: boolean;
  };
};

export type AppState = {
  currentMood?: MoodOption;
  dailyDropState?: DailyDropState;
  joinedSpaces: string[];
  recentInteractions: UserInteraction[];

  activeCategory?: SpaceCategory;
  searchQuery: string;
  viewMode: "grid" | "list";
  showAllSpaces: boolean;

  activeAnimations: Record<string, AnimationConfig>;
  confettiActive: boolean;
};

/* ======================================================
   ANIMATION & MICRO-INTERACTIONS
====================================================== */

export type AnimationType =
  | "fadeIn"
  | "slideUp"
  | "slideDown"
  | "scale"
  | "bounce"
  | "pulse"
  | "confetti"
  | "ripple"
  | "float";

export type AnimationConfig = {
  type: AnimationType;
  duration: number;
  delay?: number;
  easing?: string;
  repeat?: number;
};

export type MicroInteraction = {
  id: string;
  trigger: "hover" | "click" | "focus" | "load";
  animation: AnimationConfig;
  sound?: string;
  haptic?: boolean;
};

/* ======================================================
   API RESPONSE TYPES
====================================================== */

export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
};

export type PaginatedResponse<T> = ApiResponse<T> & {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

/* ======================================================
   EVENTS
====================================================== */

export type MoodEvent = {
  type: "MOOD_SELECTED" | "MOOD_CHANGED" | "MOOD_SKIPPED";
  payload: MoodOption;
  timestamp: Date;
};

export type DailyDropEvent = {
  type:
    | "DAILY_DROP_ANSWERED"
    | "DAILY_DROP_SKIPPED"
    | "DAILY_DROP_VIEWED";
  payload: DailyDrop;
  response?: string;
  timestamp: Date;
};

export type SpaceEvent = {
  type: "SPACE_JOINED" | "SPACE_LEFT" | "SPACE_VISITED";
  payload: Space;
  timestamp: Date;
};

export type AppEvent = MoodEvent | DailyDropEvent | SpaceEvent;

/* ======================================================
   HELPERS
====================================================== */

export type Optional<T, K extends keyof T> =
  Pick<Partial<T>, K> & Omit<T, K>;

export type Nullable<T> = T | null;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/* ======================================================
   ACTIVITY LEVEL MAPPER
====================================================== */

export const getActivityLevel = (
  count: number
): SpaceActivityLevel => {
  if (count > 50) return "high";
  if (count > 15) return "medium";
  return "low";
};

/* ======================================================
   MOCK DATA GENERATORS
====================================================== */

export const generateMockMood = (
  override?: Partial<MoodOption>
): MoodOption => ({
  id: "calm",
  emoji: "🌿",
  label: "Calm",
  value: 3,
  color: "from-green-400 to-emerald-500",
  description: "Peaceful and grounded",
  ...override,
});

export const generateMockDailyDrop = (
  override?: Partial<DailyDrop>
): DailyDrop => ({
  id: "drop-1",
  date: new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }),
  prompt: "What is one small thing you can do today for yourself?",
  totalAnswers: 1247,
  category: "mindfulness",
  themeColor: "from-purple-100 to-pink-100",
  characterLimit: 300,
  ...override,
});

export const generateMockSpace = (
  override?: Partial<Space>
): Space => ({
  id: "mindfulness",
  name: "Mindfulness",
  emoji: "🧘",
  description: "Daily meditation & presence practices",
  memberCount: 2451,
  category: "wellness",
  activity: "high",
  isActiveNow: true,
  isJoined: false,
  color: "from-blue-100 to-cyan-100",
  ...override,
});

/* ======================================================
   CONSTANTS
====================================================== */

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: "low",
    emoji: "🌧️",
    label: "Stormy",
    value: 1,
    color: "from-blue-400 to-indigo-500",
    description: "Feeling heavy or drained",
    pulse: true,
  },
  {
    id: "meh",
    emoji: "🌥️",
    label: "Cloudy",
    value: 2,
    color: "from-gray-400 to-slate-500",
    description: "A bit gray or uncertain",
  },
  {
    id: "calm",
    emoji: "🌿",
    label: "Calm",
    value: 3,
    color: "from-green-400 to-emerald-500",
    description: "Peaceful and grounded",
    glow: true,
  },
  {
    id: "good",
    emoji: "☀️",
    label: "Sunny",
    value: 4,
    color: "from-yellow-400 to-orange-500",
    description: "Bright and positive",
  },
  {
    id: "hyped",
    emoji: "✨",
    label: "Radiant",
    value: 5,
    color: "from-purple-400 to-pink-500",
    description: "Energetic and inspired",
    pulse: true,
  },
];

export const SPACE_CATEGORIES: Array<{
  id: SpaceCategory;
  label: string;
  icon: string;
}> = [
  { id: "wellness", label: "Wellness", icon: "🧠" },
  { id: "creative", label: "Creative", icon: "🎨" },
  { id: "lifestyle", label: "Lifestyle", icon: "🏡" },
  { id: "learning", label: "Learning", icon: "📚" },
  { id: "community", label: "Community", icon: "👥" },
];

/* ======================================================
   RE-EXPORT ALIASES
====================================================== */

export type {
  MoodOption as Mood,
  DailyDrop as Drop,
  Space as CommunitySpace,
};
