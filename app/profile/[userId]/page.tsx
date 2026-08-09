"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BarChart3,
  Bookmark,
  Briefcase,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Grid3X3,
  Heart,
  ImageIcon,
  Languages,
  Linkedin,
  Link as LinkIcon,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  QrCode,
  Rocket,
  Save,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import ProfilePostMedia from "../../components/ProfilePostMedia";

type SocialLinks = {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
};

type ProfileSkill = string | { name?: string; title?: string; endorsements?: number };

type ProfileExperience = {
  company?: string;
  companyName?: string;
  logo?: string;
  position?: string;
  title?: string;
  employmentType?: string;
  duration?: string;
  location?: string;
  description?: string;
  achievements?: string[];
};

type ProfileEducation = {
  institute?: string;
  instituteName?: string;
  school?: string;
  logo?: string;
  degree?: string;
  field?: string;
  duration?: string;
  grade?: string;
  activities?: string;
};

type ProfileCertification = {
  title?: string;
  name?: string;
  issuer?: string;
  issueDate?: string;
  credentialUrl?: string;
};

type ProfileProject = {
  title?: string;
  name?: string;
  image?: string;
  description?: string;
  technologies?: string[];
  techStack?: string[];
  github?: string;
  liveDemo?: string;
  views?: number;
  likes?: number;
  bookmarks?: number;
};

type ProfileAchievement = {
  title?: string;
  name?: string;
  issuer?: string;
  date?: string;
  description?: string;
};

type ProfileLanguage = {
  name?: string;
  language?: string;
  proficiency?: string | number;
};

type ProfileRecommendation = {
  name?: string;
  author?: string;
  headline?: string;
  text?: string;
  createdAt?: string;
};

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  username?: string;
  cover?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  phone?: string;
  website?: string;
  status?: string;
  profession?: string;
  headline?: string;
  company?: string;
  education?: string;
  resume?: string;
  portfolio?: string;
  isPrivate?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  lastSeen?: string;
  profileViews?: number;
  connectionsCount?: number;
  social?: SocialLinks;
  skills?: ProfileSkill[];
  experiences?: ProfileExperience[];
  educationHistory?: ProfileEducation[];
  certifications?: ProfileCertification[];
  projects?: ProfileProject[];
  achievements?: ProfileAchievement[];
  languages?: ProfileLanguage[];
  interests?: string[];
  recommendations?: ProfileRecommendation[];
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  followsYou?: boolean;
  isMutualFollow?: boolean;
  canMessage?: boolean;
  canViewPosts?: boolean;
}

interface Post {
  id: string;
  content: string;
  media: string[];
  likes?: number;
  comments?: number;
  timestamp?: string;
  isLiked?: boolean;
}

interface ApiPost {
  _id?: string;
  id?: string;
  content?: string;
  images?: string[];
  image?: string;
  likes?: unknown[] | number;
  comments?: unknown[] | number;
  timestamp?: string;
  createdAt?: string;
  isLiked?: boolean;
}

interface PremiumStatus {
  isPremium: boolean;
  daysRemaining: number;
  premiumPlan?: string | null;
  paymentMethod?: {
    type?: string;
    brand?: string;
    last4?: string;
  } | null;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: Record<string, string>;
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
    };
  }
}

const activityTabs = ["Posts", "Reels", "Media", "Articles", "Likes", "Comments", "Bookmarks"] as const;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_COVER_IMAGE_SIZE = 8 * 1024 * 1024;

const cardMotion = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.38 },
};

function CountUp({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 850;
    const started = performance.now();
    let frame = 0;

    const tick = (time: number) => {
      const progress = Math.min((time - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeUrl(url?: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function isVideoMediaUrl(url?: string) {
  return Boolean(url && /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:$|[?#])/i.test(url));
}

function isSafeImageSrc(src?: string) {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

async function validateImageFile(file: File, maxSize: number) {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid image. Please upload a JPG, PNG, WebP, or AVIF file.");
  }

  if (file.size > maxSize) {
    throw new Error(`Image is too large. Please upload a file under ${Math.round(maxSize / 1024 / 1024)}MB.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } else {
      await new Promise<void>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Invalid image. Please upload a valid image file."));
        image.src = objectUrl;
      });
    }
  } catch {
    throw new Error("Invalid image. Please upload a valid image file.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadProfileImage(file: File, kind: "avatar" | "cover", userId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch(`/api/user/profile/${userId}/images`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== "string" || !isSafeImageSrc(data.url)) {
    throw new Error(data.error || "Invalid image. Please upload a valid image file.");
  }

  return data.url;
}

function cleanArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { onlineUsers } = useSocket();

  const userId = params.userId as string;
  const isCurrentUser = session?.user?.id === userId;
  const isUserOnline = onlineUsers.includes(userId);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumActionLoading, setPremiumActionLoading] = useState(false);
  const [premiumError, setPremiumError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof activityTabs)[number]>("Posts");
  const [contactOpen, setContactOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [imageError, setImageError] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    status: "",
    location: "",
    phone: "",
    website: "",
    profession: "",
    company: "",
    education: "",
    resume: "",
    portfolio: "",
    social: {
      instagram: "",
      twitter: "",
      linkedin: "",
      github: "",
    },
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/user/profile/${userId}`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch user profile");
        }

        const data = await response.json();
        const userData = data.user || data;
        const postsData: ApiPost[] = Array.isArray(data.posts) ? data.posts : [];

        setUser({
          id: userData._id || userData.id,
          name: userData.name || "OrbitByte Member",
          email: userData.email,
          username: userData.username,
          avatar: isSafeImageSrc(userData.avatar) ? userData.avatar : "",
          cover: isSafeImageSrc(userData.cover) ? userData.cover : "",
          bio: userData.bio,
          location: userData.location,
          joinedDate: userData.joinedDate || userData.createdAt,
          phone: userData.phone,
          website: userData.website,
          profession: userData.profession,
          headline: userData.headline,
          company: userData.company,
          education: userData.education,
          resume: userData.resume,
          portfolio: userData.portfolio,
          status: userData.status,
          social: userData.social || {},
          skills: cleanArray(userData.skills),
          experiences: cleanArray(userData.experiences || userData.experience),
          educationHistory: cleanArray(userData.educationHistory || userData.educations),
          certifications: cleanArray(userData.certifications || userData.certificates),
          projects: cleanArray(userData.projects),
          achievements: cleanArray(userData.achievements),
          languages: cleanArray(userData.languages),
          interests: cleanArray(userData.interests),
          recommendations: cleanArray(userData.recommendations),
          followersCount: userData.followersCount ?? 0,
          followingCount: userData.followingCount ?? 0,
          connectionsCount: userData.connectionsCount,
          profileViews: typeof userData.profileViews === "number" ? userData.profileViews : undefined,
          isFollowing: Boolean(data.isFollowing ?? userData.isFollowing),
          followsYou: Boolean(data.followsYou ?? userData.followsYou),
          isMutualFollow: Boolean(data.isMutualFollow ?? userData.isMutualFollow),
          canMessage: Boolean(data.canMessage ?? userData.canMessage),
          canViewPosts:
            data.canViewPosts !== undefined
              ? Boolean(data.canViewPosts)
              : Boolean(userData.canViewPosts),
          isPrivate: Boolean(data.isPrivate ?? userData.isPrivate),
          isPremium: Boolean(data.isPremium ?? userData.isPremium),
          isVerified: Boolean(data.isVerified ?? userData.isVerified ?? userData.emailVerified),
          isActive: userData.isActive ?? true,
          lastSeen: userData.lastSeen,
        });

        setPosts(
          postsData.map((post) => ({
            id: post._id || post.id || "",
            content: typeof post.content === "string" ? post.content : "",
            media: (Array.isArray(post.images) ? post.images : post.image ? [post.image] : [])
              .filter((src) => isVideoMediaUrl(src) || isSafeImageSrc(src)),
            likes: Array.isArray(post.likes) ? post.likes.length : post.likes || 0,
            comments: Array.isArray(post.comments) ? post.comments.length : post.comments || 0,
            timestamp: post.timestamp || post.createdAt,
            isLiked: post.isLiked || false,
          })),
        );
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchUserProfile();
  }, [userId]);

  const fetchPremiumStatus = useCallback(async () => {
    if (!isCurrentUser) return;

    setPremiumLoading(true);
    setPremiumError(null);
    try {
      const res = await fetch("/api/premium/status", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch premium status");
      }

      setPremiumStatus(await res.json());
    } catch (err) {
      setPremiumError(err instanceof Error ? err.message : "Failed to fetch premium status");
    } finally {
      setPremiumLoading(false);
    }
  }, [isCurrentUser]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  const mediaItems = useMemo(
    () =>
      posts.flatMap((post) =>
        post.media.map((src) => ({
          src,
          postId: post.id,
          isVideo: isVideoMediaUrl(src),
        })),
      ),
    [posts],
  );

  const photoItems = useMemo(() => mediaItems.filter((item) => !item.isVideo), [mediaItems]);
  const reelItems = useMemo(() => mediaItems.filter((item) => item.isVideo), [mediaItems]);
  const realLikes = useMemo(() => posts.reduce((sum, post) => sum + (post.likes || 0), 0), [posts]);
  const realComments = useMemo(() => posts.reduce((sum, post) => sum + (post.comments || 0), 0), [posts]);

  const completionItems = useMemo(() => {
    if (!user) return [];

    return [
      ["Cover image", Boolean(user.cover)],
      ["Profile photo", Boolean(user.avatar)],
      ["Bio", Boolean(user.bio)],
      ["Headline", Boolean(user.profession || user.headline)],
      ["Company", Boolean(user.company)],
      ["Education", Boolean(user.education || user.educationHistory?.length)],
      ["Website or portfolio", Boolean(user.website || user.portfolio)],
      ["Social link", Boolean(user.social && Object.values(user.social).some(Boolean))],
    ] as const;
  }, [user]);

  const completionPercent = useMemo(() => {
    if (!completionItems.length) return 0;
    return Math.round((completionItems.filter(([, done]) => done).length / completionItems.length) * 100);
  }, [completionItems]);

  const profileUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/profile/${userId}`;

  const isPremiumProfile = Boolean(user?.isPremium || premiumStatus?.isPremium);
  const canShowMessageButton = !isCurrentUser && Boolean(user?.canMessage);
  const canShowVideoButton = !isCurrentUser && Boolean(user?.isMutualFollow);
  const isPrivatePostsLocked = !isCurrentUser && Boolean(user?.isPrivate) && !Boolean(user?.canViewPosts);
  const canRenewPremium = !premiumStatus?.isPremium || premiumStatus.daysRemaining <= 1;
  const headline = user?.profession || user?.headline || "";
  const connectionCount =
    typeof user?.connectionsCount === "number"
      ? user.connectionsCount
      : Math.min(user?.followersCount || 0, user?.followingCount || 0);
  const activityTabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const theme = isPremiumProfile
    ? {
        page: "bg-[#080705] text-stone-50",
        surface: "border-amber-200/15 bg-[linear-gradient(145deg,rgba(24,20,15,.94),rgba(7,10,18,.96))] shadow-[0_28px_90px_rgba(217,119,6,.12)]",
        softSurface: "border-amber-200/15 bg-amber-100/[0.055]",
        text: "text-stone-50",
        muted: "text-stone-300",
        border: "border-amber-200/15",
        accent: "text-amber-300",
        accentBg: "bg-gradient-to-r from-amber-300 via-yellow-200 to-stone-100 text-stone-950",
        chip: "border-amber-200/15 bg-amber-200/[0.08] text-amber-100",
        iconBox: "bg-amber-300/10 text-amber-200",
        avatar: "bg-[conic-gradient(from_160deg,#fef3c7,#d97706,#111827,#fbbf24,#fef3c7)]",
      }
    : {
        page: "bg-[#f5f8ff] text-slate-950 dark:bg-[#070a12] dark:text-white",
        surface: "border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.045]",
        softSurface: "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
        text: "text-slate-950 dark:text-white",
        muted: "text-slate-600 dark:text-slate-300",
        border: "border-slate-200 dark:border-white/10",
        accent: "text-blue-700 dark:text-blue-300",
        accentBg: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white",
        chip: "border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-400/15 dark:bg-blue-400/10 dark:text-blue-200",
        iconBox: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200",
        avatar: "bg-gradient-to-br from-blue-500 via-cyan-400 to-indigo-600",
      };

  const openEdit = () => {
    if (!user) return;
    setEditForm({
      name: user.name || "",
      bio: user.bio || "",
      status: user.status || "",
      location: user.location || "",
      phone: user.phone || "",
      website: user.website || "",
      profession: user.profession || user.headline || "",
      company: user.company || "",
      education: user.education || "",
      resume: user.resume || "",
      portfolio: user.portfolio || "",
      social: {
        instagram: user.social?.instagram || "",
        twitter: user.social?.twitter || "",
        linkedin: user.social?.linkedin || "",
        github: user.social?.github || "",
      },
    });
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarPreview("");
    setCoverPreview("");
    setImageError("");
    setEditOpen(true);
  };

  const handleProfileInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    if (name.startsWith("social.")) {
      const socialKey = name.split(".")[1] as keyof typeof editForm.social;
      setEditForm((prev) => ({
        ...prev,
        social: { ...prev.social, [socialKey]: value },
      }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    setImageError("");
    try {
      const imageUpdates: { avatar?: string; cover?: string } = {};

      if (avatarFile) {
        imageUpdates.avatar = await uploadProfileImage(avatarFile, "avatar", user.id);
      }

      if (coverFile) {
        imageUpdates.cover = await uploadProfileImage(coverFile, "cover", user.id);
      }

      const res = await fetch(`/api/user/profile/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, ...imageUpdates }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      setUser((prev) =>
        prev
          ? {
              ...prev,
              ...editForm,
              ...imageUpdates,
              headline: editForm.profession,
              portfolio: editForm.portfolio,
            }
          : prev,
      );
      setEditOpen(false);
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview("");
      setCoverPreview("");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleImageSelection = async (file: File | undefined, kind: "avatar" | "cover") => {
    if (!file) return;

    setImageError("");
    try {
      await validateImageFile(file, kind === "avatar" ? MAX_PROFILE_IMAGE_SIZE : MAX_COVER_IMAGE_SIZE);
      const previewUrl = URL.createObjectURL(file);

      if (kind === "avatar") {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(previewUrl);
      } else {
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverFile(file);
        setCoverPreview(previewUrl);
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Invalid image. Please upload a valid image file.");
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  const handleActivatePremium = async () => {
    setPremiumActionLoading(true);
    setPremiumError(null);

    try {
      const res = await fetch("/api/premium/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start premium checkout");

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(script);
        });
      }

      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) throw new Error("Razorpay SDK unavailable");

      new RazorpayCheckout({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        order_id: data.orderId,
        prefill: data.prefill,
        handler: async (response: RazorpayPaymentResponse) => {
          const activateRes = await fetch("/api/premium/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (!activateRes.ok) throw new Error("Payment verification failed");

          await fetchPremiumStatus();
          window.dispatchEvent(new Event("orbitbyte:premium-status-changed"));
          setPremiumActionLoading(false);
        },
        modal: {
          ondismiss: () => {
            setPremiumActionLoading(false);
            setPremiumError("Payment was canceled.");
          },
        },
      }).open();
    } catch (err) {
      setPremiumError(err instanceof Error ? err.message : "Unable to start premium checkout");
      setPremiumActionLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!session || !user) return;

    const wasFollowing = user.isFollowing;
    setFollowLoading(true);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !wasFollowing,
            isMutualFollow: !wasFollowing ? Boolean(prev.followsYou) : false,
            followersCount: wasFollowing
              ? Math.max(0, (prev.followersCount ?? 0) - 1)
              : (prev.followersCount ?? 0) + 1,
          }
        : prev,
    );

    try {
      const response = await fetch(`/api/user/profile/${userId}/follow`, {
        method: wasFollowing ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("Failed to update follow status");

      const data = await response.json();
      setUser((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: data.isFollowing,
              followsYou: data.followsYou !== undefined ? Boolean(data.followsYou) : prev.followsYou,
              isMutualFollow:
                data.isMutualFollow !== undefined ? Boolean(data.isMutualFollow) : prev.isMutualFollow,
              canMessage: data.canMessage !== undefined ? Boolean(data.canMessage) : prev.canMessage,
              canViewPosts:
                data.canViewPosts !== undefined ? Boolean(data.canViewPosts) : prev.canViewPosts,
              followersCount: data.followersCount,
            }
          : prev,
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: wasFollowing,
              followersCount: wasFollowing
                ? (prev.followersCount ?? 0) + 1
                : Math.max(0, (prev.followersCount ?? 0) - 1),
            }
          : prev,
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;

    setDeletingId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch {
      alert("Failed to delete post");
    } finally {
      setDeletingId(null);
    }
  };

  const saveEdit = async (postId: string) => {
    if (!editPostText.trim()) return;
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, content: editPostText } : post)),
    );
    setEditingPostId(null);
    setEditPostText("");
  };

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes: (post.likes || 0) + (post.isLiked ? -1 : 1),
              isLiked: !post.isLiked,
            }
          : post,
      ),
    );
  };

  const shareProfile = async () => {
    const shareData = {
      title: `${user?.name || "OrbitByte"} on OrbitByte`,
      text: headline || user?.bio || "OrbitByte profile",
      url: profileUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (profileUrl) {
        await navigator.clipboard.writeText(profileUrl);
        alert("Profile link copied");
      }
    } catch {
      // Native share was dismissed.
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not added";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Offline";
    const diffMins = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getPostPreviewText = (content?: string) => {
    const normalized = content?.replace(/\s+/g, " ").trim() || "";
    return normalized.length > 96 ? `${normalized.slice(0, 93).trimEnd()}...` : normalized;
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#080b12]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40">
            <User className="h-10 w-10" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {error || "User not found"}
          </h1>
          <p className="mb-7 text-slate-600 dark:text-slate-400">
            The profile does not exist or you do not have permission to view it.
          </p>
          <button
            onClick={() => router.back()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const coverStyle = user.cover
    ? undefined
    : {
        backgroundImage: isPremiumProfile
          ? "radial-gradient(circle at 18% 12%, rgba(251,191,36,.34), transparent 30%), radial-gradient(circle at 82% 26%, rgba(120,53,15,.38), transparent 28%), linear-gradient(135deg, #080705 0%, #1c1917 48%, #030712 100%)"
          : "radial-gradient(circle at 18% 10%, rgba(59,130,246,.42), transparent 30%), radial-gradient(circle at 86% 28%, rgba(6,182,212,.34), transparent 26%), linear-gradient(135deg, #07111f 0%, #1d4ed8 48%, #111827 100%)",
      };

  const stats: Array<{
    label: string;
    value?: number;
    icon: React.ComponentType<{ className?: string }>;
    action?: () => void;
  }> = [
    { label: "Followers", value: user.followersCount || 0, icon: Users, action: () => router.push(`/profile/${userId}/followers`) },
    { label: "Following", value: user.followingCount || 0, icon: UserCheck, action: () => router.push(`/profile/${userId}/following`) },
    { label: "Connections", value: connectionCount, icon: LinkIcon },
    { label: "Profile Views", value: user.profileViews, icon: Eye },
    { label: "Posts", value: posts.length, icon: FileText },
    { label: "Media", value: mediaItems.length, icon: ImageIcon },
    { label: "Reels", value: reelItems.length, icon: Video },
    { label: "Likes", value: realLikes, icon: Heart },
    { label: "Comments", value: realComments, icon: MessageCircle },
  ];

  const actionButtons: Array<{
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
    action?: () => void;
    show?: boolean;
  }> = [
    { Icon: Edit3, label: "Edit Profile", action: openEdit, show: isCurrentUser },
    { Icon: Plus, label: "Add Section", action: openEdit, show: isCurrentUser },
    { Icon: FileText, label: "View Resume", action: user.resume ? () => window.open(normalizeUrl(user.resume), "_blank") : undefined },
    { Icon: Download, label: "Download Resume", action: user.resume ? () => window.open(normalizeUrl(user.resume), "_blank") : undefined },
    { Icon: Mail, label: "Contact Info", action: () => setContactOpen(true) },
    { Icon: Rocket, label: "Portfolio", action: user.portfolio || user.website ? () => window.open(normalizeUrl(user.portfolio || user.website), "_blank") : undefined },
    { Icon: QrCode, label: "QR Code" },
    { Icon: Share2, label: "Share Profile", action: shareProfile },
  ];

  const selectActivityTab = (tab: (typeof activityTabs)[number]) => {
    setActiveTab(tab);
    activityTabRefs.current[tab]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  return (
    <div className={`min-h-screen overflow-x-hidden ${theme.page}`}>
      <div className={`sticky top-0 z-40 max-w-full border-b backdrop-blur-2xl ${isPremiumProfile ? "border-amber-200/10 bg-[#080705]/82" : "border-white/70 bg-white/80 dark:border-white/10 dark:bg-[#070a12]/80"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <button
            onClick={() => router.back()}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-2.5 py-2 text-sm font-semibold transition sm:px-3 ${isPremiumProfile ? "text-stone-300 hover:bg-amber-200/10 hover:text-amber-100" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <Avatar name={user.name} src={user.avatar} size="small" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className={`truncate text-xs ${theme.muted}`}>{headline || user.username || "Profile"}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {isCurrentUser ? (
              <button onClick={openEdit} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${theme.accentBg}`}>
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <button onClick={handleFollowToggle} disabled={followLoading} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition disabled:opacity-60 sm:px-4 ${theme.accentBg}`}>
                {user.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {user.isFollowing ? "Following" : "Connect"}
              </button>
            )}
            <button onClick={shareProfile} aria-label="Share profile" className={`rounded-full border p-2.5 transition ${theme.softSurface}`}>
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-5 lg:pb-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`max-w-full overflow-hidden rounded-2xl border sm:rounded-[2rem] ${theme.surface}`}
        >
          <div className="relative h-48 overflow-hidden sm:h-72 lg:h-80" style={coverStyle}>
            {user.cover && (
              <SafeProfileImage src={user.cover} alt={`${user.name} cover`} fill priority sizes="100vw" className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/16 to-transparent" />
            <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 sm:left-5 sm:top-5 sm:gap-2">
              {isPremiumProfile && <Badge icon={Sparkles} label="Premium Member" premium />}
              {user.isVerified && <Badge icon={BadgeCheck} label="Verified" />}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur">
                <span className={`h-2 w-2 rounded-full ${isUserOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
                {isUserOnline ? "Online" : formatLastSeen(user.lastSeen)}
              </span>
            </div>
            {isCurrentUser && (
              <button onClick={openEdit} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-white sm:bottom-auto sm:top-4">
                <Camera className="h-4 w-4" />
                Edit Cover
              </button>
            )}
          </div>

          <div className="relative px-3 pb-5 sm:px-8 sm:pb-6 lg:px-10">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:gap-5 lg:-mt-20 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className={`relative h-24 w-24 shrink-0 rounded-full p-1 shadow-2xl min-[390px]:h-28 min-[390px]:w-28 sm:h-32 sm:w-32 sm:p-1.5 lg:h-44 lg:w-44 ${theme.avatar} ${isPremiumProfile ? "shadow-amber-500/20" : ""}`}>
                  <Avatar name={user.name} src={user.avatar} size="large" />
                  <span className={`absolute bottom-5 right-3 h-5 w-5 rounded-full border-4 ${isPremiumProfile ? "border-[#080705]" : "border-white dark:border-[#070a12]"} ${isUserOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                </div>

                <div className="min-w-0 max-w-3xl pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className={`max-w-full break-words text-2xl font-bold tracking-normal sm:text-3xl lg:text-4xl ${theme.text}`}>{user.name}</h1>
                    {user.isVerified && <BadgeCheck className={`h-6 w-6 ${theme.accent}`} />}
                  </div>
                  <p className={`mt-1 max-w-full truncate text-sm font-medium ${theme.muted}`}>
                    @{user.username || user.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/\.$/, "")}
                  </p>
                  {headline ? (
                    <p className={`mt-3 max-w-2xl break-words text-base font-semibold sm:text-lg ${theme.text}`}>{headline}</p>
                  ) : (
                    <InlineEmpty text={isCurrentUser ? "Add a professional headline." : "No headline added."} />
                  )}
                  {user.bio ? (
                    <p className={`mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-6 ${theme.muted}`}>{user.bio}</p>
                  ) : (
                    <InlineEmpty text={isCurrentUser ? "Add a bio to introduce your profile." : "No bio added."} />
                  )}
                  <div className={`mt-4 flex min-w-0 flex-wrap gap-3 text-sm ${theme.muted}`}>
                    <MetaItem icon={Briefcase} value={user.company} emptyLabel={isCurrentUser ? "Add company" : undefined} />
                    <MetaItem icon={GraduationCap} value={user.education} emptyLabel={isCurrentUser ? "Add education" : undefined} />
                    <MetaItem icon={MapPin} value={user.location} emptyLabel={isCurrentUser ? "Add location" : undefined} />
                    {user.website && (
                      <a href={normalizeUrl(user.website)} target="_blank" rel="noreferrer" className={`inline-flex min-w-0 max-w-full items-center gap-1.5 font-semibold hover:underline ${theme.accent}`}>
                        <Globe className="h-4 w-4" />
                        <span className="truncate">{user.website.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Joined {formatDate(user.joinedDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-wrap gap-2 pb-1 lg:w-auto lg:justify-end">
                {!isCurrentUser && (
                  <>
                    <button onClick={handleFollowToggle} disabled={followLoading} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-lg transition hover:scale-[1.02] disabled:opacity-60 sm:flex-none ${theme.accentBg}`}>
                      {user.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      {user.isFollowing ? "Following" : "Connect"}
                    </button>
                    {canShowMessageButton && (
                      <button onClick={() => router.push(`/chat?userId=${userId}`)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition sm:flex-none ${theme.softSurface}`}>
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </button>
                    )}
                    {canShowVideoButton && (
                      <button className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition sm:flex-none ${theme.softSurface}`}>
                        <Video className="h-4 w-4" />
                        Video
                      </button>
                    )}
                  </>
                )}
                {isCurrentUser && (
                  <button onClick={openEdit} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-lg transition hover:scale-[1.02] sm:flex-none ${theme.accentBg}`}>
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </button>
                )}
                <button onClick={() => setContactOpen(true)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-bold transition sm:flex-none ${theme.softSurface}`}>
                  <Mail className="h-4 w-4" />
                  Contact
                </button>
                <MoreMenu
                  open={moreOpen}
                  setOpen={setMoreOpen}
                  theme={theme}
                  onShare={shareProfile}
                  onSettings={() => router.push("/settings")}
                  showSettings={isCurrentUser}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:mt-6 sm:gap-3 sm:grid-cols-3">
              <InfoTile theme={theme} label="Profile Completion" icon={Target}>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-2xl font-black">{completionPercent}%</span>
                </div>
                <div className={`mt-3 h-2 overflow-hidden rounded-full ${isPremiumProfile ? "bg-amber-50/10" : "bg-slate-200 dark:bg-white/10"}`}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${completionPercent}%` }} transition={{ duration: 0.9 }} className={`h-full rounded-full ${isPremiumProfile ? "bg-gradient-to-r from-amber-400 to-yellow-100" : "bg-gradient-to-r from-blue-600 to-cyan-400"}`} />
                </div>
              </InfoTile>
              <InfoTile theme={theme} label="Availability" icon={CircleDot}>
                <p className="mt-2 text-lg font-black">{user.status || (isUserOnline ? "Online now" : "Not specified")}</p>
              </InfoTile>
              <InfoTile theme={theme} label="Company" icon={Briefcase}>
                <p className="mt-2 text-lg font-black">{user.company || "Not added"}</p>
              </InfoTile>
            </div>
          </div>
        </motion.section>

        <section className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-9">
          {stats.map(({ label, value, icon: Icon, action }, index) => (
            <motion.button key={label} {...cardMotion} transition={{ duration: 0.35, delay: index * 0.025 }} onClick={action} className={`group min-w-0 rounded-2xl border p-3 text-left transition hover:-translate-y-1 hover:shadow-xl sm:p-4 ${theme.surface}`}>
              <Icon className={`mb-3 h-5 w-5 ${theme.accent}`} />
              <p className="break-words text-xl font-black sm:text-2xl">{typeof value === "number" ? <CountUp value={value} /> : <span className="text-sm sm:text-base">Not available</span>}</p>
              <p className={`mt-1 text-xs font-bold uppercase ${theme.muted}`}>{label}</p>
            </motion.button>
          ))}
        </section>

        <div className="mt-5 grid min-w-0 gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            <motion.section {...cardMotion} className={`rounded-3xl border p-4 sm:p-6 ${theme.surface}`}>
              <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                {actionButtons.filter((button) => button.show !== false).map(({ Icon, label, action }) => (
                  <button key={label} onClick={action} disabled={!action && !["QR Code"].includes(label)} className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.chip}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.section>

            <InstagramPanel
              theme={theme}
              posts={posts}
              mediaItems={mediaItems}
              photoItems={photoItems}
              reelItems={reelItems}
              isCurrentUser={isCurrentUser}
              routerPush={(postId) => router.push(`/feed?postId=${encodeURIComponent(postId)}`)}
              getPostPreviewText={getPostPreviewText}
            />

            <CollapsibleSection title="About" icon={User} theme={theme} defaultOpen>
              {user.bio ? (
                <p className={`whitespace-pre-line leading-7 ${theme.muted}`}>{user.bio}</p>
              ) : (
                <EmptyState icon={User} title="No about section yet" description={isCurrentUser ? "Add a bio to help visitors understand your story and goals." : "This member has not added an about section."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Experience" icon={Briefcase} theme={theme}>
              {user.experiences?.length ? (
                <div className="space-y-5">
                  {user.experiences.map((item, index) => (
                    <TimelineItem key={`${item.company || item.companyName || index}`} theme={theme} logo={item.logo} fallback={item.company || item.companyName || item.position || item.title} title={item.position || item.title || "Untitled role"} subtitle={item.company || item.companyName || "Company not added"} meta={[item.employmentType, item.duration, item.location].filter(Boolean).join(" · ")} description={item.description} achievements={item.achievements} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Briefcase} title="No experience added" description={isCurrentUser ? "Add work experience to make your profile more professional." : "This member has not added experience."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Education" icon={GraduationCap} theme={theme}>
              {user.educationHistory?.length ? (
                <div className="space-y-5">
                  {user.educationHistory.map((item, index) => (
                    <TimelineItem key={`${item.institute || item.school || index}`} theme={theme} logo={item.logo} fallback={item.institute || item.instituteName || item.school || item.degree} title={item.degree || "Degree not added"} subtitle={item.institute || item.instituteName || item.school || "Institute not added"} meta={[item.field, item.duration, item.grade].filter(Boolean).join(" · ")} description={item.activities} />
                  ))}
                </div>
              ) : user.education ? (
                <TimelineItem theme={theme} fallback={user.education} title={user.education} subtitle="Education" />
              ) : (
                <EmptyState icon={GraduationCap} title="No education added" description={isCurrentUser ? "Add your education to complete your professional background." : "This member has not added education."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Skills" icon={Code2} theme={theme}>
              {user.skills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => {
                    const name = typeof skill === "string" ? skill : skill.name || skill.title;
                    const endorsements = typeof skill === "string" ? undefined : skill.endorsements;
                    if (!name) return null;
                    return (
                      <span key={`${name}-${index}`} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${theme.chip}`}>
                        {name}
                        {typeof endorsements === "number" && <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">{endorsements}</span>}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Code2} title="No skills added" description={isCurrentUser ? "Add skills so people can understand what you do best." : "This member has not added skills."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Certifications" icon={Award} theme={theme}>
              {user.certifications?.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {user.certifications.map((cert, index) => (
                    <DataCard key={`${cert.title || cert.name || index}`} theme={theme} icon={Award} title={cert.title || cert.name || "Untitled certificate"} subtitle={[cert.issuer, cert.issueDate].filter(Boolean).join(" · ")} href={cert.credentialUrl} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Award} title="No certifications added" description={isCurrentUser ? "Add certificates or credentials to strengthen your profile." : "This member has not added certifications."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Projects" icon={Rocket} theme={theme}>
              {user.projects?.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {user.projects.map((project, index) => (
                    <ProjectCard key={`${project.title || project.name || index}`} project={project} theme={theme} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Rocket} title="No projects added" description={isCurrentUser ? "Add projects to showcase what you have built." : "This member has not added projects."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Achievements" icon={Trophy} theme={theme}>
              {user.achievements?.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {user.achievements.map((achievement, index) => (
                    <DataCard key={`${achievement.title || achievement.name || index}`} theme={theme} icon={Trophy} title={achievement.title || achievement.name || "Untitled achievement"} subtitle={[achievement.issuer, achievement.date].filter(Boolean).join(" · ")} description={achievement.description} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Trophy} title="No achievements added" description={isCurrentUser ? "Add awards, badges, hackathons, or competitions." : "This member has not added achievements."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Languages & Interests" icon={Languages} theme={theme}>
              {user.languages?.length || user.interests?.length ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    {user.languages?.map((language, index) => (
                      <div key={`${language.name || language.language || index}`} className={`rounded-2xl border p-4 ${theme.softSurface}`}>
                        <p className="font-black">{language.name || language.language || "Language"}</p>
                        {language.proficiency && <p className={`mt-1 text-sm ${theme.muted}`}>{language.proficiency}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap content-start gap-2">
                    {user.interests?.map((interest) => (
                      <span key={interest} className={`rounded-full border px-3 py-2 text-sm font-bold ${theme.chip}`}>{interest}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState icon={Languages} title="No languages or interests added" description={isCurrentUser ? "Add languages and interests to make your profile more discoverable." : "This member has not added languages or interests."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Resume & Portfolio" icon={Download} theme={theme}>
              {user.resume || user.portfolio || user.website ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <DataCard theme={theme} icon={FileText} title="Resume" subtitle={user.resume ? "Available" : "Not added"} href={user.resume ? normalizeUrl(user.resume) : undefined} />
                  <DataCard theme={theme} icon={Globe} title="Portfolio" subtitle={user.portfolio || user.website || "Not added"} href={normalizeUrl(user.portfolio || user.website)} />
                </div>
              ) : (
                <EmptyState icon={Download} title="No resume or portfolio added" description={isCurrentUser ? "Add a resume or portfolio link for visitors." : "This member has not added a resume or portfolio."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Recommendations" icon={Star} theme={theme}>
              {user.recommendations?.length ? (
                <div className="space-y-4">
                  {user.recommendations.map((item, index) => (
                    <DataCard key={`${item.name || item.author || index}`} theme={theme} icon={Star} title={item.name || item.author || "Recommendation"} subtitle={item.headline || formatDate(item.createdAt)} description={item.text} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Star} title="No recommendations yet" description={isCurrentUser ? "Recommendations you receive will appear here." : "This member has not received recommendations yet."} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Activity Feed" icon={BarChart3} theme={theme} defaultOpen>
              <div className="scrollbar-hide -mx-1 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-2">
                <div className="flex w-max snap-x snap-mandatory gap-2">
                  {activityTabs.map((tab) => (
                    <button
                      key={tab}
                      ref={(node) => {
                        activityTabRefs.current[tab] = node;
                      }}
                      onClick={() => selectActivityTab(tab)}
                      className={`min-h-11 shrink-0 snap-center rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === tab ? theme.accentBg : theme.chip}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mt-5">
                  {activeTab === "Posts" && (
                    <PostActivity
                      posts={posts}
                      isCurrentUser={isCurrentUser}
                      isPrivatePostsLocked={isPrivatePostsLocked}
                      editingPostId={editingPostId}
                      editPostText={editPostText}
                      deletingId={deletingId}
                      setEditingPostId={setEditingPostId}
                      setEditPostText={setEditPostText}
                      saveEdit={saveEdit}
                      deletePost={deletePost}
                      toggleLike={toggleLike}
                      routerPush={(postId) => router.push(`/feed?postId=${encodeURIComponent(postId)}`)}
                      formatDate={formatDate}
                      getPostPreviewText={getPostPreviewText}
                    />
                  )}
                  {activeTab === "Reels" && <MediaGrid items={reelItems} routerPush={(postId) => router.push(`/feed?postId=${encodeURIComponent(postId)}`)} emptyTitle="No reels yet" emptyDescription={isCurrentUser ? "Video posts will appear here." : "This member has not shared reels."} />}
                  {activeTab === "Media" && <MediaGrid items={mediaItems} routerPush={(postId) => router.push(`/feed?postId=${encodeURIComponent(postId)}`)} emptyTitle="No media yet" emptyDescription={isCurrentUser ? "Photos and videos from posts will appear here." : "This member has not shared media."} />}
                  {["Articles", "Likes", "Comments", "Bookmarks"].includes(activeTab) && (
                    <EmptyState icon={Lock} title={`No ${activeTab.toLowerCase()} available`} description={activeTab === "Bookmarks" ? "Saved posts are private." : "This tab has no available data yet."} />
                  )}
                </motion.div>
              </AnimatePresence>
            </CollapsibleSection>

            <div className="space-y-5 lg:hidden">
              <MobileInsightSections
                theme={theme}
                completionPercent={completionPercent}
                completionItems={completionItems}
                premiumError={premiumError}
              />
            </div>
          </div>

          <aside className="hidden space-y-5 lg:sticky lg:top-20 lg:block lg:self-start">
            {isCurrentUser && (
              <SidebarCard title="Premium Membership" icon={Sparkles} theme={theme}>
                <p className={`text-sm ${theme.muted}`}>
                  {premiumLoading
                    ? "Checking premium status..."
                    : premiumStatus?.isPremium
                      ? `Active, ${premiumStatus.daysRemaining} day(s) left`
                      : "Inactive"}
                </p>
                {premiumStatus?.paymentMethod?.last4 && (
                  <p className={`mt-2 text-xs ${theme.muted}`}>
                    {premiumStatus.paymentMethod.brand || "Card"} ending in {premiumStatus.paymentMethod.last4}
                  </p>
                )}
                {canRenewPremium && (
                  <button onClick={handleActivatePremium} disabled={premiumActionLoading || premiumLoading} className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-black disabled:opacity-60 ${theme.accentBg}`}>
                    {premiumActionLoading ? "Redirecting..." : premiumStatus?.isPremium ? "Renew Premium" : "Activate Premium"}
                  </button>
                )}
                {premiumError && <p className="mt-3 text-xs text-red-500">{premiumError}</p>}
              </SidebarCard>
            )}

            <ProfileStrength theme={theme} completionPercent={completionPercent} completionItems={completionItems} />
            <SidebarCard title="Recent Visitors" icon={Eye} theme={theme}>
              <EmptyMini title="No visitor data available" />
            </SidebarCard>
            <SidebarCard title="Suggested Connections" icon={Users} theme={theme}>
              <EmptyMini title="No suggestions available" />
            </SidebarCard>
            <SidebarCard title="Communities" icon={CircleDot} theme={theme}>
              <EmptyMini title="No communities joined" />
            </SidebarCard>
            <SidebarCard title="Trending Topics" icon={TrendingUp} theme={theme}>
              <EmptyMini title="No trending topics available" />
            </SidebarCard>
            <SidebarCard title="Recent Activity" icon={BarChart3} theme={theme}>
              {posts[0] ? (
                <button onClick={() => router.push(`/feed?postId=${encodeURIComponent(posts[0].id)}`)} className={`w-full rounded-2xl border p-3 text-left text-sm ${theme.softSurface}`}>
                  <p className="font-bold">Latest post</p>
                  <p className={`mt-1 line-clamp-2 ${theme.muted}`}>{getPostPreviewText(posts[0].content) || "Media post"}</p>
                </button>
              ) : (
                <EmptyMini title="No recent activity" />
              )}
            </SidebarCard>
            <SidebarCard title="AI Suggestions" icon={Sparkles} theme={theme}>
              <EmptyMini title={isCurrentUser ? "AI suggestions will appear when profile analysis data is available" : "No AI suggestions available"} />
            </SidebarCard>
            <SidebarCard title="Upcoming Events" icon={Calendar} theme={theme}>
              <EmptyMini title="No upcoming events" />
            </SidebarCard>
          </aside>
        </div>
      </main>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t px-3 py-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden ${isPremiumProfile ? "border-amber-200/10 bg-[#080705]/90" : "border-slate-200 bg-white/90 dark:border-white/10 dark:bg-[#070a12]/90"}`}>
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button onClick={isCurrentUser ? openEdit : handleFollowToggle} className={`min-h-11 truncate rounded-full px-2 py-3 text-sm font-bold ${theme.accentBg}`}>
            {isCurrentUser ? "Edit" : user.isFollowing ? "Following" : "Connect"}
          </button>
          <button onClick={() => setContactOpen(true)} className={`min-h-11 truncate rounded-full border px-2 py-3 text-sm font-bold ${theme.softSurface}`}>
            Contact
          </button>
          <button onClick={shareProfile} className={`min-h-11 truncate rounded-full border px-2 py-3 text-sm font-bold ${theme.softSurface}`}>
            Share
          </button>
        </div>
      </div>

      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Contact Information" theme={theme}>
        <div className="space-y-3">
          <ContactRow icon={Mail} label="Email" value={user.email} href={user.email ? `mailto:${user.email}` : undefined} theme={theme} />
          <ContactRow icon={Phone} label="Phone" value={user.phone} href={user.phone ? `tel:${user.phone}` : undefined} theme={theme} />
          <ContactRow icon={Globe} label="Website" value={user.website} href={normalizeUrl(user.website)} theme={theme} />
          <ContactRow icon={Github} label="GitHub" value={user.social?.github} href={normalizeUrl(user.social?.github)} theme={theme} />
          <ContactRow icon={Linkedin} label="LinkedIn" value={user.social?.linkedin} href={normalizeUrl(user.social?.linkedin)} theme={theme} />
          <ContactRow icon={Rocket} label="Portfolio" value={user.portfolio} href={normalizeUrl(user.portfolio)} theme={theme} />
          <ContactRow icon={MapPin} label="Location" value={user.location} theme={theme} />
          <ContactRow icon={QrCode} label="Profile URL" value={profileUrl} href={profileUrl} theme={theme} />
          {!user.email && !user.phone && !user.website && !user.portfolio && !user.location && !Object.values(user.social || {}).some(Boolean) && (
            <EmptyState icon={Mail} title="No contact information" description={isCurrentUser ? "Add contact links from edit profile." : "This member has not shared contact information."} />
          )}
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" theme={theme}>
        <div className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
          <div className={`rounded-2xl border p-4 ${theme.softSurface}`}>
            <p className={`mb-3 text-xs font-bold uppercase ${theme.muted}`}>Live Preview</p>
            <div className="flex items-center gap-3">
              <Avatar name={editForm.name || user.name} src={avatarPreview || user.avatar} size="preview" />
              <div>
                <p className="font-black">{editForm.name || user.name}</p>
                <p className={`text-sm ${theme.muted}`}>{editForm.profession || "Professional headline"}</p>
              </div>
            </div>
          </div>

          <Input label="Full Name" name="name" value={editForm.name} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Professional Headline" name="profession" value={editForm.profession} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Company" name="company" value={editForm.company} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Availability / Status" name="status" value={editForm.status} onChange={handleProfileInputChange} theme={theme} />
          <Textarea label="Bio" name="bio" value={editForm.bio} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Location" name="location" value={editForm.location} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Education" name="education" value={editForm.education} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Website" name="website" value={editForm.website} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Portfolio" name="portfolio" value={editForm.portfolio} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Resume URL" name="resume" value={editForm.resume} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Phone" name="phone" value={editForm.phone} onChange={handleProfileInputChange} theme={theme} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploadDropzone
              label="Profile photo"
              kind="avatar"
              preview={avatarPreview || user.avatar || ""}
              onSelect={handleImageSelection}
              theme={theme}
            />
            <ImageUploadDropzone
              label="Cover image"
              kind="cover"
              preview={coverPreview || user.cover || ""}
              onSelect={handleImageSelection}
              theme={theme}
            />
          </div>
          {imageError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {imageError}
            </div>
          )}
          <Input label="GitHub" name="social.github" value={editForm.social.github} onChange={handleProfileInputChange} theme={theme} />
          <Input label="LinkedIn" name="social.linkedin" value={editForm.social.linkedin} onChange={handleProfileInputChange} theme={theme} />
          <Input label="X / Twitter" name="social.twitter" value={editForm.social.twitter} onChange={handleProfileInputChange} theme={theme} />
          <Input label="Instagram" name="social.instagram" value={editForm.social.instagram} onChange={handleProfileInputChange} theme={theme} />

          <div className={`sticky bottom-0 flex gap-3 border-t pt-4 ${isPremiumProfile ? "border-amber-200/10 bg-[#10100d]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#101624]"}`}>
            <button onClick={saveProfile} disabled={savingProfile} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black disabled:opacity-60 ${theme.accentBg}`}>
              <Save className="h-4 w-4" />
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditOpen(false)} className={`rounded-full border px-5 py-3 text-sm font-black ${theme.softSurface}`}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#080b12] dark:text-white">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="mb-5 h-12 w-44 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-80 rounded-[2rem] bg-slate-200 dark:bg-white/10" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-9">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-slate-200 dark:bg-white/10" />
          ))}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-56 rounded-3xl bg-slate-200 dark:bg-white/10" />
            ))}
          </div>
          <div className="hidden space-y-5 lg:block">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 rounded-3xl bg-slate-200 dark:bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafeProfileImage({
  src,
  alt,
  className,
  fill,
  priority,
  sizes,
  width,
  height,
  fallback,
}: {
  src?: string;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const canRender = Boolean(src && (isSafeImageSrc(src) || src.startsWith("blob:")) && !failed);

  if (!canRender) return <>{fallback || null}</>;

  if (src?.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
    );
  }

  return (
    <Image
      src={src || ""}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      width={width}
      height={height}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function Avatar({ name, src, size }: { name: string; src?: string; size: "small" | "large" | "preview" }) {
  const sizeClass =
    size === "large" ? "h-full w-full" : size === "preview" ? "h-14 w-14" : "h-9 w-9";
  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-xl font-black">
      {initials(name)}
    </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-full bg-slate-950 text-white ring-4 ring-white/85 dark:ring-[#070a12] ${sizeClass}`}>
      <SafeProfileImage
        src={src}
        alt={name}
        fill
        priority={size === "large"}
        sizes={size === "large" ? "176px" : "56px"}
        className="h-full w-full object-cover"
        fallback={fallback}
      />
    </div>
  );
}

function ImageUploadDropzone({
  label,
  kind,
  preview,
  onSelect,
  theme,
}: {
  label: string;
  kind: "avatar" | "cover";
  preview: string;
  onSelect: (file: File | undefined, kind: "avatar" | "cover") => void;
  theme: Theme;
}) {
  const inputId = `profile-${kind}-upload`;

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    onSelect(event.dataTransfer.files?.[0], kind);
  };

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={`group block cursor-pointer rounded-2xl border border-dashed p-4 transition hover:scale-[1.01] ${theme.softSurface}`}
    >
      <span className={`mb-3 block text-xs font-bold uppercase ${theme.muted}`}>{label}</span>
      <div className={`relative mb-3 overflow-hidden rounded-xl bg-black/10 ${kind === "avatar" ? "mx-auto h-24 w-24 rounded-full" : "h-28 w-full"}`}>
        <SafeProfileImage
          src={preview}
          alt={`${label} preview`}
          fill
          sizes={kind === "avatar" ? "96px" : "320px"}
          className="h-full w-full object-cover"
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              {kind === "avatar" ? <User className="h-8 w-8 opacity-60" /> : <ImageIcon className="h-8 w-8 opacity-60" />}
            </div>
          }
        />
      </div>
      <span className={`flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${theme.chip}`}>
        <Upload className="h-4 w-4" />
        Upload image
      </span>
      <span className={`mt-2 block text-center text-xs ${theme.muted}`}>
        JPG, PNG, WebP, or AVIF. {kind === "avatar" ? "Max 5MB." : "Max 8MB."}
      </span>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => onSelect(event.target.files?.[0], kind)}
      />
    </label>
  );
}

function Badge({
  icon: Icon,
  label,
  premium,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  premium?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-lg ${premium ? "bg-amber-300 text-stone-950" : "bg-white/90 text-slate-950"}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function MetaItem({
  icon: Icon,
  value,
  emptyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value?: string;
  emptyLabel?: string;
}) {
  if (!value && !emptyLabel) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      {value || emptyLabel}
    </span>
  );
}

function InlineEmpty({ text }: { text: string }) {
  return <p className="mt-3 text-sm italic text-slate-500 dark:text-slate-400">{text}</p>;
}

type Theme = {
  page: string;
  surface: string;
  softSurface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentBg: string;
  chip: string;
  iconBox: string;
  avatar: string;
};

function InfoTile({
  theme,
  label,
  icon: Icon,
  children,
}: {
  theme: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${theme.softSurface}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold uppercase ${theme.muted}`}>{label}</p>
        <Icon className={`h-5 w-5 ${theme.accent}`} />
      </div>
      {children}
    </div>
  );
}

function MoreMenu({
  open,
  setOpen,
  theme,
  onShare,
  onSettings,
  showSettings,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  theme: Theme;
  onShare: () => void;
  onSettings: () => void;
  showSettings: boolean;
}) {
  const items = [
    { Icon: QrCode, label: "QR Code" },
    { Icon: Share2, label: "Share Profile", action: onShare },
    ...(showSettings ? [{ Icon: Settings, label: "Profile Settings", action: onSettings }] : []),
  ];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="More profile options" className={`rounded-full border p-3 transition ${theme.softSurface}`}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} className={`absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border p-2 shadow-2xl ${theme.surface}`}>
            {items.map(({ Icon, label, action }) => (
              <button key={label} onClick={() => { setOpen(false); action?.(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/10 ${theme.muted}`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InstagramPanel({
  theme,
  posts,
  mediaItems,
  photoItems,
  reelItems,
  isCurrentUser,
  routerPush,
  getPostPreviewText,
}: {
  theme: Theme;
  posts: Post[];
  mediaItems: Array<{ src: string; postId: string; isVideo: boolean }>;
  photoItems: Array<{ src: string; postId: string; isVideo: boolean }>;
  reelItems: Array<{ src: string; postId: string; isVideo: boolean }>;
  isCurrentUser: boolean;
  routerPush: (postId: string) => void;
  getPostPreviewText: (content?: string) => string;
}) {
  return (
    <motion.section {...cardMotion} className={`rounded-3xl border p-5 sm:p-6 ${theme.surface}`}>
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${theme.iconBox}`}>
          <Grid3X3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black">Visual Profile</h2>
          <p className={`text-sm ${theme.muted}`}>Posts, media, reels, tagged, and saved surfaces.</p>
        </div>
      </div>

      <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
        {posts.slice(0, 8).map((post) => (
          <button key={post.id} onClick={() => routerPush(post.id)} className="w-20 shrink-0 text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border p-1 ${theme.avatar}`}>
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-950 text-white">
                {post.media[0] && !isVideoMediaUrl(post.media[0]) ? (
                  <SafeProfileImage src={post.media[0]} alt="Story highlight" width={64} height={64} className="h-full w-full object-cover" fallback={<FileText className="h-5 w-5" />} />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
            </div>
            <p className={`mt-2 truncate text-xs font-bold ${theme.muted}`}>{getPostPreviewText(post.content) || "Post"}</p>
          </button>
        ))}
        {!posts.length && (
          <div className={`w-full rounded-2xl border p-5 ${theme.softSurface}`}>
            <EmptyState icon={CircleDot} title="No story highlights" description={isCurrentUser ? "Highlights will appear after you share posts." : "This member has no highlights."} compact />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MediaPreview title="Photo Grid" items={photoItems} theme={theme} routerPush={routerPush} empty="No photos yet" />
        <MediaPreview title="Reels Grid" items={reelItems} theme={theme} routerPush={routerPush} empty="No reels yet" />
        <MediaPreview title="Media Gallery" items={mediaItems} theme={theme} routerPush={routerPush} empty="No media yet" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <EmptyCompact theme={theme} icon={Users} title="Mutual followers" description="No mutual follower data available." />
        <EmptyCompact theme={theme} icon={User} title="Tagged posts" description="No tagged posts available." />
        <EmptyCompact theme={theme} icon={Bookmark} title="Saved posts" description="Saved posts are private." />
      </div>
    </motion.section>
  );
}

function MediaPreview({
  title,
  items,
  theme,
  routerPush,
  empty,
}: {
  title: string;
  items: Array<{ src: string; postId: string; isVideo: boolean }>;
  theme: Theme;
  routerPush: (postId: string) => void;
  empty: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide">{title}</h3>
      {items.length ? (
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl">
          {items.slice(0, 9).map((item, index) => (
            <button key={`${item.src}-${index}`} onClick={() => routerPush(item.postId)} className="relative aspect-square bg-black/10">
              {item.isVideo ? (
                <>
                  <video src={item.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <Video className="absolute right-1.5 top-1.5 h-4 w-4 text-white drop-shadow" />
                </>
              ) : (
                <SafeProfileImage src={item.src} alt={title} fill sizes="120px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl border p-4 ${theme.softSurface}`}>
          <EmptyState icon={ImageIcon} title={empty} description="This section will update when matching media exists." compact />
        </div>
      )}
    </div>
  );
}

function MediaGrid({
  items,
  routerPush,
  emptyTitle,
  emptyDescription,
}: {
  items: Array<{ src: string; postId: string; isVideo: boolean }>;
  routerPush: (postId: string) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!items.length) return <EmptyState icon={ImageIcon} title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item, index) => (
        <button key={`${item.src}-${index}`} onClick={() => routerPush(item.postId)} className="relative aspect-square overflow-hidden rounded-2xl bg-black/10">
          {item.isVideo ? (
            <>
              <video src={item.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <Video className="absolute right-3 top-3 h-5 w-5 text-white drop-shadow" />
            </>
          ) : (
            <SafeProfileImage src={item.src} alt="Profile media" fill sizes="33vw" className="object-cover" />
          )}
        </button>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  theme,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: Theme;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.section {...cardMotion} className={`rounded-3xl border ${theme.surface}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6">
        <span className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${theme.iconBox}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-xl font-black">{title}</span>
        </span>
        <ChevronDown className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`border-t px-5 pb-5 pt-5 sm:px-6 sm:pb-6 ${theme.border}`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function SidebarCard({
  title,
  icon: Icon,
  theme,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <motion.section {...cardMotion} className={`rounded-3xl border p-5 ${theme.surface}`}>
      <div className="mb-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${theme.accent}`} />
        <h2 className="font-black">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function ProfileStrength({
  theme,
  completionPercent,
  completionItems,
}: {
  theme: Theme;
  completionPercent: number;
  completionItems: readonly (readonly [string, boolean])[];
}) {
  return (
    <SidebarCard title="Profile Completion" icon={TrendingUp} theme={theme}>
      <div className="mb-3 flex items-end justify-between">
        <span className="text-3xl font-black">{completionPercent}%</span>
        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${theme.chip}`}>
          {completionPercent === 100 ? "Complete" : "In progress"}
        </span>
      </div>
      <div className="space-y-2">
        {completionItems.map(([label, complete]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className={theme.muted}>{label}</span>
            {complete ? <Check className="h-4 w-4 text-emerald-500" /> : <Plus className="h-4 w-4 text-slate-400" />}
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function MobileInsightSections({
  theme,
  completionPercent,
  completionItems,
  premiumError,
}: {
  theme: Theme;
  completionPercent: number;
  completionItems: readonly (readonly [string, boolean])[];
  premiumError: string | null;
}) {
  return (
    <>
      <ProfileStrength theme={theme} completionPercent={completionPercent} completionItems={completionItems} />
      {premiumError && (
        <SidebarCard title="Premium Status" icon={Sparkles} theme={theme}>
          <p className="text-sm text-red-500">{premiumError}</p>
        </SidebarCard>
      )}
      <SidebarCard title="Recent Visitors" icon={Eye} theme={theme}><EmptyMini title="No visitor data available" /></SidebarCard>
      <SidebarCard title="Suggested Connections" icon={Users} theme={theme}><EmptyMini title="No suggestions available" /></SidebarCard>
      <SidebarCard title="Communities" icon={CircleDot} theme={theme}><EmptyMini title="No communities joined" /></SidebarCard>
      <SidebarCard title="AI Suggestions" icon={Sparkles} theme={theme}><EmptyMini title="No AI suggestions available" /></SidebarCard>
    </>
  );
}

function TimelineItem({
  theme,
  logo,
  fallback,
  title,
  subtitle,
  meta,
  description,
  achievements,
}: {
  theme: Theme;
  logo?: string;
  fallback?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  description?: string;
  achievements?: string[];
}) {
  return (
    <div className="flex gap-4">
      <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-black ${theme.iconBox}`}>
        {logo && isSafeImageSrc(logo) ? (
          <SafeProfileImage src={logo} alt={subtitle || title} fill sizes="56px" className="object-cover" fallback={initials(fallback || title)} />
        ) : (
          initials(fallback || title)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-black">{title}</h3>
        {subtitle && <p className={`mt-1 font-semibold ${theme.muted}`}>{subtitle}</p>}
        {meta && <p className={`mt-1 text-sm ${theme.muted}`}>{meta}</p>}
        {description && <p className={`mt-3 leading-7 ${theme.muted}`}>{description}</p>}
        {achievements?.length ? (
          <div className="mt-4 grid gap-2">
            {achievements.map((achievement) => (
              <div key={achievement} className={`flex items-center gap-2 text-sm ${theme.muted}`}>
                <Check className="h-4 w-4 text-emerald-500" />
                {achievement}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DataCard({
  theme,
  icon: Icon,
  title,
  subtitle,
  description,
  href,
}: {
  theme: Theme;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
}) {
  const body = (
    <div className={`rounded-2xl border p-4 ${theme.softSurface}`}>
      <Icon className={`mb-4 h-6 w-6 ${theme.accent}`} />
      <h3 className="font-black">{title}</h3>
      {subtitle && <p className={`mt-1 text-sm ${theme.muted}`}>{subtitle}</p>}
      {description && <p className={`mt-3 text-sm leading-6 ${theme.muted}`}>{description}</p>}
      {href && (
        <span className={`mt-4 inline-flex items-center gap-2 text-sm font-bold ${theme.accent}`}>
          Open <ExternalLink className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    body
  );
}

function ProjectCard({ project, theme }: { project: ProfileProject; theme: Theme }) {
  const title = project.title || project.name || "Untitled project";
  const tech = project.technologies || project.techStack || [];

  return (
    <div className={`overflow-hidden rounded-2xl border ${theme.softSurface}`}>
      {project.image && isSafeImageSrc(project.image) && (
        <div className="relative h-40">
          <SafeProfileImage src={project.image} alt={title} fill sizes="50vw" className="object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-black">{title}</h3>
        {project.description && <p className={`mt-2 text-sm leading-6 ${theme.muted}`}>{project.description}</p>}
        {tech.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tech.map((item) => (
              <span key={item} className={`rounded-full border px-3 py-1 text-xs font-bold ${theme.chip}`}>{item}</span>
            ))}
          </div>
        )}
        <div className={`mt-4 flex flex-wrap items-center gap-4 text-sm ${theme.muted}`}>
          {typeof project.views === "number" && <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {project.views}</span>}
          {typeof project.likes === "number" && <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" /> {project.likes}</span>}
          {typeof project.bookmarks === "number" && <span className="inline-flex items-center gap-1"><Bookmark className="h-4 w-4" /> {project.bookmarks}</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.github && <a href={normalizeUrl(project.github)} target="_blank" rel="noreferrer" className={`text-sm font-bold ${theme.accent}`}>GitHub</a>}
          {project.liveDemo && <a href={normalizeUrl(project.liveDemo)} target="_blank" rel="noreferrer" className={`text-sm font-bold ${theme.accent}`}>Live Demo</a>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? "py-2" : "rounded-2xl border border-dashed border-slate-300 p-8 dark:border-white/15"}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function EmptyCompact({
  theme,
  icon: Icon,
  title,
  description,
}: {
  theme: Theme;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${theme.softSurface}`}>
      <Icon className={`mb-3 h-5 w-5 ${theme.accent}`} />
      <p className="font-black">{title}</p>
      <p className={`mt-1 text-sm ${theme.muted}`}>{description}</p>
    </div>
  );
}

function EmptyMini({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
      {title}
    </div>
  );
}

function PostActivity({
  posts,
  isCurrentUser,
  isPrivatePostsLocked,
  editingPostId,
  editPostText,
  deletingId,
  setEditingPostId,
  setEditPostText,
  saveEdit,
  deletePost,
  toggleLike,
  routerPush,
  formatDate,
  getPostPreviewText,
}: {
  posts: Post[];
  isCurrentUser: boolean;
  isPrivatePostsLocked: boolean;
  editingPostId: string | null;
  editPostText: string;
  deletingId: string | null;
  setEditingPostId: (id: string | null) => void;
  setEditPostText: (value: string) => void;
  saveEdit: (id: string) => void;
  deletePost: (id: string) => void;
  toggleLike: (id: string) => void;
  routerPush: (id: string) => void;
  formatDate: (date?: string) => string;
  getPostPreviewText: (content?: string) => string;
}) {
  if (isPrivatePostsLocked) {
    return <EmptyState icon={Shield} title="Private account" description="Send a follow request. Posts are visible after mutual follow." />;
  }

  if (!posts.length) {
    return <EmptyState icon={FileText} title="No posts yet" description={isCurrentUser ? "Share your first professional update." : "This member has not posted anything yet."} />;
  }

  if (!isCurrentUser) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {posts.map((post) => {
          const primaryMedia = post.media?.[0];
          const previewText = getPostPreviewText(post.content);

          return (
            <button key={post.id} onClick={() => routerPush(post.id)} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04]">
              <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-white/5">
                {primaryMedia ? (
                  isVideoMediaUrl(primaryMedia) ? (
                    <video src={primaryMedia} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <SafeProfileImage src={primaryMedia} alt="Post media preview" fill sizes="33vw" className="object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
                    {previewText || "Text post"}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{previewText || "Post"}</p>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>{post.likes || 0} likes</span>
                  <span>{post.comments || 0} comments</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article key={post.id} role="button" tabIndex={0} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a,input,textarea,video")) return; routerPush(post.id); }} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
          <div className="mb-3 flex justify-end gap-2">
            <button onClick={() => { setEditingPostId(post.id); setEditPostText(post.content); }} aria-label="Edit post" className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-blue-700 dark:hover:bg-white/10">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => deletePost(post.id)} disabled={deletingId === post.id} aria-label="Delete post" className="rounded-full p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:hover:bg-red-500/10">
              {deletingId === post.id ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>

          {editingPostId === post.id ? (
            <div className="space-y-3">
              <textarea value={editPostText} onChange={(event) => setEditPostText(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none ring-blue-500 transition focus:ring-2 dark:border-white/10 dark:bg-white/5" />
              <div className="flex gap-2">
                <button onClick={() => saveEdit(post.id)} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white">
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button onClick={() => setEditingPostId(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black dark:border-white/10">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {post.content?.trim() && <p className="mb-4 whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-300">{post.content}</p>}
              <ProfilePostMedia media={post.media} altPrefix="Profile post media" />
              <div className="mt-4 flex items-center gap-4 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                <button onClick={() => toggleLike(post.id)} className={`inline-flex items-center gap-1.5 transition hover:text-red-500 ${post.isLiked ? "text-red-500" : ""}`}>
                  <Heart className="h-4 w-4" fill={post.isLiked ? "currentColor" : "none"} />
                  {post.likes || 0}
                </button>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments || 0}
                </span>
                {post.timestamp && <span className="ml-auto text-xs">{formatDate(post.timestamp)}</span>}
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  theme,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <motion.div initial={{ y: 28, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 28, scale: 0.96, opacity: 0 }} className={`w-full max-w-2xl rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${theme.surface}`}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">{title}</h2>
              <button onClick={onClose} aria-label="Close modal" className={`rounded-full border p-2 transition ${theme.softSurface}`}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  theme,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  href?: string;
  theme: Theme;
}) {
  if (!value) return null;

  const content = (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 transition ${theme.softSurface}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${theme.iconBox}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-bold uppercase ${theme.muted}`}>{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );

  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  theme,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  theme: Theme;
}) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-bold uppercase ${theme.muted}`}>{label}</span>
      <input name={name} value={value} onChange={onChange} className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2 ${theme.softSurface}`} />
    </label>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  theme,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  theme: Theme;
}) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-bold uppercase ${theme.muted}`}>{label}</span>
      <textarea name={name} value={value} onChange={onChange} rows={4} className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2 ${theme.softSurface}`} />
    </label>
  );
}
