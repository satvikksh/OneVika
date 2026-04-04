"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Mail,
  Calendar,
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Video,
  User,
  Shield,
  GlobeIcon,
  UserPlus,
  UserCheck,
  Edit,
  X,
  Save,
  Heart,
  MessageSquare,
  Grid3x3,
  Trash2,
  Briefcase,
  GraduationCap,
  Settings,
  Crown,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useSession } from "next-auth/react";
import ProfilePostMedia from "../../components/ProfilePostMedia";


// ---------- INTERFACES ----------
interface UserProfile {
  id: string;
  name: string;
  email?: string;
  isPrivate?: boolean;
  isPremium?: boolean;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
  lastSeen?: string;
  status?: string;
  profession?: string;
  education?: string;
  social?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
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

interface PremiumStatus {
  isPremium: boolean;
  premiumExpiresAt?: string | null;
  daysRemaining: number;
  premiumPlan?: string | null;
  paymentMethod?: {
    type?: string;
    brand?: string;
    last4?: string;
  } | null;
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

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { onlineUsers } = useSocket();

  const userId = params.userId as string;
  const isCurrentUser = session?.user?.id === userId;
  const isUserOnline = onlineUsers.includes(userId);

  // ---------- PROFILE STATE ----------
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumActionLoading, setPremiumActionLoading] = useState(false);
  const [premiumError, setPremiumError] = useState<string | null>(null);

  // ---------- POSTS STATE ----------
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---------- INLINE PROFILE EDITING ----------
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    status: "",
    location: "",
    phone: "",
    website: "",
    profession: "",
    education: "",
    social: {
      instagram: "",
      twitter: "",
      linkedin: "",
      github: "",
    },
  });

  // ---------- FETCH USER PROFILE ----------
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the same profile endpoint that returns both user + posts
        // If your backend doesn't support /api/user/profile/:userId, adjust accordingly
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

        // ---- Normalize user ----
        setUser({
          id: userData._id || userData.id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          bio: userData.bio,
          location: userData.location,
          joinedDate: userData.joinedDate || userData.createdAt,
          phone: userData.phone,
          website: userData.website,
          profession: userData.profession,
          education: userData.education,
          status: userData.status,
          social: userData.social || {},
          followersCount: userData.followersCount ?? 0,
          followingCount: userData.followingCount ?? 0,
          isFollowing: Boolean(data.isFollowing ?? userData.isFollowing),
          followsYou: Boolean(data.followsYou ?? userData.followsYou),
          isMutualFollow: Boolean(
            data.isMutualFollow ?? userData.isMutualFollow
          ),
          canMessage: Boolean(data.canMessage ?? userData.canMessage),
          canViewPosts:
            data.canViewPosts !== undefined
              ? Boolean(data.canViewPosts)
              : Boolean(userData.canViewPosts),
          isPrivate: Boolean(data.isPrivate ?? userData.isPrivate),
          isPremium: Boolean(data.isPremium ?? userData.isPremium),
          isActive: userData.isActive ?? true,
          lastSeen: userData.lastSeen,
        });

        // ---- Normalize posts ----
        const normalizedPosts = postsData.map((post) => ({
          id: post._id || post.id,
          content: post.content,
          media: Array.isArray(post.images)
            ? post.images
            : post.image
              ? [post.image]
              : [],
          likes: Array.isArray(post.likes)
            ? post.likes.length
            : post.likes || 0,
          comments: Array.isArray(post.comments)
            ? post.comments.length
            : post.comments || 0,
          timestamp: post.timestamp || post.createdAt,
          isLiked: post.isLiked || false,
        }));
        setPosts(normalizedPosts);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
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

      const data = await res.json();
      setPremiumStatus(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch premium status";
      setPremiumError(message);
    } finally {
      setPremiumLoading(false);
    }
  }, [isCurrentUser]);

  const handleActivatePremium = async () => {
    setPremiumActionLoading(true);
    setPremiumError(null);

    try {
      const res = await fetch("/api/premium/create-checkout-session", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to start premium checkout");
      }

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
      if (!RazorpayCheckout) {
        throw new Error("Razorpay SDK unavailable");
      }
      const razorpay = new RazorpayCheckout({
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

          if (!activateRes.ok) {
            const activateData = await activateRes.json().catch(() => ({}));
            throw new Error(activateData.error || "Payment verification failed");
          }

          await fetchPremiumStatus();
          setPremiumActionLoading(false);
        },
        modal: {
          ondismiss: () => {
            setPremiumActionLoading(false);
            setPremiumError("Payment was canceled.");
          },
        },
      });

      razorpay.open();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start premium checkout";
      setPremiumError(message);
      setPremiumActionLoading(false);
    }
  };

  useEffect(() => {
    if (!isCurrentUser) return;
    fetchPremiumStatus();
  }, [fetchPremiumStatus, isCurrentUser]);

  // ---------- FOLLOW TOGGLE ----------
 const handleFollowToggle = async () => {
  if (!session || !user) return;

  const wasFollowing = user.isFollowing; // store original state

  setFollowLoading(true);

  // 🔥 Optimistic update
  setUser((prev) =>
    prev
      ? {
          ...prev,
          isFollowing: !wasFollowing,
          isMutualFollow: !wasFollowing ? Boolean(prev.followsYou) : false,
          canMessage: !wasFollowing ? Boolean(prev.followsYou) : false,
          canViewPosts: !wasFollowing
            ? Boolean(prev.canViewPosts || prev.followsYou || !prev.isPrivate)
            : Boolean(!prev.isPrivate),
          followersCount: wasFollowing
            ? Math.max(0, (prev.followersCount ?? 0) - 1)
            : (prev.followersCount ?? 0) + 1,
        }
      : prev
  );

  try {
    const response = await fetch(`/api/user/profile/${userId}/follow`, {
      method: wasFollowing ? "DELETE" : "POST",
    });

    if (!response.ok) throw new Error("Failed to update follow status");

    const data = await response.json();

    // ✅ Sync with server truth
    setUser((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: data.isFollowing,
            followsYou:
              data.followsYou !== undefined
                ? Boolean(data.followsYou)
                : prev.followsYou,
            isMutualFollow:
              data.isMutualFollow !== undefined
                ? Boolean(data.isMutualFollow)
                : prev.isMutualFollow,
            canMessage:
              data.canMessage !== undefined
                ? Boolean(data.canMessage)
                : prev.canMessage,
            canViewPosts:
              data.isMutualFollow !== undefined
                ? Boolean(data.isMutualFollow || !prev.isPrivate)
                : prev.canViewPosts,
            followersCount: data.followersCount,
          }
        : prev
    );

  } catch (err) {
    console.error("Error toggling follow:", err);

    // 🔄 Rollback to original state
    setUser((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: wasFollowing,
            isMutualFollow: wasFollowing ? Boolean(prev.followsYou) : false,
            canMessage: wasFollowing ? Boolean(prev.followsYou) : false,
            canViewPosts: wasFollowing
              ? Boolean(prev.followsYou || !prev.isPrivate)
              : Boolean(!prev.isPrivate),
            followersCount: wasFollowing
              ? (prev.followersCount ?? 0) + 1
              : Math.max(0, (prev.followersCount ?? 0) - 1),
          }
        : prev
    );
  } finally {
    setFollowLoading(false);
  }
};


  // ---------- MESSAGE / CALL ----------
  const handleSendMessage = () => router.push(`/chat?userId=${userId}`);
  const handleStartVideoCall = () =>
    console.log("Video call with:", user?.name);
  const handleViewFollowers = () => router.push(`/profile/${userId}/followers`);
  const handleViewFollowing = () => router.push(`/profile/${userId}/following`);

  // ---------- POST MANAGEMENT ----------
  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;

    setDeletingId(postId);

    try {
      const res = await fetch(`/api/post/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete post");
      }
    } catch {
      alert("Failed to delete post");
    } finally {
      setDeletingId(null);
    }
  };

  const saveEdit = async (postId: string) => {
    if (!editPostText.trim()) return;

    try {
      const res = await fetch(`/api/post/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editPostText }),
      });

      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, content: editPostText } : p,
          ),
        );

        setEditingPostId(null);
        setEditPostText("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update post");
      }
    } catch {
      alert("Failed to update post");
    }
  };

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes: (p.likes || 0) + (p.isLiked ? -1 : 1),
              isLiked: !p.isLiked,
            }
          : p,
      ),
    );
  };

  // ---------- INLINE PROFILE EDIT HANDLERS ----------
  const startEditingProfile = () => {
    if (!user) return;
    setEditForm({
      name: user.name || "",
      bio: user.bio || "",
      status: user.status || "",
      location: user.location || "",
      phone: user.phone || "",
      website: user.website || "",
      profession: user.profession || "",
      education: user.education || "",
      social: {
        instagram: user.social?.instagram || "",
        twitter: user.social?.twitter || "",
        linkedin: user.social?.linkedin || "",
        github: user.social?.github || "",
      },
    });
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
  };

  const handleProfileInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("social.")) {
      const socialKey = name.split(".")[1] as keyof typeof editForm.social;
      setEditForm((prev) => ({
        ...prev,
        social: { ...prev.social, [socialKey]: value },
      }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser((prev) => (prev ? { ...prev, ...updatedUser.user } : prev));
        setIsEditingProfile(false);
      } else {
        alert("Failed to update profile");
      }
    } catch {
      alert("Failed to update profile");
    }
  };

  // ---------- FORMATTERS ----------
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Never";
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMins = Math.floor(
      (now.getTime() - lastSeenDate.getTime()) / 60000,
    );
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const isVideoMediaUrl = (url?: string) =>
    Boolean(url && /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(?:$|[?#])/i.test(url));

  const getPostPreviewText = (content?: string) => {
    const normalized = content?.replace(/\s+/g, " ").trim() || "";

    if (!normalized) {
      return "";
    }

    return normalized.length > 88
      ? `${normalized.slice(0, 85).trimEnd()}...`
      : normalized;
  };

  // ---------- LOADING / ERROR ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-8"></div>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
              </div>
              <div className="md:w-2/3">
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
            <User className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || "User not found"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The user profile you&apos;re looking for doesn&apos;t exist or you don&apos;t
            have permission to view it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Chats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canShowMessageButton = !isCurrentUser && Boolean(user.canMessage);
  const isPrivatePostsLocked =
    !isCurrentUser && Boolean(user.isPrivate) && !Boolean(user.canViewPosts);
  const isPremiumProfile = Boolean(user.isPremium || premiumStatus?.isPremium);
  const canRenewPremium =
    !premiumStatus?.isPremium || premiumStatus.daysRemaining <= 1;
  const premiumActionLabel = premiumStatus?.isPremium
    ? "Renew Premium"
    : "Activate Premium";

  const pageClass = isPremiumProfile
    ? "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(226,232,240,0.14),_transparent_30%),linear-gradient(180deg,_#1c1917_0%,_#2b2418_32%,_#0f172a_100%)]"
    : "min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800";
  const headerClass = isPremiumProfile
    ? "sticky top-0 z-10 border-b border-amber-300/20 bg-gradient-to-r from-stone-950/90 via-amber-950/70 to-slate-900/90 backdrop-blur-sm"
    : "sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800";
  const cardClass = isPremiumProfile
    ? "rounded-2xl border border-amber-200/15 bg-gradient-to-br from-[#2e2615] via-[#1f1b16] to-[#111827] shadow-[0_18px_60px_rgba(245,158,11,0.12)]"
    : "bg-white dark:bg-gray-900 rounded-2xl shadow-lg";
  const badgeClass =
    "inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-gradient-to-r from-amber-300/20 via-yellow-100/15 to-slate-200/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200";
  const nameClass = isPremiumProfile
    ? "bg-gradient-to-r from-yellow-200 via-amber-300 to-slate-200 bg-clip-text text-transparent"
    : "text-gray-900 dark:text-white";
  const avatarRingClass = isPremiumProfile
    ? "bg-[conic-gradient(from_180deg_at_50%_50%,#fde68a_0deg,#f59e0b_90deg,#f8fafc_180deg,#fbbf24_270deg,#fde68a_360deg)] p-1.5 shadow-[0_0_40px_rgba(251,191,36,0.35)]"
    : "bg-gradient-to-br from-blue-500 to-blue-500 ring-4 ring-white dark:ring-gray-900 shadow-xl";
  const titleClass = isPremiumProfile
    ? "text-slate-50"
    : "text-gray-900 dark:text-white";
  const bodyTextClass = isPremiumProfile
    ? "text-slate-200"
    : "text-gray-700 dark:text-gray-300";
  const mutedTextClass = isPremiumProfile
    ? "text-slate-300"
    : "text-gray-500 dark:text-gray-400";
  const metaTextClass = isPremiumProfile
    ? "text-slate-200"
    : "text-gray-600 dark:text-gray-300";
  const dividerClass = isPremiumProfile
    ? "bg-white/10"
    : "bg-gray-200 dark:bg-gray-700";
  const subtleButtonClass = isPremiumProfile
    ? "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
  const inputClass = isPremiumProfile
    ? "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-50 placeholder:text-slate-400 focus:border-amber-300/40 focus:outline-none"
    : "w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white";
  const sectionDividerClass = isPremiumProfile
    ? "border-white/10"
    : "border-gray-200 dark:border-gray-700";
  const infoPanelClass = isPremiumProfile
    ? "flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
    : "flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl";
  const statValueClass = isPremiumProfile
    ? "text-2xl font-bold text-slate-50 group-hover:text-amber-300 transition-colors"
    : "text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors";
  const statLabelClass = isPremiumProfile
    ? "text-sm text-slate-300 group-hover:text-slate-100 transition-colors"
    : "text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors";
  const postsTabClass = isPremiumProfile
    ? "px-6 py-3 flex items-center gap-2 font-medium text-amber-200 border-b-2 border-amber-300"
    : "px-6 py-3 flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400";
  const emptyStateIconWrapClass = isPremiumProfile
    ? "w-20 h-20 mx-auto mb-6 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
    : "w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center";
  const postCardClass = isPremiumProfile
    ? "rounded-2xl border border-white/10 bg-white/[0.04] p-6"
    : "bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700";
  const visitorPostsGridClass = "grid grid-cols-3 gap-4";
  const visitorPostCardClass = isPremiumProfile
    ? "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
    : "overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800";
  const visitorPreviewClass = isPremiumProfile
    ? "relative aspect-square overflow-hidden bg-white/5"
    : "relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900";
  const visitorMetaClass = isPremiumProfile
    ? "border-t border-white/10 p-3"
    : "border-t border-gray-200 p-3 dark:border-gray-700";
  const premiumMembershipClass = isPremiumProfile
    ? "md:col-span-2 rounded-xl border border-amber-200/20 bg-gradient-to-r from-[#5f4a0f] via-[#76601a] to-[#4a5568] p-4 text-amber-50 shadow-[0_10px_30px_rgba(245,158,11,0.18)]"
    : "md:col-span-2 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white";
  const premiumMembershipButtonClass = isPremiumProfile
    ? "rounded-lg bg-white px-4 py-2 font-semibold text-stone-900 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-70"
    : "px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors";

  // ---------- RENDER ----------
  return (
    <div className={pageClass}>
      {/* Header */}
      <div className={headerClass}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className={`flex items-center gap-2 transition-colors group ${
                isPremiumProfile
                  ? "text-amber-100/80 hover:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <ArrowLeft
                size={20}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span className="font-medium">Back</span>
            </button>

            {isCurrentUser && !isEditingProfile && (
              <button
                onClick={() => router.push("/settings")}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
                  isPremiumProfile
                    ? "text-amber-100 hover:text-white hover:bg-white/10"
                    : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                }`}
              >
                <Settings size={16} />
                Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ---------- LEFT COLUMN (Profile Card, Contact Info) ---------- */}
          <div className="lg:w-1/3">
            {/* Profile Card */}
            <div className={`${cardClass} p-6 mb-6`}>
              {!isEditingProfile ? (
                // ----- NORMAL PROFILE VIEW -----
                <div className="flex flex-col items-center">
                  {/* Avatar */}
                  <div className="relative mb-6">
                    <div className={`w-40 h-40 rounded-full ${avatarRingClass}`}>
                      <div
                        className={`h-full w-full overflow-hidden rounded-full ring-4 ${
                          isPremiumProfile
                            ? "bg-gradient-to-br from-stone-950 via-amber-950 to-slate-500 ring-amber-50/70"
                            : "bg-gradient-to-br from-blue-500 to-blue-500 ring-white/70 dark:ring-gray-900"
                        }`}
                      >
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.name}
                            width={160}
                            height={160}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white font-bold text-5xl">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`absolute bottom-4 right-4 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 ${
                        isUserOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>

                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-center">
                    <h1 className={`text-3xl font-bold ${nameClass}`}>{user.name}</h1>
                    {isPremiumProfile && (
                      <span className={badgeClass}>
                        <Crown className="h-3.5 w-3.5" />
                        Premium
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isUserOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className={`text-sm font-medium ${metaTextClass}`}>
                      {isUserOnline
                        ? "Online"
                        : `Last seen ${formatLastSeen(user.lastSeen)}`}
                    </span>
                  </div>

                  {/* Status */}
                  {user.status && (
                    <p
                      className={`text-center mb-6 px-4 py-2 rounded-xl ${
                        isPremiumProfile
                          ? "bg-white/5 text-amber-50/90 border border-amber-200/10"
                          : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      &quot;{user.status}&quot;
                    </p>
                  )}

                  {/* Follow Stats */}
                  <div className="flex justify-around w-full mb-6">
                    <button
                      onClick={handleViewFollowers}
                      className="flex flex-col items-center group cursor-pointer"
                    >
                      <span className={statValueClass}>
                        {user.followersCount || 0}
                      </span>
                      <span className={statLabelClass}>
                        Followers
                      </span>
                    </button>
                    <div className={`w-px ${dividerClass}`}></div>
                    <button
                      onClick={handleViewFollowing}
                      className="flex flex-col items-center group cursor-pointer"
                    >
                      <span className={statValueClass}>
                        {user.followingCount || 0}
                      </span>
                      <span className={statLabelClass}>
                        Following
                      </span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 w-full">
                    {isCurrentUser && (
                      <button
                        onClick={startEditingProfile}
                        className={`w-full rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
                          isPremiumProfile
                            ? "bg-white/5 text-amber-100 border border-white/10 hover:bg-white/10"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <Edit size={18} />
                        Edit Profile
                      </button>
                    )}
                    {!isCurrentUser && (
                      <>
                        <button
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className={`w-full py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 active:scale-[0.98] ${
                            user.isFollowing
                              ? subtleButtonClass
                              : isPremiumProfile
                                ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-slate-200 text-stone-950 hover:from-amber-300 hover:via-yellow-200 hover:to-slate-100"
                                : "bg-gradient-to-r from-blue-600 to-blue-600 text-white hover:from-blue-700 hover:to-blue-700"
                          }`}
                        >
                          {followLoading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : user.isFollowing ? (
                            <>
                              <UserCheck size={18} />
                              {user.isPrivate ? "Requested" : "Following"}
                            </>
                          ) : (
                            <>
                              <UserPlus size={18} />
                              {user.isPrivate ? "Send Request" : "Follow"}
                            </>
                          )}
                        </button>

                        {canShowMessageButton && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={handleSendMessage}
                              className={`py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 ${
                                isPremiumProfile
                                  ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-slate-200 text-stone-950 hover:from-amber-300 hover:via-yellow-200 hover:to-slate-100"
                                  : "bg-gradient-to-r from-blue-600 to-blue-600 text-white hover:from-blue-700 hover:to-blue-700"
                              }`}
                            >
                              <MessageCircle size={18} />
                              Message
                            </button>
                            <button
                              onClick={handleStartVideoCall}
                              className={`py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 ${subtleButtonClass}`}
                            >
                              <Video size={18} />
                              Video
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // ----- INLINE PROFILE EDIT FORM -----
                <div className="space-y-4">
                  <h3 className={`text-xl font-bold mb-4 ${titleClass}`}>
                    Profile Details
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleProfileInputChange}
                      placeholder="Name"
                      className={inputClass}
                    />
                    <textarea
                      name="bio"
                      value={editForm.bio}
                      onChange={handleProfileInputChange}
                      placeholder="Bio"
                      rows={3}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      name="status"
                      value={editForm.status}
                      onChange={handleProfileInputChange}
                      placeholder="Status"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      name="location"
                      value={editForm.location}
                      onChange={handleProfileInputChange}
                      placeholder="Location"
                      className={inputClass}
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleProfileInputChange}
                      placeholder="Phone"
                      className={inputClass}
                    />
                    <input
                      type="url"
                      name="website"
                      value={editForm.website}
                      onChange={handleProfileInputChange}
                      placeholder="Website"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      name="profession"
                      value={editForm.profession}
                      onChange={handleProfileInputChange}
                      placeholder="Profession"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      name="education"
                      value={editForm.education}
                      onChange={handleProfileInputChange}
                      placeholder="Education"
                      className={inputClass}
                    />
                    <div className={`pt-2 border-t ${sectionDividerClass}`}>
                      <p className={`text-sm font-medium mb-2 ${bodyTextClass}`}>
                        Social Links
                      </p>
                      <input
                        type="url"
                        name="social.instagram"
                        value={editForm.social.instagram}
                        onChange={handleProfileInputChange}
                        placeholder="Instagram URL"
                        className={`${inputClass} mb-2`}
                      />
                      <input
                        type="url"
                        name="social.twitter"
                        value={editForm.social.twitter}
                        onChange={handleProfileInputChange}
                        placeholder="Twitter URL"
                        className={`${inputClass} mb-2`}
                      />
                      <input
                        type="url"
                        name="social.linkedin"
                        value={editForm.social.linkedin}
                        onChange={handleProfileInputChange}
                        placeholder="LinkedIn URL"
                        className={`${inputClass} mb-2`}
                      />
                      <input
                        type="url"
                        name="social.github"
                        value={editForm.social.github}
                        onChange={handleProfileInputChange}
                        placeholder="GitHub URL"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={saveProfile}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      onClick={cancelEditingProfile}
                      className="flex-1 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information (read‑only while editing profile) */}
            {!isEditingProfile && (
              <div className={`${cardClass} p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${titleClass}`}>
                  Contact Information
                </h2>
                <div className="space-y-4">
                  {user.email && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <Mail
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Email
                        </p>
                        <p className={`${titleClass} break-all`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <Phone
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Phone
                        </p>
                        <p className={titleClass}>
                          {user.phone}
                        </p>
                      </div>
                    </div>
                  )}
                  {user.location && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                        <MapPin
                          size={18}
                          className="text-green-600 dark:text-green-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Location
                        </p>
                        <p className={titleClass}>
                          {user.location}
                        </p>
                      </div>
                    </div>
                  )}
                  {user.joinedDate && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                        <Calendar
                          size={18}
                          className="text-orange-600 dark:text-orange-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Member Since
                        </p>
                        <p className={titleClass}>
                          {formatDate(user.joinedDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {user.profession && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Briefcase
                          size={18}
                          className="text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Profession
                        </p>
                        <p className={titleClass}>
                          {user.profession}
                        </p>
                      </div>
                    </div>
                  )}
                  {user.education && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                        <GraduationCap
                          size={18}
                          className="text-teal-600 dark:text-teal-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Education
                        </p>
                        <p className={titleClass}>
                          {user.education}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---------- RIGHT COLUMN (Bio, Social, Posts) ---------- */}
          <div className="lg:w-2/3">
            {/* Bio Section (only if not editing) */}
            {!isEditingProfile && (
              <div className={`${cardClass} p-6 mb-6`}>
                <h2 className={`text-xl font-bold mb-4 ${titleClass}`}>
                  About
                </h2>
                {user.bio ? (
                  <p className={`leading-relaxed whitespace-pre-line ${bodyTextClass}`}>
                    {user.bio}
                  </p>
                ) : (
                  <p className={`italic ${mutedTextClass}`}>
                    {isCurrentUser
                      ? "You haven't added a bio yet. Add one to tell others about yourself!"
                      : "This user hasn't added a bio yet."}
                  </p>
                )}
              </div>
            )}

            {/* Social Links (only if not editing) */}
            {!isEditingProfile &&
              user.social &&
              Object.values(user.social).some((val) => val) && (
                <div className={`${cardClass} p-6 mb-6`}>
                  <h2 className={`text-xl font-bold mb-4 ${titleClass}`}>
                    Social Links
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {user.social.instagram && (
                      <a
                        href={user.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all flex items-center gap-2"
                      >
                        <Instagram size={18} />
                        <span>Instagram</span>
                      </a>
                    )}
                    {user.social.twitter && (
                      <a
                        href={user.social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all flex items-center gap-2"
                      >
                        <Twitter size={18} />
                        <span>Twitter</span>
                      </a>
                    )}
                    {user.social.linkedin && (
                      <a
                        href={user.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2"
                      >
                        <Linkedin size={18} />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {user.social.github && (
                      <a
                        href={user.social.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all flex items-center gap-2"
                      >
                        <GlobeIcon size={18} />
                        <span>GitHub</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Website (only if not editing) */}
            {!isEditingProfile && user.website && (
              <div className={`${cardClass} p-6 mb-6`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex-shrink-0">
                    <Globe
                      size={20}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${mutedTextClass}`}>
                      Website
                    </p>
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-medium hover:underline ${
                        isPremiumProfile
                          ? "text-amber-200 hover:text-amber-100"
                          : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      }`}
                    >
                      {user.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info (only if not editing) */}
            {!isEditingProfile && (
              <div className={`${cardClass} p-6 mb-6`}>
                <h2 className={`text-xl font-bold mb-4 ${titleClass}`}>
                  Additional Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isCurrentUser && (
                    <div id="premium-membership" className={premiumMembershipClass}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold">Premium Membership</p>
                          <p className="text-sm text-white/90">
                            {premiumLoading
                              ? "Checking premium status..."
                              : premiumStatus?.isPremium
                                ? `Active, ${premiumStatus.daysRemaining} day(s) left`
                                : "Inactive"}
                          </p>
                          {premiumStatus?.isPremium &&
                            premiumStatus.daysRemaining <= 1 && (
                              <p className="text-xs text-white/80 mt-1">
                                Premium ends within 24 hours. Renew now to avoid interruption.
                              </p>
                            )}
                          {premiumStatus?.paymentMethod?.last4 && (
                            <p className="text-xs text-white/90 mt-1">
                              Card: {premiumStatus.paymentMethod.brand || "card"} ending in{" "}
                              {premiumStatus.paymentMethod.last4}
                            </p>
                          )}
                        </div>

                        {canRenewPremium && (
                          <button
                            onClick={handleActivatePremium}
                            disabled={premiumActionLoading || premiumLoading}
                            className={premiumMembershipButtonClass}
                          >
                            {premiumActionLoading ? "Redirecting..." : premiumActionLabel}
                          </button>
                        )}
                      </div>
                      {premiumError && (
                        <p className="text-xs text-red-100 mt-3">{premiumError}</p>
                      )}
                    </div>
                  )}

                  <div className={infoPanelClass}>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Shield
                        size={18}
                        className="text-green-600 dark:text-green-400"
                      />
                    </div>
                    <div>
                      <p className={`text-sm ${mutedTextClass}`}>
                        Account Status
                      </p>
                      <p className={`font-medium ${titleClass}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                  {user.lastSeen && !isUserOnline && (
                    <div className={infoPanelClass}>
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <Calendar
                          size={18}
                          className="text-amber-600 dark:text-amber-400"
                        />
                      </div>
                      <div>
                        <p className={`text-sm ${mutedTextClass}`}>
                          Last Seen
                        </p>
                        <p className={`font-medium ${titleClass}`}>
                          {formatLastSeen(user.lastSeen)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------- POSTS SECTION ---------- */}
            <div className={`${cardClass} p-6`}>
              <div className={`flex justify-center mb-6 border-b ${isPremiumProfile ? "border-white/10" : "border-gray-200 dark:border-gray-800"}`}>
                <button className={postsTabClass}>
                  <Grid3x3 className="w-5 h-5" /> <span>Posts</span>
                </button>
              </div>

              <div className="space-y-6">
                {isPrivatePostsLocked ? (
                  <div className="text-center py-12">
                    <div className={emptyStateIconWrapClass}>
                      <Shield className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${titleClass}`}>
                      Private Account
                    </h3>
                    <p className={mutedTextClass}>
                      Send a follow request. Posts are visible after mutual follow.
                    </p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className={emptyStateIconWrapClass}>
                      <MessageSquare className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${titleClass}`}>
                      No Posts Yet
                    </h3>
                    <p className={mutedTextClass}>
                      {isCurrentUser
                        ? "Share your first moment with the world!"
                        : "This user hasn't posted anything yet."}
                    </p>
                  </div>
                ) : isCurrentUser ? (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className={postCardClass}
                    >
                      {/* Post actions (only for own posts) */}
                      {isCurrentUser && (
                        <div className="flex justify-end gap-2 mb-4">
                          <button
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditPostText(post.content);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            disabled={deletingId === post.id}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            {deletingId === post.id ? (
                              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Post content with edit mode */}
                      {editingPostId === post.id && isCurrentUser ? (
                        <div className="space-y-3">
                          <textarea
                            value={editPostText}
                            onChange={(e) => setEditPostText(e.target.value)}
                            className={`w-full rounded-lg border p-3 ${
                              isPremiumProfile
                                ? "border-white/10 bg-white/5 text-slate-50 placeholder:text-slate-400"
                                : "bg-white dark:bg-gray-900 dark:text-white dark:border-gray-600"
                            }`}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(post.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg flex gap-2 items-center hover:bg-green-700"
                            >
                              <Save size={16} /> Save
                            </button>
                            <button
                              onClick={() => setEditingPostId(null)}
                              className="px-4 py-2 bg-gray-400 text-white rounded-lg flex gap-2 items-center hover:bg-gray-500"
                            >
                              <X size={16} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {post.content?.trim() && (
                            <p className={`mb-4 whitespace-pre-wrap ${bodyTextClass}`}>
                              {post.content}
                            </p>
                          )}
                          <ProfilePostMedia media={post.media} altPrefix="Profile post media" />
                          <div className={`flex items-center gap-4 pt-4 text-sm ${mutedTextClass} border-t ${sectionDividerClass}`}>
                            <button
                              onClick={() => toggleLike(post.id)}
                              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                                post.isLiked ? "text-red-500" : ""
                              }`}
                            >
                              <Heart
                                size={16}
                                fill={post.isLiked ? "currentColor" : "none"}
                              />{" "}
                              <span>{post.likes}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <MessageSquare size={16} />{" "}
                              <span>{post.comments}</span>
                            </div>
                            {post.timestamp && (
                              <span className="ml-auto text-xs">
                                {formatDate(post.timestamp)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={visitorPostsGridClass}>
                    {posts.map((post) => {
                      const primaryMedia = post.media?.[0];
                      const mediaCount = post.media?.length || 0;
                      const previewText = getPostPreviewText(post.content);

                      return (
                        <div
                          key={post.id}
                          className={visitorPostCardClass}
                        >
                          <div className={visitorPreviewClass}>
                            {primaryMedia ? (
                              isVideoMediaUrl(primaryMedia) ? (
                                <>
                                  <video
                                    src={primaryMedia}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                                    <div className="rounded-full bg-black/55 p-2 text-white shadow-lg">
                                      <Video size={18} />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <Image
                                  src={primaryMedia}
                                  alt="Post media preview"
                                  fill
                                  sizes="(max-width: 1024px) 33vw, 20vw"
                                  className="object-cover"
                                />
                              )
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/10 via-transparent to-slate-500/10 p-4">
                                <p className={`text-center text-sm font-medium ${bodyTextClass}`}>
                                  {previewText || "Text post"}
                                </p>
                              </div>
                            )}

                            {mediaCount > 1 && (
                              <div className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
                                {mediaCount}
                              </div>
                            )}
                          </div>

                          <div className={visitorMetaClass}>
                            {previewText && primaryMedia && (
                              <p className={`mb-3 text-sm ${bodyTextClass}`}>
                                {previewText}
                              </p>
                            )}
                            <div className={`flex items-center justify-between gap-2 text-xs ${mutedTextClass}`}>
                              <div className="flex items-center gap-3">
                                <span>{post.likes ?? 0} likes</span>
                                <span>{post.comments ?? 0} comments</span>
                              </div>
                              {post.timestamp && (
                                <span>{formatDate(post.timestamp)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
