"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Image from "next/image";
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
} from "lucide-react";
import { useTheme } from "../theme-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
        <div className="absolute top-16 left-0 right-0 p-4">
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
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-500 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {user.image || user.avatar ? (
                      <Image
                        src={user.image || user.avatar || ""}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="rounded-full w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold">
                        {user.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold">{user.name}</p>
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
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {comment.userId?.image || comment.userId?.avatar ? (
                      <Image
                        src={
                          comment.userId.image || comment.userId.avatar || ""
                        }
                        alt={comment.userId.name}
                        width={40}
                        height={40}
                        className="rounded-full w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold">
                        {comment.userId?.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {comment.userId?.name}
                          </p>
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
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {session?.user?.image || session?.user?.avatar ? (
                <Image
                  src={session.user.image || session.user.avatar || ""}
                  alt={session.user.name || ""}
                  width={40}
                  height={40}
                  className="rounded-full w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || "Y"}
                </span>
              )}
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

// --- ANIMATION VARIANTS (INSTANT SCROLL) ---
const variants: Variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? "100%" : "-100%",
    opacity: 1,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? "100%" : "-100%",
    opacity: 1,
  }),
};

// --- MAIN FEED PAGE ---
export default function FeedPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<PostType[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);
     
  // Navigation State
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 = down/next, -1 = up/prev

  // NAVBAR & OPTIONS VISIBILITY STATE
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  // Video controls
  const [isVideoPlaying, setIsVideoPlaying] = useState<Record<string, boolean>>({});
  const [isVideoMuted, setIsVideoMuted] = useState<Record<string, boolean>>({});
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);

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

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null); // REF FOR CAROUSEL
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const scrollingRef = useRef(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  /* ============================
       🔐 REDIRECT (SIDE EFFECT)
  ============================ */
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

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

        const postsWithComments = await Promise.all(
          data.map(async (post: PostType) => {
            try {
              const commentsRes = await fetch(
                `/api/posts/${post._id}/comments`
              );
              if (commentsRes.ok) {
                const comments = await commentsRes.json();
                return { ...post, comments: comments || [] };
              }
              return { ...post, comments: [] };
            } catch (error) {
              console.error(
                `Error fetching comments for post ${post._id}:`,
                error
              );
              return { ...post, comments: [] };
            }
          })
        );

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
      const nextIndex = currentPostIndex + navDirection;

      if (nextIndex < 0 || nextIndex >= posts.length) return;

      scrollingRef.current = true;
      setDirection(navDirection);

      setIsNavbarVisible(navDirection === -1 && nextIndex === 0);
      setShowOptions(false);

      // Handle Video Logic (Pause current)
      const currentPost = posts[currentPostIndex];
      // Pause ALL videos in the current post (carousel support)
      if (currentPost && currentPost.images) {
         currentPost.images.forEach((_, idx) => {
             const key = `${currentPost._id}-${idx}`;
             const video = videoRefs.current[key];
             if (video) {
                 video.pause();
                 setIsVideoPlaying(prev => ({ ...prev, [key]: false }));
             }
         });
      }

      setCurrentPostIndex(nextIndex);
      setCarouselIndex(0); // Reset carousel index when changing posts
      
      // Reset scroll position of carousel when changing posts
      if (carouselContainerRef.current) {
          carouselContainerRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      }

      setTimeout(() => {
        scrollingRef.current = false;
      }, 200); 
    },
    [currentPostIndex, posts]
  );

  /* ============================
       HANDLE WHEEL SCROLL
  ============================ */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      if (scrollingRef.current || posts.length === 0) return;

      const delta = e.deltaY;
        
      if (Math.abs(delta) < 20) return;

      const currentTime = Date.now();
      if (currentTime - lastScrollY.current < 50) return; 

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
       HANDLE MEDIA CLICK
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

      // Single/Double Click Logic
      // If clicks are very close together (<300ms), treat as double click
      if (timeDiff < 300 && timeDiff > 0) {
        handleDoubleTap(postId);
        lastTapRef.current = 0; // Reset to prevent triple-click triggering another double
      } else {
        // Otherwise treat as single tap (play/pause)
        // Note: For perfect double-tap isolation on click, we usually need a small delay,
        // but for immediate play/pause feedback, firing single tap immediately is preferred UX.
        // If the user intends double tap, the second click will catch the condition above.
        handleSingleTap(postId, isVideo, index);
        lastTapRef.current = currentTime;
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
       SHARE POST FUNCTION
  ============================ */
  const handleShare = async (postId: string) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post!',
          text: 'Look at this amazing content!',
          url: shareUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
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
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    const index = Math.round(scrollLeft / width);
    if (index !== carouselIndex) {
        setCarouselIndex(index);
    }
  }

  if (loadingPosts && initialLoad) {
    return <FeedSkeleton />;
  }

  if (status === "loading") {
    return <FeedSkeleton />;
  }

  const currentPost = posts[currentPostIndex];
  const mediaCount = currentPost?.images?.length || 0;
  const isTextOnly = mediaCount === 0;
  const isCarousel = mediaCount > 1;

  // Check if current media is video
  const currentMediaIsVideo = currentPost?.images 
    ? isVideo(currentPost.images[carouselIndex])
    : false;

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

      <div
        ref={feedContainerRef}
        className={`fixed inset-0 w-screen h-[100dvh] overflow-hidden touch-none overscroll-none ${
          isDark ? "dark bg-black" : "bg-black"
        }`}
      >
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
                y: { type: "tween", ease: "easeOut", duration: 0.3 }, 
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 flex flex-col"
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
                      {window.innerWidth >= 768 && (
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
                      className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-500 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity pointer-events-auto shadow-md"
                    >
                      {currentPost.userId?.image ||
                      currentPost.userId?.avatar ? (
                        <Image
                          src={
                            currentPost.userId.image ||
                            currentPost.userId.avatar ||
                            ""
                          }
                          alt={currentPost.userId.name}
                          width={40}
                          height={40}
                          className="rounded-full w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-base">
                          {currentPost.userId?.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-sm drop-shadow-md">
                            {currentPost.userId?.name}
                          </h3>
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

                <button className="flex flex-col items-center gap-1 pointer-events-auto transition-transform active:scale-90">
                  <Bookmark size={24} className="text-white drop-shadow-md" />
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
                                alert("Report feature coming soon");
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
    </>
  );
}