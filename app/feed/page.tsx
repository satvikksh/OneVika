"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Image from "next/image";
import Webcam from "react-webcam";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Trash2,
  X,
  User,
  Send,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
  MoreVertical,
  Flag,
  Copy,
  Edit,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Orbit,
  Youtube,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserAvatar } from "../hooks/useUserAvatar";
import { useBlinkNavigation } from "../hooks/useBlinkNavigation";
import { PremiumAvatar, PremiumName } from "../components/premium-ui";
import YouTubeShortsFeed, {
  type ShortsNavHandle,
} from "../components/feeds/YouTubeShortsFeed";
import {
  reportCreatorActivity,
  generateEventId,
} from "../lib/creator-activity-client";
import { readSavedPosts, persistSavedPosts, toggleSavedEntry, savedIds } from "../lib/savedPosts";
// import { useSettings } from "../components/settings-provider";




// --- UTILS ---
// Fisher-Yates Shuffle Algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// --- TYPES ---
interface UserType {
  _id: string;
  name: string;
  email: string;
  image?: string;
  avatar?: string;
  isPremium?: boolean;
}

interface CommentType {
  _id: string;
  content: string;
  userId: UserType;
  createdAt: string;
}

interface PostType {
  _id: string;
  content: string;
  images: string[];
  userId: UserType;
  likes: string[];
  comments: CommentType[];
  createdAt: string;
}

interface LikeUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  likeCount: number;
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postUserId: string;
  comments: CommentType[];
  onCommentAdded: (newComment: CommentType) => void;
  onCommentDeleted: (commentId: string) => void;
}

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  currentContent: string;
  onPostUpdated: (postId: string, newContent: string) => void;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostType | null;
  contentType: "post" | "video";
}

interface ShareChatUser {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  image?: string;
  isPremium?: boolean;
  unreadCount?: number;
  lastMessageAt?: string | null;
}

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostType | null;
}

// --- EDIT POST MODAL COMPONENT ---
function EditPostModal({ isOpen, onClose, postId, currentContent, onPostUpdated }: EditPostModalProps) {
  const [content, setContent] = useState(currentContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(currentContent);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(content.length, content.length);
        }
      }, 100);
    }
  }, [isOpen, currentContent]);

  const handleSubmit = async () => {
    if (!content.trim() || content === currentContent) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        onPostUpdated(postId, content);
        onClose();
      }
    } catch (error) {
      console.error("Failed to update post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // const { feed } = useSettings();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b dark:border-gray-900 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Edit Post</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your post content
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-6">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[200px]"
            placeholder="What's on your mind?"
          />
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Press Enter to save, Shift+Enter for new line</p>
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim() || content === currentContent}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ReportModal({ isOpen, onClose, post, contentType }: ReportModalProps) {
  const REPORT_REASONS = [
    "Spam",
    "Harassment",
    "Hate or Abuse",
    "Nudity or Sexual Content",
    "Violence",
    "Misinformation",
    "Copyright",
    "Scam or Fraud",
    "Other",
  ];

  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !post) return;
    setReason("");
    setDescription("");
    setError(null);
    setAlreadyReported(false);
    setSuccess(false);
    setIsSubmitting(false);
    fetch(`/api/reports?contentId=${post._id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.alreadyReported) setAlreadyReported(true);
      })
      .catch(() => {});
  }, [isOpen, post]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!reason || !post || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: post._id, reason, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setAlreadyReported(true);
      } else if (!res.ok) {
        setError(data.error || "Unable to submit report");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col max-h-[82vh] overflow-hidden"
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Flag className="h-5 w-5 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">
                Report {contentType === "video" ? "Video" : "Post"}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Your report is confidential. Our team reviews every report.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-12 gap-4">
            <span className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </span>
            <div>
              <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Report Submitted
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
                Thank you for keeping OrbitByte safe. Our moderators will review this{" "}
                {contentType} shortly.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : alreadyReported ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-12 gap-4">
            <span className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </span>
            <div>
              <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Already Reported
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
                You&apos;ve already reported this {contentType}. Our moderators are on it.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Got It
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Choose a reason
              </p>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_REASONS.map((r) => {
                  const selected = reason === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                        selected
                          ? "border-red-400 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                          : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          selected
                            ? "border-red-500"
                            : "border-neutral-300 dark:border-neutral-600"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-red-500" />}
                      </span>
                      {r}
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Add more detail <span className="text-neutral-400">(optional)</span>
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder="Tell us exactly what happened so we can review faster..."
                  className="w-full resize-none rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3.5 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
                <p className="text-right text-xs text-neutral-400 mt-1">
                  {description.length}/1200
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-700 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- SKELETON LOADER COMPONENT ---
function FeedSkeleton() {
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-black z-0">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 relative bg-gradient-to-b from-gray-900 to-black">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-800/20 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="absolute bottom-2 left-0 right-0 px-4 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-gray-800 rounded animate-pulse" />
              <div className="h-2 w-16 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 w-3/4">
            <div className="h-3 w-full bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="absolute right-4 bottom-32 flex flex-col gap-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />
              <div className="h-2 w-4 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="absolute top-16 max-lg:top-0 left-0 right-0 p-4">
          <div className="flex justify-between">
            <div className="h-6 w-20 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- LIKE USER MODAL COMPONENT ---
function LikeUserModal({
  isOpen,
  onClose,
  postId,
  likeCount,
}: LikeUserModalProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && postId) {
      fetchLikeUsers();
    } else {
      setUsers([]);
      setError(null);
    }
  }, [isOpen, postId]);

  const fetchLikeUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/like`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        throw new Error(`Failed to fetch likes: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to fetch like users:", error);
      setError("Failed to load users who liked this post");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAvatarClick = (userId: string) => {
    router.push(`/profile/${userId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b dark:border-gray-900 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Liked by</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {likeCount} {likeCount === 1 ? "person" : "people"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-2 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchLikeUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No likes yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Be the first to like this post!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <button
                    onClick={() => handleUserAvatarClick(user._id)}
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <PremiumAvatar
                      src={user.image || user.avatar || null}
                      alt={user.name}
                      fallback={user.name}
                      size={40}
                      isPremium={Boolean(user.isPremium)}
                    />
                  </button>
                  <div className="flex-1">
                    <PremiumName
                      name={user.name}
                      isPremium={Boolean(user.isPremium)}
                      badgeLabel="Premium"
                      badgeClassName="px-1.5 py-0.5 text-[9px]"
                      textClassName="font-semibold text-gray-900 dark:text-white"
                    />
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleUserAvatarClick(user._id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                  >
                    <User size={16} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- COMMENTS MODAL COMPONENT ---
function CommentsModal({
  isOpen,
  onClose,
  postId,
  postUserId,
  comments,
  onCommentAdded,
  onCommentDeleted,
}: CommentsModalProps) {
  const { data: session } = useSession();
  const { avatar: currentUserAvatar, isPremium: currentUserIsPremium } =
    useUserAvatar();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const handleUserAvatarClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        onCommentAdded(newCommentData);
        setNewComment("");

        if (commentInputRef.current) {
          commentInputRef.current.style.height = "auto";
        }

        setTimeout(() => {
          if (commentsContainerRef.current) {
            commentsContainerRef.current.scrollTop =
              commentsContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/posts/${postId}/comments?commentId=${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        onCommentDeleted(commentId);
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b dark:border-gray-900 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Comments</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div
          ref={commentsContainerRef}
          className="flex-1 overflow-y-auto p-4 min-h-[200px]"
        >
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No comments yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Be the first to comment!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <button
                    onClick={() => handleUserAvatarClick(comment.userId?._id)}
                    className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <PremiumAvatar
                      src={comment.userId?.image || comment.userId?.avatar || null}
                      alt={comment.userId?.name || "User"}
                      fallback={comment.userId?.name || "U"}
                      size={40}
                      isPremium={Boolean(comment.userId?.isPremium)}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <PremiumName
                            name={comment.userId?.name}
                            isPremium={Boolean(comment.userId?.isPremium)}
                            badgeLabel="Premium"
                            badgeClassName="px-1.5 py-0.5 text-[9px]"
                            textClassName="text-sm font-semibold text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        {session?.user?.id === comment.userId?._id && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-red-500 hover:text-red-600 p-1 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={() =>
                session?.user?.id && handleUserAvatarClick(session.user.id)
              }
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <PremiumAvatar
                src={currentUserAvatar || session?.user?.image || session?.user?.avatar || null}
                alt={session?.user?.name || "You"}
                fallback={session?.user?.name || "Y"}
                size={40}
                isPremium={currentUserIsPremium}
              />
            </button>
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a comment..."
                  className="w-full p-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px] max-h-[120px]"
                  rows={1}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SharePostModal({ isOpen, onClose, post }: SharePostModalProps) {
  const [users, setUsers] = useState<ShareChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setUsers([]);
      setError(null);
      setSearchQuery("");
      setSendingToUserId(null);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/user/chat", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load chats");
        }

        setUsers(Array.isArray(data?.users) ? data.users : []);
      } catch (fetchError) {
        console.error("Failed to load share targets:", fetchError);
        setError("Unable to load chat users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  const shareUrl = post ? `${window.location.origin}/feed?postId=${post._id}` : "";
  const shareText = post
    ? post.content?.trim()
      ? `${post.content.trim()}\n${shareUrl}`
      : shareUrl
    : "";

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    if (post) {
      reportCreatorActivity([
        { eventId: generateEventId(), eventType: "share", contentId: post._id },
      ]);
    }
  };

  const handleSystemShare = async () => {
    if (!post) return;

    if (navigator.share) {
      await navigator.share({
        title: post.images?.some((url) => /\.(mp4|webm|mov)$/i.test(url))
          ? "Check out this video"
          : "Check out this post",
        text: post.content || "Shared from feed",
        url: shareUrl,
      });
      reportCreatorActivity([
        { eventId: generateEventId(), eventType: "share", contentId: post._id },
      ]);
      return;
    }

    await handleCopyLink();
  };

  const handleSendToChat = async (userId: string) => {
    if (!post) return;

    try {
      setSendingToUserId(userId);

      const primaryMediaUrl = post.images?.[0];
      const hasMedia = Boolean(primaryMediaUrl);
      const isSharedVideo = Boolean(primaryMediaUrl && /\.(mp4|webm|mov)$/i.test(primaryMediaUrl));

      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: hasMedia ? (post.content?.trim() || "") : shareText,
          receiverId: userId,
          attachments: hasMedia
            ? [
                {
                  url: primaryMediaUrl,
                  type: isSharedVideo ? "video" : "image",
                  fileName: isSharedVideo ? "Shared feed video" : "Shared feed image",
                  targetUrl: shareUrl,
                  source: "feed",
                },
              ]
            : [],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to share to chat");
      }

      reportCreatorActivity([
        { eventId: generateEventId(), eventType: "share", contentId: post._id },
      ]);
      onClose();
    } catch (sendError) {
      console.error("Failed to share post to chat:", sendError);
      setError(sendError instanceof Error ? sendError.message : "Failed to share to chat");
    } finally {
      setSendingToUserId(null);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b p-5 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Share post</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send directly to mutual chat users
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b p-4 dark:border-gray-800">
          <div className="mb-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
            <p className="line-clamp-2 text-sm text-gray-700 dark:text-gray-200">
              {post.content || "Shared from feed"}
            </p>
            <p className="mt-2 truncate text-xs text-blue-600 dark:text-blue-400">
              {shareUrl}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Copy size={16} />
              Copy link
            </button>
            <button
              onClick={handleSystemShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Share2 size={16} />
              Share outside
            </button>
          </div>
        </div>

        <div className="p-4">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat users"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl p-3">
                  <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="h-2 w-20 rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No chat users available for sharing
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <PremiumAvatar
                    src={user.avatar || user.image || null}
                    alt={user.name}
                    fallback={user.name}
                    size={44}
                    isPremium={Boolean(user.isPremium)}
                  />

                  <div className="min-w-0 flex-1">
                    <PremiumName
                      name={user.name}
                      isPremium={Boolean(user.isPremium)}
                      badgeLabel="Premium"
                      badgeClassName="px-1.5 py-0.5 text-[9px]"
                      textClassName="truncate text-sm font-semibold text-gray-900 dark:text-white"
                    />
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {user.email || "Direct chat"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSendToChat(user._id)}
                    disabled={sendingToUserId === user._id}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sendingToUserId === user._id ? "Sending..." : "Send"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- ANIMATION VARIANTS (INSTANT SCROLL) ---
const variants: Variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? "18%" : "-18%",
    opacity: 0.92,
    scale: 0.985,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? "18%" : "-18%",
    opacity: 0.92,
    scale: 0.985,
  }),
};

type FeedPageCache = {
  posts: PostType[];
  page: number;
  hasMore: boolean;
  currentPostIndex: number;
};

let feedPageCache: FeedPageCache | null = null;

const feedCacheKey = (userId: string) => `orbitbyte:feed-cache:${userId}`;
const WHEEL_SCROLL_THROTTLE_MS = 120;
const WHEEL_DELTA_THRESHOLD = 28;
const SCROLL_UNLOCK_DELAY_MS = 260;
const FEED_CACHE_WRITE_DELAY_MS = 250;
const BLINK_STATUS_BANNER_DURATION_MS = 3500;
const SETTINGS_STORAGE_KEY = "orbitbyte.settings.v1";

function readBlinkScrollSetting() {
  if (typeof window === "undefined") return true;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return true;

    const parsed = JSON.parse(raw) as {
      feed?: { enableBlinkScroll?: boolean };
    };

    if (typeof parsed?.feed?.enableBlinkScroll === "boolean") {
      return parsed.feed.enableBlinkScroll;
    }

    return true;
  } catch {
    return true;
  }
}

// --- MAIN FEED PAGE ---
export default function FeedPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { isPremium } = useUserAvatar();
  const routePostId = searchParams.get("postId");

  const [posts, setPosts] = useState<PostType[]>(() => feedPageCache?.posts ?? []);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(feedPageCache?.hasMore ?? true);
  const [page, setPage] = useState(feedPageCache?.page ?? 1);
  const [initialLoad, setInitialLoad] = useState(!feedPageCache);
  const [blinkScrollEnabled, setBlinkScrollEnabled] = useState(() =>
    readBlinkScrollSetting()
  );
  const [showBlinkStatusBanner, setShowBlinkStatusBanner] = useState(() =>
    readBlinkScrollSetting()
  );
     
  // Navigation State
  const [currentPostIndex, setCurrentPostIndex] = useState(
    feedPageCache?.currentPostIndex ?? 0
  );
  const [direction, setDirection] = useState(0); // 1 = down/next, -1 = up/prev

  // FEED SOURCE MODE (OrbitByte posts vs YouTube Shorts)
  const [feedSource, setFeedSource] = useState<"orbit" | "youtube">("youtube");
  const feedModeRef = useRef<"orbit" | "youtube">("youtube");
  const shortsNavRef = useRef<ShortsNavHandle | null>(null);

  // NAVBAR & OPTIONS VISIBILITY STATE
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);

  // Video controls
  const [isVideoPlaying, setIsVideoPlaying] = useState<Record<string, boolean>>(
    () => ({})
  );
  const [isVideoMuted, setIsVideoMuted] = useState<Record<string, boolean>>(
    () => ({})
  );
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    postId: string;
    content: string;
  }>({
    isOpen: false,
    postId: "",
    content: "",
  });

  const [likeModal, setLikeModal] = useState<{
    isOpen: boolean;
    postId: string;
    likeCount: number;
  }>({
    isOpen: false,
    postId: "",
    likeCount: 0,
  });
  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    postId: string;
    postUserId: string;
    comments: CommentType[];
  }>({
    isOpen: false,
    postId: "",
    postUserId: "",
    comments: [],
  });
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    post: PostType | null;
  }>({
    isOpen: false,
    post: null,
  });
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    post: PostType | null;
    contentType: "post" | "video";
  }>({
    isOpen: false,
    post: null,
    contentType: "post",
  });
  const isBlinkNavigationPaused =
    likeModal.isOpen ||
    commentsModal.isOpen ||
    shareModal.isOpen ||
    editModal.isOpen ||
    reportModal.isOpen;

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null); // REF FOR CAROUSEL
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const watchSessionsRef = useRef<Record<
    string,
    { postId: string; lastTime: number; seenMs: number; durationMs: number }
  >>({});
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const scrollingRef = useRef(false);
  const scrollUnlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPostIndexRef = useRef(currentPostIndex);
  const postsRef = useRef(posts);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselIndexRef = useRef(0);
  const carouselRafRef = useRef<number | null>(null);
  const routePostHandledRef = useRef(false);
  const cacheWriteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ============================
       🔐 REDIRECT (SIDE EFFECT)
  ============================ */
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    currentPostIndexRef.current = currentPostIndex;
  }, [currentPostIndex]);

  useEffect(() => {
    feedModeRef.current = feedSource;
  }, [feedSource]);

  useEffect(() => {
    setSavedPostIds(savedIds(readSavedPosts()));
  }, []);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    routePostHandledRef.current = false;
  }, [routePostId]);

  useEffect(() => {
    carouselIndexRef.current = carouselIndex;
  }, [carouselIndex]);

  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      if (scrollUnlockTimeoutRef.current) {
        clearTimeout(scrollUnlockTimeoutRef.current);
      }
      if (carouselRafRef.current !== null) {
        window.cancelAnimationFrame(carouselRafRef.current);
      }
      if (cacheWriteTimeoutRef.current) {
        clearTimeout(cacheWriteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncBlinkSetting = () => {
      setBlinkScrollEnabled(readBlinkScrollSetting());
    };

    syncBlinkSetting();
    window.addEventListener("storage", syncBlinkSetting);
    window.addEventListener("focus", syncBlinkSetting);

    return () => {
      window.removeEventListener("storage", syncBlinkSetting);
      window.removeEventListener("focus", syncBlinkSetting);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (feedPageCache) return;

    try {
      const cached = sessionStorage.getItem(feedCacheKey(session.user.id));
      if (!cached) return;

      const parsed = JSON.parse(cached) as FeedPageCache;
      if (!parsed?.posts?.length) return;

      feedPageCache = parsed;
      setPosts(parsed.posts);
      setPage(parsed.page ?? 1);
      setHasMore(typeof parsed.hasMore === "boolean" ? parsed.hasMore : true);
      setCurrentPostIndex(parsed.currentPostIndex ?? 0);
      setInitialLoad(false);
    } catch (error) {
      console.warn("Failed to restore feed cache:", error);
    }
  }, [status, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || posts.length === 0) return;

    if (cacheWriteTimeoutRef.current) {
      clearTimeout(cacheWriteTimeoutRef.current);
    }

    cacheWriteTimeoutRef.current = setTimeout(() => {
      const snapshot: FeedPageCache = {
        posts,
        page,
        hasMore,
        currentPostIndex,
      };

      feedPageCache = snapshot;

      try {
        sessionStorage.setItem(feedCacheKey(session.user.id), JSON.stringify(snapshot));
      } catch {
        // ignore storage quota issues
      }
    }, FEED_CACHE_WRITE_DELAY_MS);

    return () => {
      if (cacheWriteTimeoutRef.current) {
        clearTimeout(cacheWriteTimeoutRef.current);
      }
    };
  }, [
    session?.user?.id,
    posts,
    page,
    hasMore,
    currentPostIndex,
  ]);

  useEffect(() => {
    if (!routePostId || posts.length === 0 || routePostHandledRef.current) return;

    const matchedIndex = posts.findIndex((post) => post._id === routePostId);
    if (matchedIndex >= 0) {
      setCurrentPostIndex(matchedIndex);
      currentPostIndexRef.current = matchedIndex;
      routePostHandledRef.current = true;
    }
  }, [routePostId, posts]);

  /* ============================
       SCROLL CAROUSEL ON INDEX CHANGE
  ============================ */
  useEffect(() => {
    if (carouselContainerRef.current) {
        carouselContainerRef.current.scrollTo({
            left: carouselIndex * carouselContainerRef.current.clientWidth,
            behavior: "smooth"
        });
    }
  }, [carouselIndex]);

  /* ============================
       CHECK IF MEDIA IS VIDEO
  ============================ */
  const isVideo = (url: string | undefined | null): boolean => {
    if (!url) return false;
    return (
      url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")
    );
  };

  /* ============================
       FETCH POSTS WITH PAGINATION & SHUFFLE
  ============================ */
  const fetchPosts = useCallback(
    async (pageNum: number, isInitialLoad = false, customLimit = 10) => {
      if (
        !session?.user?.id ||
        (loadingPosts && isInitialLoad) ||
        (loadingMore && !isInitialLoad)
      )
        return;

      if (isInitialLoad) {
        setLoadingPosts(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetch(`/api/posts?page=${pageNum}&limit=${customLimit}`);
        if (!response.ok) throw new Error("Failed to fetch posts");

        const data = await response.json();

        if (data.length === 0) {
          setHasMore(false);
          return;
        }

        const postsWithComments = (data as PostType[]).map((post) => ({
          ...post,
          comments: Array.isArray(post.comments) ? post.comments : [],
        }));

        if (isInitialLoad) {
          // SHUFFLE POSTS ON INITIAL LOAD
          const shuffledPosts = shuffleArray(postsWithComments);
          setPosts(shuffledPosts);
          setInitialLoad(false);

          // Initialize video states
          const playingStates: Record<string, boolean> = {};
          const muteStates: Record<string, boolean> = {};
          shuffledPosts.forEach((post) => {
            if (post.images?.length > 0) {
               post.images.forEach((_, idx) => {
                 playingStates[`${post._id}-${idx}`] = true;
                 muteStates[`${post._id}-${idx}`] = false;
               })
            }
          });
          setIsVideoPlaying(playingStates);
          setIsVideoMuted(muteStates);
        } else {
          setPosts((prev) => {
            // SHUFFLE NEW BATCH AS WELL
            const shuffledNewPosts = shuffleArray(postsWithComments);
             
            const newPosts = shuffledNewPosts.filter(
              (newPost) =>
                !prev.some((existingPost) => existingPost._id === newPost._id)
            );

            const newPlayingStates: Record<string, boolean> = {};
            const newMuteStates: Record<string, boolean> = {};
            newPosts.forEach((post) => {
               if (post.images?.length > 0) {
                 post.images.forEach((_, idx) => {
                    newPlayingStates[`${post._id}-${idx}`] = true;
                    newMuteStates[`${post._id}-${idx}`] = false;
                 })
               }
            });

            setIsVideoPlaying((prevStates) => ({
              ...prevStates,
              ...newPlayingStates,
            }));
            setIsVideoMuted((prevStates) => ({
              ...prevStates,
              ...newMuteStates,
            }));

            return [...prev, ...newPosts];
          });
        }

        if (data.length < customLimit) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        setHasMore(false);
      } finally {
        setLoadingPosts(false);
        setLoadingMore(false);
      }
    },
    [session?.user?.id, loadingPosts, loadingMore]
  );

  /* ============================
       INITIAL LOAD (LIMIT 1)
  ============================ */
  useEffect(() => {
    if (status === "authenticated" && initialLoad) {
      fetchPosts(1, true, 5);
    }
  }, [status, initialLoad, fetchPosts]);

  /* ============================
       FORCE NAVBAR SHOW ON TOP
  ============================ */
  useEffect(() => {
    if (currentPostIndex === 0) {
      setIsNavbarVisible(true);
    }
  }, [currentPostIndex]);

  /* ============================
       INFINITE SCROLL OBSERVER
  ============================ */
  useEffect(() => {
    if (!hasMore || loadingMore || posts.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, false, 5);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, page, fetchPosts, posts.length]);

  /* ============================
       CORE NAVIGATION LOGIC
  ============================ */
  const navigateFeed = useCallback(
    (navDirection: number) => {
      const currentIndex = currentPostIndexRef.current;
      const postsSnapshot = postsRef.current;
      const nextIndex = currentIndex + navDirection;

      if (nextIndex < 0 || nextIndex >= postsSnapshot.length) return;

      scrollingRef.current = true;
      setDirection(navDirection);

      setIsNavbarVisible(navDirection === -1 && nextIndex === 0);
      setShowOptions(false);

      // Handle Video Logic (Pause current)
      const currentPost = postsSnapshot[currentIndex];
      // Pause ALL videos in the current post (carousel support)
      if (currentPost && currentPost.images) {
        const pausedKeys: string[] = [];
        currentPost.images.forEach((_, idx) => {
          const key = `${currentPost._id}-${idx}`;
          const video = videoRefs.current[key];
          if (video && !video.paused) {
            video.pause();
            pausedKeys.push(key);
          }
        });

        if (pausedKeys.length > 0) {
          setIsVideoPlaying((prev) => {
            const next = { ...prev };
            let hasChanges = false;
            pausedKeys.forEach((key) => {
              if (next[key]) {
                next[key] = false;
                hasChanges = true;
              }
            });
            return hasChanges ? next : prev;
          });
        }
      }

      setCurrentPostIndex(nextIndex);
      currentPostIndexRef.current = nextIndex;
      setCarouselIndex(0); // Reset carousel index when changing posts
      carouselIndexRef.current = 0;
      
      // Reset scroll position of carousel when changing posts
      if (carouselContainerRef.current) {
          carouselContainerRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      }

      if (scrollUnlockTimeoutRef.current) {
        clearTimeout(scrollUnlockTimeoutRef.current);
      }
      scrollUnlockTimeoutRef.current = setTimeout(() => {
        scrollingRef.current = false;
      }, SCROLL_UNLOCK_DELAY_MS);
    },
    []
  );

  const handleBlinkNextReel = useCallback(() => {
    if (feedModeRef.current === "youtube") {
      shortsNavRef.current?.next();
      return;
    }
    navigateFeed(1);
  }, [navigateFeed]);

  const handleBlinkPreviousReel = useCallback(() => {
    if (feedModeRef.current === "youtube") {
      shortsNavRef.current?.prev();
      return;
    }
    navigateFeed(-1);
  }, [navigateFeed]);

  const {
    webcamRef,
    webcamProps,
    loading: blinkLoading,
    error: blinkNavigationError,
    isReady: isBlinkNavigationReady,
  } = useBlinkNavigation(
    handleBlinkNextReel,
    handleBlinkPreviousReel,
    blinkScrollEnabled,
    isBlinkNavigationPaused
  );

  useEffect(() => {
    if (!blinkScrollEnabled) {
      setShowBlinkStatusBanner(false);
      return;
    }

    setShowBlinkStatusBanner(true);

    if (blinkNavigationError || blinkLoading || isBlinkNavigationPaused) {
      setShowBlinkStatusBanner(true);
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setShowBlinkStatusBanner(false);
    }, BLINK_STATUS_BANNER_DURATION_MS);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [
    blinkLoading,
    blinkNavigationError,
    blinkScrollEnabled,
    isBlinkNavigationPaused,
  ]);

  /* ============================
       HANDLE WHEEL SCROLL
  ============================ */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (feedModeRef.current !== "orbit") return;

      e.preventDefault();

      if (scrollingRef.current || posts.length === 0) return;

      const delta = e.deltaY;
        
      if (Math.abs(delta) < WHEEL_DELTA_THRESHOLD) return;

      const currentTime = Date.now();
      if (currentTime - lastScrollY.current < WHEEL_SCROLL_THROTTLE_MS) return; 

      if (delta > 0) {
        navigateFeed(1);
      } else {
        navigateFeed(-1);
      }
        
      lastScrollY.current = currentTime;
    },
    [posts.length, navigateFeed]
  );

  /* ============================
       HANDLE TOUCH SCROLL
  ============================ */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touchY = e.touches[0].clientY;
    lastScrollY.current = touchY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (feedModeRef.current !== "orbit") return;

      const target = e.target as HTMLElement;
      const isInteractive =
        target.closest("button") ||
        target.closest("a") ||
        target.closest("textarea") ||
        target.closest("input") ||
        target.closest(".carousel-container"); // Added class for check

      // Allow horizontal scroll in carousel without triggering vertical nav
      if (target.closest(".carousel-container")) return;

      if (isInteractive) return;

      const touchStartY = lastScrollY.current;
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY - touchEndY;
      
      if (Math.abs(diffY) > 50) {
        e.preventDefault();
        if (scrollingRef.current || posts.length === 0) return;

        if (diffY > 0) {
          navigateFeed(1);
        } else {
          navigateFeed(-1);
        }
      }
    },
    [posts.length, navigateFeed]
  );

  /* ============================
       ADD EVENT LISTENERS
  ============================ */
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchEnd]);

  /* ============================
       LIKE FUNCTIONALITY
  ============================ */
  const toggleLike = useCallback(
    async (postId: string) => {
      if (!session?.user?.id) return;

      const post = posts.find((p) => p._id === postId);
      if (!post) return;

      const wasLiked = post.likes.includes(session.user.id);
      const updatedLikes = wasLiked
        ? post.likes.filter((uid: string) => uid !== session.user.id)
        : [...post.likes, session.user.id];

      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likes: updatedLikes } : p))
      );

      try {
        await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      } catch (error) {
        setPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, likes: post.likes } : p))
        );
      }
    },
    [posts, session?.user?.id]
  );

  /* ============================
       HANDLE SINGLE TAP
  ============================ */
  const handleSingleTap = useCallback((postId: string, isVideo: boolean, index: number = 0) => {
    if (!isVideo) return;
    
    const key = `${postId}-${index}`;
    const video = videoRefs.current[key];
    
    if (video) {
      if (video.paused) {
        video.play();
        setIsVideoPlaying((prev) => ({ ...prev, [key]: true }));
      } else {
        video.pause();
        setIsVideoPlaying((prev) => ({ ...prev, [key]: false }));
      }
    }

    setIsNavbarVisible(true);
    setShowOptions(false);
  }, []);

  /* ============================
       HANDLE DOUBLE TAP (MODIFIED)
  ============================ */
  const handleDoubleTap = useCallback(
    (postId: string) => {
      // Find the post to check current status
      const post = posts.find((p) => p._id === postId);
      if (post && session?.user?.id) {
        const isLiked = post.likes.includes(session.user.id);
        
        // ONLY toggle if NOT already liked
        if (!isLiked) {
           toggleLike(postId);
        }
      }
      
      // Always show animation regardless of whether we called toggleLike
      setDoubleTapLike(postId);
      setTimeout(() => setDoubleTapLike(null), 1000);
      setIsNavbarVisible(true);
    },
    [toggleLike, posts, session?.user?.id] // Added dependencies
  );

 /* ============================
        HANDLE MEDIA CLICK (UPDATED)
  ============================ */
  const handleMediaClick = useCallback(
    (e: React.MouseEvent, postId: string, isVideo: boolean, index: number = 0) => {
      e.stopPropagation();
      if (showOptions) {
        setShowOptions(false);
        return;
      }

      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastTapRef.current;

      // Check if this click is part of a double-click (within 300ms)
      if (timeDiff < 300 && timeDiff > 0) {
        // --- DOUBLE CLICK DETECTED ---
        
        // 1. Cancel the pending single click action! 
        // This prevents the video from pausing/playing when you just wanted to Like.
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        // 2. Perform Double Click Action (Like Only)
        handleDoubleTap(postId);
        
        // 3. Reset tap reference so a 3rd click doesn't register as another double tap immediately
        lastTapRef.current = 0;
      } else {
        // --- SINGLE CLICK DETECTED ---
        lastTapRef.current = currentTime;

        // 4. Delay the Single Click action (Play/Pause)
        // We wait 300ms to make sure the user isn't about to click again.
        tapTimeoutRef.current = setTimeout(() => {
           handleSingleTap(postId, isVideo, index);
           tapTimeoutRef.current = null;
        }, 300);
      }
    },
    [handleSingleTap, handleDoubleTap, showOptions]
  );

  /* ============================
       TOGGLE VIDEO MUTE
  ============================ */
  const toggleMute = useCallback((postId: string, index: number = 0) => {
    const key = `${postId}-${index}`;
    const video = videoRefs.current[key];
    if (video) {
      video.muted = !video.muted;
      setIsVideoMuted((prev) => ({ ...prev, [key]: !prev[key] }));
    }
    setIsNavbarVisible(true);
  }, []);

  /* ============================
       VIDEO ACTIVITY TRACKING
  ============================ */
  const endVideoSession = useCallback((key: string, completed: boolean) => {
    const session = watchSessionsRef.current[key];
    delete watchSessionsRef.current[key];
    if (!session) return;

    const watchedMs = Math.round(session.seenMs * 1000);
    if (watchedMs < 500) return;

    reportCreatorActivity([
      {
        eventId: generateEventId(),
        eventType: completed ? "complete" : "watch",
        contentId: session.postId,
        watchedMs,
        durationMs: Math.round(session.durationMs) || undefined,
        completed,
      },
    ]);
  }, []);

  const trackVideoTime = useCallback((key: string, video: HTMLVideoElement) => {
    const session = watchSessionsRef.current[key];
    if (!session) return;
    const now = video.currentTime || 0;
    if (now > session.lastTime) {
      session.seenMs += now - session.lastTime;
    }
    session.lastTime = now;

    // Videos loop here, so the `ended` event never fires. Treat a full
    // playthrough (or the platform's completion threshold) as completed.
    const completionThresholdSec = Math.max(session.durationMs / 1000, 15);
    if (session.seenMs + 1 >= completionThresholdSec) {
      endVideoSession(key, true);
    }
  }, [endVideoSession]);

  const trackVideoPlay = useCallback(
    (key: string, postId: string, video: HTMLVideoElement) => {
      if (watchSessionsRef.current[key]) return;
      const durationMs =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration * 1000
          : 0;
      watchSessionsRef.current[key] = {
        postId,
        lastTime: video.currentTime || 0,
        seenMs: 0,
        durationMs,
      };
    },
    []
  );

  /* ============================
       SHARE POST FUNCTION
  ============================ */
  const handleShare = (postId: string) => {
    const selectedPost = posts.find((post) => post._id === postId) || null;
    setShareModal({
      isOpen: true,
      post: selectedPost,
    });
    setIsNavbarVisible(true);
  };

  const toggleSavedPost = (postId: string) => {
    const next = toggleSavedEntry(readSavedPosts(), postId);
    persistSavedPosts(next);
    setSavedPostIds(savedIds(next));
  };

  const openLikeModal = (postId: string, likeCount: number) => {
    setLikeModal({ isOpen: true, postId, likeCount });
    setIsNavbarVisible(true);
  };

  const closeLikeModal = () => {
    setLikeModal({ isOpen: false, postId: "", likeCount: 0 });
  };

  const openCommentsModal = async (
    postId: string,
    postUserId: string,
    currentComments: CommentType[] = []
  ) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      let comments = currentComments;

      if (response.ok) {
        comments = await response.json();
      }
      setCommentsModal({
        isOpen: true,
        postId,
        postUserId,
        comments: comments || [],
      });
    } catch (error) {
      setCommentsModal({
        isOpen: true,
        postId,
        postUserId,
        comments: currentComments || [],
      });
    }
    setIsNavbarVisible(true);
  };

  const closeCommentsModal = () => {
    setCommentsModal({
      isOpen: false,
      postId: "",
      postUserId: "",
      comments: [],
    });
  };

  const handleCommentAdded = (postId: string, newComment: CommentType) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      )
    );
    if (commentsModal.isOpen && commentsModal.postId === postId) {
      setCommentsModal((prev) => ({
        ...prev,
        comments: [...prev.comments, newComment],
      }));
    }
  };

  const handleCommentDeleted = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? {
              ...post,
              comments: post.comments.filter((c) => c._id !== commentId),
            }
          : post
      )
    );
    if (commentsModal.isOpen && commentsModal.postId === postId) {
      setCommentsModal((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c._id !== commentId),
      }));
    }
  };

  const handlePostUpdated = (postId: string, newContent: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId ? { ...post, content: newContent } : post
      )
    );
  };

  const deletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Failed to delete post");
    setPosts((prev) => prev.filter((p) => p._id !== id));
    setIsNavbarVisible(true);
    setShowOptions(false);
  };

  const handleUserAvatarClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  // Handle carousel navigation
  const handleCarouselNavigate = (direction: 'left' | 'right') => {
    const currentPost = posts[currentPostIndex];
    if (!currentPost?.images || currentPost.images.length <= 1) return;
    
    const newIndex = direction === 'right' 
      ? Math.min(carouselIndex + 1, currentPost.images.length - 1)
      : Math.max(carouselIndex - 1, 0);
    
    setCarouselIndex(newIndex);
  };

  // Sync scroll with index
  const handleCarouselScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (carouselRafRef.current !== null) return;

    carouselRafRef.current = window.requestAnimationFrame(() => {
      const width = container.clientWidth || 1;
      const index = Math.round(container.scrollLeft / width);
      if (index !== carouselIndexRef.current) {
        carouselIndexRef.current = index;
        setCarouselIndex(index);
      }
      carouselRafRef.current = null;
    });
  };

  useEffect(() => {
    const activePost = posts[currentPostIndex];
    if (!activePost || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.pathname !== "/feed") {
      url.pathname = "/feed";
    }

    if (url.searchParams.get("postId") === activePost._id) return;

    url.searchParams.set("postId", activePost._id);
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [currentPostIndex, posts]);

  const currentPost = posts[currentPostIndex];
  const mediaCount = currentPost?.images?.length || 0;
  const isTextOnly = mediaCount === 0;
  const isCarousel = mediaCount > 1;
  const nextPost = posts[currentPostIndex + 1];
  const previousPost = posts[currentPostIndex - 1];

  useEffect(() => {
    const nearbyPosts = [previousPost, currentPost, nextPost].filter(Boolean) as PostType[];

    nearbyPosts.forEach((post) => {
      post.images?.forEach((src) => {
        if (isVideo(src)) {
          const link = document.createElement("link");
          link.rel = "preload";
          link.as = "video";
          link.href = src;
          document.head.appendChild(link);

          window.setTimeout(() => {
            if (document.head.contains(link)) {
              document.head.removeChild(link);
            }
          }, 4000);
        } else if (src) {
          const img = new window.Image();
          img.src = src;
        }
      });
    });
  }, [currentPostIndex, currentPost, nextPost, previousPost]);

  if (loadingPosts && initialLoad) {
    return <FeedSkeleton />;
  }

  if (status === "loading") {
    return <FeedSkeleton />;
  }

  // Check if current media is video
  const currentMediaIsVideo = currentPost?.images 
    ? isVideo(currentPost.images[carouselIndex])
    : false;
  const blinkStatusMessage = !blinkScrollEnabled
    ? null
    : blinkNavigationError
      ? blinkNavigationError
      : blinkLoading
        ? "Starting eye-blink navigation..."
        : isBlinkNavigationPaused
          ? "Eye navigation paused while a modal is open."
          : isBlinkNavigationReady
            ? "Eye navigation on: double blink for next reel, triple blink for previous reel."
            : "Preparing eye navigation...";

  return (
    <>
      {/* Add CSS for scrollbar hide */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {blinkScrollEnabled && (
        <>
          {showBlinkStatusBanner && (
            <div className="pointer-events-none fixed right-4 top-20 z-[75] max-w-xs rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white/10 p-2">
                  {blinkLoading ? (
                    <Loader2 size={16} className="animate-spin text-amber-300" />
                  ) : (
                    <Eye size={16} className="text-amber-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Eye-Blink Navigation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/75">
                    {blinkStatusMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none fixed bottom-4 right-4 opacity-0">
            <Webcam
              ref={webcamRef}
              {...webcamProps}
              className="h-24 w-24"
            />
          </div>
        </>
      )}

      <div
        ref={feedContainerRef}
className={`fixed inset-0 w-screen h-[100dvh] overflow-hidden overscroll-none ${
            feedSource !== "orbit" ? "touch-pan-y" : "touch-none"
          } ${isDark ? "dark bg-black" : "bg-black"}`}
      >
        {/* FEED SOURCE TOGGLE (OrbitByte / YouTube Shorts) */}
        <div
          className={`absolute z-40 ${
            feedSource === "orbit" ? "max-lg:right-4 max-lg:top-4" : "max-lg:hidden"
          } lg:left-8 lg:top-20`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/50 p-1 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setFeedSource("orbit")}
              aria-pressed={feedSource === "orbit"}
              aria-label="Show OrbitByte posts"
              title="OrbitByte posts"
              className={`flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition active:scale-95 ${
                feedSource === "orbit"
                  ? isPremium
                    ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white/15 text-white ring-1 ring-white/25"
                  : "text-white/50 hover:text-white/90"
              }`}
            >
              <Orbit size={15} />
              <span className="hidden lg:inline">OrbitByte</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedSource("youtube")}
              aria-pressed={feedSource === "youtube"}
              aria-label="Show YouTube Shorts"
              title="YouTube Shorts"
              className={`flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition active:scale-95 ${
                feedSource === "youtube"
                  ? "bg-red-500/20 text-red-300 ring-1 ring-red-400/40"
                  : "text-white/50 hover:text-white/90"
              }`}
            >
              <Youtube size={15} />
              <span className="hidden lg:inline">Shorts</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
{feedSource === "orbit" && (
  <motion.div
    key="orbit"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="absolute inset-0"
  >
          <>
        {/* CURRENT POST - FULL SCREEN */}
        <AnimatePresence custom={direction}>
          {currentPost ? (
            <motion.div
              key={currentPost._id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                y: { type: "spring", stiffness: 280, damping: 30, mass: 0.85 },
                opacity: { duration: 0.16 },
                scale: { duration: 0.18 },
              }}
              className="absolute inset-0 flex flex-col will-change-transform"
            >
              {/* ==================================================
                                MEDIA CONTENT AREA
                 ================================================== */}
              <div className="flex-1 relative bg-black flex items-center justify-center">
                
                {/* --- 1. TEXT ONLY MODE --- */}
                {isTextOnly && (
                  <div 
                    className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-blue-900 via-blue-500 to-teal-500"
                    onDoubleClick={() => handleDoubleTap(currentPost._id)}
                  >
                    <p className="text-white text-2xl md:text-3xl font-bold text-center leading-relaxed drop-shadow-lg break-words max-w-2xl">
                       {currentPost.content}
                    </p>
                    
                    {/* Double Tap Heart Animation for Text Mode */}
                    <AnimatePresence>
                      {doubleTapLike === currentPost._id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <Heart
                            size={100}
                            className="text-transparent fill-white drop-shadow-xl"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* --- 2. CAROUSEL MODE ( > 1 IMAGE) --- */}
                {isCarousel && (
                    <div className="relative w-full h-full carousel-container">
                      <div 
                        ref={carouselContainerRef} // ATTACH REF HERE
                        onScroll={handleCarouselScroll} // ATTACH SCROLL LISTENER
                        className="w-full h-full flex overflow-x-scroll snap-x snap-mandatory no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {currentPost.images.map((src, index) => {
                           const isItemVideo = isVideo(src);
                           const key = `${currentPost._id}-${index}`;
                           
                           return (
                             <div 
                                key={key} 
                                className="w-full h-full flex-shrink-0 snap-center relative flex items-center justify-center bg-black"
                                onClick={(e) => handleMediaClick(e, currentPost._id, isItemVideo, index)}
                             >
                                {isItemVideo ? (
                                  <>
                                    <video
                                      ref={(el) => {
                                        videoRefs.current[key] = el;
                                      }}
                                      src={src}
                                      className="w-full h-full object-contain pointer-events-none"
                                      loop
                                      muted={isVideoMuted[key]}
                                      playsInline
                                      onPlay={(e) =>
                                        trackVideoPlay(key, currentPost._id, e.currentTarget)
                                      }
                                      onTimeUpdate={(e) =>
                                        trackVideoTime(key, e.currentTarget)
                                      }
                                      onPause={() => endVideoSession(key, false)}
                                      onEnded={() => endVideoSession(key, true)}
                                    />
                                    {!isVideoPlaying[key] && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                                        <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                                          <Play size={32} className="text-white fill-white ml-1" />
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="relative w-full h-full">
                                      <Image
                                        src={src}
                                        alt={`Post image ${index + 1}`}
                                        fill
                                        className="object-contain"
                                        priority={index === 0}
                                      />
                                  </div>
                                )}
                                
                                {/* Page indicator overlay for specific item */}
                                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium pointer-events-none">
                                   {index + 1}/{mediaCount}
                                </div>
                             </div>
                           )
                        })}
                      </div>
                      
                      {/* Carousel Navigation Buttons - Desktop Only */}
                      {isDesktop && (
                        <>
                          {carouselIndex > 0 && (
                            <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleCarouselNavigate('left');
                              }}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center z-10 hover:bg-black/70 transition-colors"
                            >
                              <ChevronLeft className="text-white" size={24} />
                            </button>
                          )}
                          {carouselIndex < mediaCount - 1 && (
                            <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleCarouselNavigate('right');
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center z-10 hover:bg-black/70 transition-colors"
                            >
                              <ChevronRight className="text-white" size={24} />
                            </button>
                          )}
                        </>
                      )}
                      
                      {/* Carousel Dots - Always visible */}
                      {mediaCount > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                          {currentPost.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setCarouselIndex(index);
                              }}
                              className={`transition-all duration-300 ${
                               index === carouselIndex 
                                 ? 'w-8 h-2 bg-white rounded-full' 
                                 : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/70'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Double Tap Heart Animation (Global for carousel) */}
                      <AnimatePresence>
                       {doubleTapLike === currentPost._id && (
                         <motion.div
                           initial={{ scale: 0, opacity: 1 }}
                           animate={{ scale: 1, opacity: 1 }}
                           exit={{ scale: 1.5, opacity: 0 }}
                           transition={{ duration: 0.5 }}
                           className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                         >
                           <Heart
                             size={100}
                             className="text-transparent fill-red-600 drop-shadow-lg"
                           />
                         </motion.div>
                       )}
                      </AnimatePresence>
                    </div>
                )}

                {/* --- 3. SINGLE MEDIA MODE --- */}
                {!isTextOnly && !isCarousel && (
                  <div
                    className="w-full h-full relative"
                    onClick={(e) =>
                      handleMediaClick(e, currentPost._id, isVideo(currentPost.images[0]))
                    }
                  >
                    {isVideo(currentPost.images[0]) ? (
                      <>
                        <video
                          ref={(el) => {
                            videoRefs.current[`${currentPost._id}-0`] = el;
                          }}
                          src={currentPost.images[0]}
                          className="absolute inset-0 w-full h-full object-contain bg-black pointer-events-none"
                          autoPlay
                          loop
                          muted={isVideoMuted[`${currentPost._id}-0`]}
                          playsInline
                          onPlay={(e) =>
                            trackVideoPlay(
                              `${currentPost._id}-0`,
                              currentPost._id,
                              e.currentTarget
                            )
                          }
                          onTimeUpdate={(e) =>
                            trackVideoTime(`${currentPost._id}-0`, e.currentTarget)
                          }
                          onPause={() => endVideoSession(`${currentPost._id}-0`, false)}
                          onEnded={() => endVideoSession(`${currentPost._id}-0`, true)}
                        />
                        {!isVideoPlaying[`${currentPost._id}-0`] && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                              <Play size={40} className="text-white ml-1 fill-white" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <Image
                        src={currentPost.images[0]}
                        alt="Post image"
                        fill
                        className="object-contain"
                        priority
                      />
                    )}

                    {/* Double Tap Heart Animation */}
                    <AnimatePresence>
                      {doubleTapLike === currentPost._id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1.5, opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <Heart
                            size={100}
                            className="text-transparent fill-red-600 drop-shadow-lg"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* POST CONTENT OVERLAY */}
              <div className="absolute bottom-2 left-0 right-0 px-4 pb-12 pointer-events-none">
                <div className="pointer-events-auto">
                  {/* USER INFO */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() =>
                        handleUserAvatarClick(currentPost.userId?._id)
                      }
                      className="cursor-pointer hover:opacity-90 transition-opacity pointer-events-auto shadow-md"
                    >
                      <PremiumAvatar
                        src={
                          currentPost.userId?.image ||
                          currentPost.userId?.avatar ||
                          null
                        }
                        alt={currentPost.userId?.name || "User"}
                        fallback={currentPost.userId?.name || "U"}
                        size={36}
                        isPremium={Boolean(currentPost.userId?.isPremium)}
                      />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <PremiumName
                            name={currentPost.userId?.name}
                            isPremium={Boolean(currentPost.userId?.isPremium)}
                            badgeLabel="Premium"
                            badgeClassName="px-1.5 py-0.5 text-[9px]"
                            textClassName="text-sm font-bold text-white drop-shadow-md"
                          />
                          <p className="text-xs text-gray-300 drop-shadow-md">
                            {new Date(currentPost.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* POST TEXT (Only show here if NOT Text-Only mode) */}
                  {!isTextOnly && currentPost.content && (
                    <div className="mb-4">
                      <p className="text-white text-sm leading-relaxed drop-shadow-md line-clamp-3">
                        {currentPost.content}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* TOP NAVBAR CONTROLS */}
              <AnimatePresence>
                {isNavbarVisible && (
                  <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
                  >
                    <div className="absolute top-4 left-4 pointer-events-auto">
                      <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X size={20} className="text-white" />
                      </button>
                    </div>
                    
                    {/* Post counter */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
                      <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm">
                        {currentPostIndex + 1} / {posts.length}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
                
              {/* RIGHT SIDE ACTION BAR (SMALL ICONS) */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-4 z-50 pointer-events-none">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggleLike(currentPost._id)}
                    className="flex flex-col items-center gap-1 pointer-events-auto transition-transform active:scale-90"
                  >
                    <Heart
                      size={24} // Resized to smaller standard
                      className={`transition-all duration-300 drop-shadow-md ${
                        currentPost.likes.includes(session?.user?.id || "")
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() =>
                      openLikeModal(currentPost._id, currentPost.likes.length)
                    }
                    className="text-white text-xs font-medium hover:underline pointer-events-auto drop-shadow-md"
                  >
                    {currentPost.likes.length}
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() =>
                      openCommentsModal(
                        currentPost._id,
                        currentPost.userId?._id,
                        currentPost.comments || []
                      )
                    }
                    className="flex flex-col items-center gap-1 pointer-events-auto transition-transform active:scale-90"
                  >
                    <MessageCircle size={24} className="text-white drop-shadow-md" />
                  </button>
                  <button
                    onClick={() =>
                      openCommentsModal(
                        currentPost._id,
                        currentPost.userId?._id,
                        currentPost.comments || []
                      )
                    }
                    className="text-white text-xs font-medium hover:underline pointer-events-auto drop-shadow-md"
                  >
                    {currentPost.comments?.length || 0}
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleShare(currentPost._id)}
                    className="flex flex-col items-center gap-1 pointer-events-auto transition-transform active:scale-90"
                  >
                    <Share2 size={24} className="text-white drop-shadow-md" />
                  </button>
                  <span className="text-white text-xs font-medium drop-shadow-md"></span>
                </div>

                <button
                  onClick={() => toggleSavedPost(currentPost._id)}
                  className="flex flex-col items-center gap-1 pointer-events-auto transition-transform active:scale-90"
                  aria-label={
                    savedPostIds.includes(currentPost._id)
                      ? "Unsave post"
                      : "Save post"
                  }
                >
                  <Bookmark
                    size={24}
                    fill={
                      savedPostIds.includes(currentPost._id)
                        ? "currentColor"
                        : "none"
                    }
                    className={
                      savedPostIds.includes(currentPost._id)
                        ? "text-blue-400 drop-shadow-md"
                        : "text-white drop-shadow-md"
                    }
                  />
                  <span className="text-white text-xs font-medium drop-shadow-md"></span>
                </button>

                <div className="relative pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(!showOptions);
                    }}
                    className="flex flex-col items-center gap-1 transition-transform active:scale-90"
                  >
                    <MoreVertical size={24} className="text-white drop-shadow-md" />
                  </button>

                  <AnimatePresence>
                    {showOptions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 10 }}
                        className="absolute right-12 bottom-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden z-[60] origin-bottom-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col py-1">
                          {currentPost.userId?._id === session?.user?.id ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditModal({
                                    isOpen: true,
                                    postId: currentPost._id,
                                    content: currentPost.content,
                                  });
                                  setShowOptions(false);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                              >
                                <Edit size={16} />
                                Edit Post
                              </button>
                              <button
                                onClick={() => deletePost(currentPost._id)}
                                className="flex items-center gap-2 w-full px-4 py-3 text-left text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                              >
                                <Trash2 size={16} />
                                Delete Post
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setReportModal({
                                  isOpen: true,
                                  post: currentPost,
                                  contentType: currentMediaIsVideo ? "video" : "post",
                                });
                                setShowOptions(false);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                            >
                              <Flag size={16} />
                              Report
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* --- MUTE BUTTON (Conditional) --- */}
                {currentMediaIsVideo && (
                    <button 
                        onClick={(e) => {
                        e.stopPropagation();
                        toggleMute(currentPost._id, carouselIndex);
                        }}
                        className="flex flex-col items-center gap-1 pointer-events-auto transition-transform active:scale-90"
                    >
                        <div className="w-[24px] h-[24px] flex items-center justify-center">
                            {isVideoMuted[`${currentPost._id}-${carouselIndex}`] ? (
                                <VolumeX size={24} className="text-white drop-shadow-md" />
                            ) : (
                                <Volume2 size={24} className="text-white drop-shadow-md" />
                            )}
                        </div>
                        <span className="text-white text-xs font-medium drop-shadow-md">
                            {isVideoMuted[`${currentPost._id}-${carouselIndex}`]}
                        </span>
                    </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {posts.length === 0 && !loadingPosts ? (
                <div className="text-center p-8">
                  <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-300 mb-2">
                    No posts yet
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Be the first to share your imagination!
                  </p>
                  <button
                    onClick={() => router.push('/create')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    Create Your First Post
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </AnimatePresence>

        {/* LOAD MORE TRIGGER */}
        {hasMore &&
          !loadingMore &&
          posts.length > 0 &&
          currentPostIndex > posts.length - 3 && (
            <div ref={loadMoreRef} className="h-1" />
          )}
          </>
  </motion.div>
)}
{feedSource === "youtube" && (
  <motion.div
    key="youtube"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="absolute inset-0"
  >
    <YouTubeShortsFeed
      isPremium={isPremium}
      navRef={shortsNavRef}
      onSwitchToOrbit={() => setFeedSource("orbit")}
    />
  </motion.div>
)}
</AnimatePresence>
      </div>

      {/* MODALS */}
      <EditPostModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, postId: "", content: "" })}
        postId={editModal.postId}
        currentContent={editModal.content}
        onPostUpdated={handlePostUpdated}
      />

      <LikeUserModal
        isOpen={likeModal.isOpen}
        onClose={closeLikeModal}
        postId={likeModal.postId}
        likeCount={likeModal.likeCount}
      />

      <CommentsModal
        isOpen={commentsModal.isOpen}
        onClose={closeCommentsModal}
        postId={commentsModal.postId}
        postUserId={commentsModal.postUserId}
        comments={commentsModal.comments}
        onCommentAdded={(newComment) =>
          handleCommentAdded(commentsModal.postId, newComment)
        }
        onCommentDeleted={(commentId) =>
          handleCommentDeleted(commentsModal.postId, commentId)
        }
      />

      <SharePostModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, post: null })}
        post={shareModal.post}
      />

      <ReportModal
        isOpen={reportModal.isOpen}
        onClose={() =>
          setReportModal({ isOpen: false, post: null, contentType: "post" })
        }
        post={reportModal.post}
        contentType={reportModal.contentType}
      />
    </>
  );
}
