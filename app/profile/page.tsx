"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

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
  Users,
  UserPlus,
  UserCheck,
  Edit,
  Briefcase,
  Heart,
  Grid3x3,
  MoreHorizontal,
  Trash2,
  X,
  Save,
  GraduationCap,
  MessageSquare,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import ProfilePostMedia from "../components/ProfilePostMedia";

interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  phone?: string;
  website?: string;
  profession?: string;
  education?: string;
  status?: string;
  social?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isActive?: boolean;
  lastSeen?: string;
  _count?: {
    followers?: number;
    following?: number;
  };
  followers?: any[];
  following?: any[];
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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const pathname = usePathname();

  const profileUsername = (params?.username as string) || null;

  // ---------- REDIRECT LOGIC (own profile → ID‑based route) ----------
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect /profile (no username) to /profile/[userId]
  useEffect(() => {
    if (status === "authenticated" && !profileUsername && !isRedirecting) {
      setIsRedirecting(true);
      router.replace(`/profile/${session.user.id}`);
    }
  }, [status, profileUsername, session, router, isRedirecting]);

  // ---------- DATA FETCHING ----------
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Post editing states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if we are about to redirect
    if (isRedirecting) return;

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        let endpoint;
        if (profileUsername) {
          endpoint = `/api/user/profile/${profileUsername}`;
        } else {
          endpoint = "/api/user/profile";
        }

        const response = await fetch(endpoint, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch profile");
        }

        const data = await response.json();
        const userData = data.user || data;
        // const postsData = Array.isArray(data.posts) ? data.posts : [];
        const postsResponse = await fetch(`/api/posts?userId=${userData._id || userData.id}`, {
  cache: "no-store",
});

let postsData = [];

if (postsResponse.ok) {
  postsData = await postsResponse.json();
}

        // --- 1. ROBUST COUNT RESOLVER ---
        const resolveCount = (val: any) => {
          if (Array.isArray(val)) return val.length;
          if (typeof val === "number") return val;
          if (typeof val === "string") return parseInt(val, 10) || 0;
          return 0;
        };

        const finalFollowersCount = resolveCount(
          userData.followers ??
            userData.followersCount ??
            userData._count?.followers ??
            data.followers ??
            data.followersCount,
        );

        const finalFollowingCount = resolveCount(
          userData.following ??
            userData.followingCount ??
            userData._count?.following ??
            data.following ??
            data.followingCount,
        );

        // --- 2. POST NORMALIZATION ---
        const normalizedPosts = postsData.map((post: any) => {
          let content = "";
          try {
            if (typeof post.content === "string") content = post.content;
            else if (post.content?.text) content = post.content.text;
            else content = JSON.stringify(post.content || "");
          } catch {
            content = "";
          }

          return {
            id: typeof post._id === "string" ? post._id : post.id,
            content: String(content),
            media: Array.isArray(post.images)
              ? post.images
              : post.image
                ? [post.image]
                : [],
            likes: resolveCount(post.likes),
            comments: resolveCount(post.comments),
            timestamp: post.timestamp || post.createdAt,
            isLiked: post.isLiked || false,
          };
        });

        const fetchedUser = {
          id: userData._id || userData.id,
          name: userData.name,
          username: userData.username,
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
          followersCount: finalFollowersCount ?? 0,
          followingCount: finalFollowingCount ?? 0,
          isFollowing: data.isFollowing || userData.isFollowing || false,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          lastSeen: userData.lastSeen,
        };

        setUser(fetchedUser);
        setPosts(normalizedPosts);

        // ----- REDIRECT IF THIS PROFILE BELONGS TO THE CURRENT USER ----- 
        if (
          status === "authenticated" &&
          session?.user?.id &&
          fetchedUser.id === session.user.id &&
          !isRedirecting
        ) {
          setIsRedirecting(true);
          router.replace(`/profile/${fetchedUser.id}`);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (status !== "loading") {
      fetchProfileData();
    }
  }, [status, profileUsername, session, router, isRedirecting, pathname]);

  // ---------- HANDLERS ----------
  const handleOpenSettings = () => {
    router.push("/settings");
  };

  const handleViewFollowers = () => {
    if (user?.id) router.push(`/user/profile/${user.id}/followers`);
  };

  const handleViewFollowing = () => {
    if (user?.id) router.push(`/user/profile/${user.id}/following`);
  };

  const handleSendMessage = () => {
    if (user?.id) router.push(`/chat?userId=${user.id}`);
  };

  const handleFollowToggle = async () => {
    if (!user || !session) return;

    // Optimistic update
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.isFollowing
          ? Math.max(0, (prev.followersCount ?? 0) - 1)
          : (prev.followersCount ?? 0) + 1,
      };
    });

    try {
      const res = await fetch(`/api/user/profile/${user.id}/follow`, {
        method: user.isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Follow action failed");
    } catch (err) {
      console.error("Follow error:", err);
      // Rollback
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isFollowing: !prev.isFollowing,
          followersCount: prev.isFollowing
            ? (prev.followersCount ?? 0) + 1
            : Math.max(0, (prev.followersCount ?? 0) - 1),
        };
      });
    }
  };

  // --- Post Management ---
  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post permanently?")) return;
    setDeletingId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== postId));
      else {
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
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editPostText }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, content: editPostText } : p
          )
        );
        setEditingPostId(null);
        setEditPostText("");
      } else alert("Failed to update post");
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
          : p
      )
    );
  };

  // --- Formatters ---
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Never";
    try {
      const diffMins = Math.floor(
        (new Date().getTime() - new Date(lastSeen).getTime()) / 60000
      );
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return "Unknown";
    }
  };

  const isCurrentUser = user?.id === session?.user?.id;
  const isUserOnline = user?.id ? onlineUsers.includes(user.id) : false;

  // If redirecting, render nothing
  if (isRedirecting) return null;

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  if (error || !user)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || "User not found"}
          </h2>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  // ---------- FULL UI (RESTORED) ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft
                size={20}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span className="font-medium">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {user.name}
              </span>
              {user.username && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  @{user.username}
                </span>
              )}
            </div>
            {isCurrentUser ? (
              <button
                onClick={handleOpenSettings}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Settings size={16} />
                  Settings
                </span>
              </button>
            ) : (
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                <MoreHorizontal size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ---------- LEFT COLUMN ---------- */}
          <div className="lg:w-1/3">
            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-6">
                  <div className="w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-500 ring-4 ring-white dark:ring-gray-900 shadow-xl">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={160}
                        height={160}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-5xl">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div
                    className={`absolute bottom-4 right-4 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 ${
                      isUserOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                  {user.name}
                </h1>

                <div className="flex items-center gap-2 mb-6">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isUserOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {isUserOnline
                      ? "Online"
                      : `Last seen ${formatLastSeen(user.lastSeen)}`}
                  </span>
                </div>

                {/* Status */}
                {user.status && (
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    "{user.status}"
                  </p>
                )}

                {/* Follow Stats */}
                <div className="flex justify-around w-full mb-6">
                  <button
                    onClick={handleViewFollowers}
                    className="flex flex-col items-center"
                  >
                    <span className="text-2xl font-bold">
                      {user.followersCount ?? 0}
                    </span>
                    <span className="text-sm">Followers</span>
                  </button>

                  <div className="w-px bg-gray-300" />

                  <button
                    onClick={handleViewFollowing}
                    className="flex flex-col items-center"
                  >
                    <span className="text-2xl font-bold">
                      {user.followingCount ?? 0}
                    </span>
                    <span className="text-sm">Following</span>
                  </button>
                </div>

                {/* Main Action Buttons */}
                <div className="w-full mb-6">
                  {isCurrentUser ? (
                    <button
                      onClick={handleOpenSettings}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Settings size={18} />
                      Settings
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleFollowToggle}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-xl font-medium"
                      >
                        {user.isFollowing ? "Following" : "Follow"}
                      </button>
                      <button
                        onClick={handleSendMessage}
                        className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} /> Message
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Follow Lists */}
            {/* <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 mb-6">
              <button
                onClick={handleViewFollowers}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users
                      size={18}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Followers
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.followersCount || 0} people
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                />
              </button>

              <button
                onClick={handleViewFollowing}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group mt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <UserCheck
                      size={18}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Following
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.followingCount || 0} people
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                />
              </button>
            </div> */}

            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Email
                      </p>
                      <p className="text-gray-900 dark:text-white break-all">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Phone
                      </p>
                      <p className="text-gray-900 dark:text-white">
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
                        className="text-green-600 dark:text-green-600"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Location
                      </p>
                      <p className="text-gray-900 dark:text-white">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Member Since
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(user.joinedDate)}
                      </p>
                    </div>
                  </div>
                )}
                {user.profession && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
                      <Briefcase
                        size={18}
                        className="text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Profession
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        {user.profession}
                      </p>
                    </div>
                  </div>
                )}
                {user.education && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex-shrink-0">
                      <GraduationCap
                        size={18}
                        className="text-teal-600 dark:text-teal-400"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Education
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        {user.education}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------- RIGHT COLUMN ---------- */}
          <div className="lg:w-2/3">
            {/* Bio */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  About
                </h2>
                {isCurrentUser && (
                  <button
                    onClick={handleOpenSettings}
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                  >
                    Settings
                  </button>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {user.bio ||
                  (isCurrentUser
                    ? "You haven't added a bio yet. Add one to tell others about yourself!"
                    : "This user hasn't added a bio yet.")}
              </p>
            </div>

            {/* Social Links */}
            {user.social && Object.values(user.social).some((val) => val) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Social Links
                </h2>
                <div className="flex flex-wrap gap-3">
                  {user.social.instagram && (
                    <a
                      href={user.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all flex items-center gap-2 group"
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
                      className="px-4 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all flex items-center gap-2 group"
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
                      className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 group"
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
                      className="px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-black transition-all flex items-center gap-2 group"
                    >
                      <GlobeIcon size={18} />
                      <span>GitHub</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Website */}
            {user.website && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex-shrink-0">
                    <Globe
                      size={20}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Website
                    </p>
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      {user.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Additional Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield
                      size={18}
                      className="text-green-600 dark:text-green-600"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Account Status
                    </p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {user.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                {user.lastSeen && !isUserOnline && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Calendar
                        size={18}
                        className="text-amber-600 dark:text-amber-400"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last Seen
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatLastSeen(user.lastSeen)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ---------- POSTS SECTION ---------- */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
              <div className="flex justify-center mb-6 border-b border-gray-200 dark:border-gray-800">
                <button className="px-6 py-3 flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">
                  <Grid3x3 className="w-5 h-5" /> <span>Posts</span>
                </button>
              </div>

              <div className="space-y-6">
                {posts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <MessageSquare className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 dark:text-white">
                      No Posts Yet
                    </h3>
                    <p className="text-gray-500">
                      {isCurrentUser
                        ? "Share your first moment with the world!"
                        : "This user hasn't posted anything yet."}
                    </p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      role="link"
                      tabIndex={0}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("button,a,input,textarea,video")) return;
                        router.push(`/feed?postId=${encodeURIComponent(post.id)}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          router.push(`/feed?postId=${encodeURIComponent(post.id)}`);
                        }
                      }}
                      className="cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
                    >
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

                      {editingPostId === post.id && isCurrentUser ? (
                        <div className="space-y-3">
                          <textarea
                            value={editPostText}
                            onChange={(e) => setEditPostText(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 dark:text-white dark:border-gray-600"
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
                            <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">
                              {post.content}
                            </p>
                          )}
                          <ProfilePostMedia media={post.media} altPrefix="Profile post media" />
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
