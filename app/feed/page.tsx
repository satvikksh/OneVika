"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Heart, MessageCircle, Sparkles, Trash2, X, User, Send, Loader2, MoreVertical, Bookmark, Share2, ChevronLeft, ChevronRight, Home, Volume2, VolumeX, Play, Pause } from "lucide-react";
import CreatePost from "./CreatePost";
import { useTheme } from "../theme-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

function LikeUserModal({ isOpen, onClose, postId, likeCount }: LikeUserModalProps) {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
              <p className="ml-3 text-gray-500">Loading users...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchLikeUsers}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No likes yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to like this post!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <button
                    onClick={() => handleUserAvatarClick(user._id)}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {user.image || user.avatar ? (
                      <Image
                        src={user.image || user.avatar || ''}
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

function CommentsModal({ 
  isOpen, 
  onClose, 
  postId, 
  postUserId,
  comments, 
  onCommentAdded, 
  onCommentDeleted 
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
            commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
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
      const response = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <p className="text-gray-500 dark:text-gray-400">No comments yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <button
                    onClick={() => handleUserAvatarClick(comment.userId?._id)}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {comment.userId?.image || comment.userId?.avatar ? (
                      <Image
                        src={comment.userId.image || comment.userId.avatar || ''}
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
                          <p className="font-semibold text-sm">{comment.userId?.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                      <p className="text-gray-700 dark:text-gray-300 break-words">{comment.content}</p>
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
              onClick={() => session?.user?.id && handleUserAvatarClick(session.user.id)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {session?.user?.image || session?.user?.avatar ? (
                <Image
                  src={session.user.image || session.user.avatar || ''}
                  alt={session.user.name || ''}
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
                  className="w-full p-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[60px] max-h-[120px]"
                  rows={1}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [showHeader, setShowHeader] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Video controls
  const [isVideoPlaying, setIsVideoPlaying] = useState<Record<string, boolean>>({});
  const [isVideoMuted, setIsVideoMuted] = useState<Record<string, boolean>>({});
  const [doubleTapLike, setDoubleTapLike] = useState<string | null>(null);
  
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
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const scrollingRef = useRef(false);

  /* ============================
      🔐 REDIRECT (SIDE EFFECT)
  ============================ */
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  /* ============================
      CHECK IF MEDIA IS VIDEO (FIXED)
  ============================ */
  const isVideo = (url: string | undefined | null): boolean => {
    if (!url) return false;
    return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
  };

  /* ============================
      SHUFFLE ARRAY FUNCTION
  ============================ */
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  /* ============================
      FETCH POSTS WITH PAGINATION
  ============================ */
  const fetchPosts = useCallback(async (pageNum: number, isInitialLoad = false) => {
    if (!session?.user?.id || (loadingPosts && isInitialLoad) || (loadingMore && !isInitialLoad)) return;

    if (isInitialLoad) {
      setLoadingPosts(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`/api/posts?page=${pageNum}&limit=10`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      
      const data = await response.json();
      
      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      const postsWithComments = await Promise.all(
        data.map(async (post: PostType) => {
          try {
            const commentsRes = await fetch(`/api/posts/${post._id}/comments`);
            if (commentsRes.ok) {
              const comments = await commentsRes.json();
              return { ...post, comments: comments || [] };
            }
            return { ...post, comments: [] };
          } catch (error) {
            console.error(`Error fetching comments for post ${post._id}:`, error);
            return { ...post, comments: [] };
          }
        })
      );

      if (isInitialLoad) {
        const shuffledPosts = shuffleArray(postsWithComments);
        setPosts(shuffledPosts);
        setInitialLoad(false);
        
        // Initialize video states for all posts
        const playingStates: Record<string, boolean> = {};
        const muteStates: Record<string, boolean> = {};
        shuffledPosts.forEach(post => {
          playingStates[post._id] = true;
          muteStates[post._id] = true;
        });
        setIsVideoPlaying(playingStates);
        setIsVideoMuted(muteStates);
      } else {
        setPosts(prev => {
          const newPosts = postsWithComments.filter(
            newPost => !prev.some(existingPost => existingPost._id === newPost._id)
          );
          
          // Initialize video states for new posts
          const newPlayingStates: Record<string, boolean> = {};
          const newMuteStates: Record<string, boolean> = {};
          newPosts.forEach(post => {
            newPlayingStates[post._id] = true;
            newMuteStates[post._id] = true;
          });
          
          setIsVideoPlaying(prevStates => ({ ...prevStates, ...newPlayingStates }));
          setIsVideoMuted(prevStates => ({ ...prevStates, ...newMuteStates }));
          
          return [...prev, ...newPosts];
        });
      }

      if (data.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setHasMore(false);
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
    }
  }, [session?.user?.id, loadingPosts, loadingMore]);

  /* ============================
      INITIAL LOAD
  ============================ */
  useEffect(() => {
    if (status === "authenticated" && initialLoad) {
      fetchPosts(1, true);
    }
  }, [status, initialLoad, fetchPosts]);

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
          fetchPosts(nextPage, false);
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
      HANDLE WHEEL SCROLL
  ============================ */
  const handleWheel = useCallback((e: WheelEvent) => {
    if (scrollingRef.current || posts.length === 0) return;

    const delta = e.deltaY;
    const currentTime = Date.now();

    // Prevent rapid scrolling
    if (currentTime - lastScrollY.current < 500) return;
    
    if (delta > 50 && currentPostIndex < posts.length - 1) {
      // Scroll down to next post
      scrollingRef.current = true;
      
      // Pause current video
      const currentPost = posts[currentPostIndex];
      // FIX: safe access to images
      if (currentPost && isVideo(currentPost.images?.[0])) {
        const video = videoRefs.current[currentPost._id];
        if (video) {
          video.pause();
        }
      }
      
      setCurrentPostIndex(prev => prev + 1);
      lastScrollY.current = currentTime;
      
      // Hide header after scrolling
      setShowHeader(false);
      
      setTimeout(() => {
        scrollingRef.current = false;
      }, 300);
    } else if (delta < -50 && currentPostIndex > 0) {
      // Scroll up to previous post
      scrollingRef.current = true;
      
      // Pause current video
      const currentPost = posts[currentPostIndex];
      // FIX: safe access to images
      if (currentPost && isVideo(currentPost.images?.[0])) {
        const video = videoRefs.current[currentPost._id];
        if (video) {
          video.pause();
        }
      }
      
      setCurrentPostIndex(prev => prev - 1);
      lastScrollY.current = currentTime;
      
      setTimeout(() => {
        scrollingRef.current = false;
      }, 300);
    }
  }, [currentPostIndex, posts.length]);

  /* ============================
      HANDLE TOUCH SCROLL (Mobile)
  ============================ */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touchY = e.touches[0].clientY;
    lastScrollY.current = touchY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (scrollingRef.current || posts.length === 0) return;

    const touchY = e.changedTouches[0].clientY;
    const diff = lastScrollY.current - touchY;
    const currentTime = Date.now();

    // Prevent rapid scrolling
    if (currentTime - lastScrollY.current < 500) return;
    
    if (diff > 100 && currentPostIndex < posts.length - 1) {
      // Swipe down - next post
      scrollingRef.current = true;
      
      // Pause current video
      const currentPost = posts[currentPostIndex];
      // FIX: safe access to images
      if (currentPost && isVideo(currentPost.images?.[0])) {
        const video = videoRefs.current[currentPost._id];
        if (video) {
          video.pause();
        }
      }
      
      setCurrentPostIndex(prev => prev + 1);
      lastScrollY.current = currentTime;
      
      // Hide header after scrolling
      setShowHeader(false);
      
      setTimeout(() => {
        scrollingRef.current = false;
      }, 300);
    } else if (diff < -100 && currentPostIndex > 0) {
      // Swipe up - previous post
      scrollingRef.current = true;
      
      // Pause current video
      const currentPost = posts[currentPostIndex];
      // FIX: safe access to images
      if (currentPost && isVideo(currentPost.images?.[0])) {
        const video = videoRefs.current[currentPost._id];
        if (video) {
          video.pause();
        }
      }
      
      setCurrentPostIndex(prev => prev - 1);
      lastScrollY.current = currentTime;
      
      setTimeout(() => {
        scrollingRef.current = false;
      }, 300);
    }
  }, [currentPostIndex, posts.length]);

  /* ============================
      ADD EVENT LISTENERS
  ============================ */
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchEnd]);

  /* ============================
      HANDLE SINGLE TAP (Play/Pause)
  ============================ */
  const handleSingleTap = (postId: string, isVideo: boolean) => {
    if (!isVideo) return;
    
    const video = videoRefs.current[postId];
    if (video) {
      if (video.paused) {
        video.play();
        setIsVideoPlaying(prev => ({ ...prev, [postId]: true }));
      } else {
        video.pause();
        setIsVideoPlaying(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  /* ============================
      HANDLE DOUBLE TAP (Like)
  ============================ */
  const handleDoubleTap = (postId: string) => {
    toggleLike(postId);
    setDoubleTapLike(postId);
    setTimeout(() => setDoubleTapLike(null), 1000);
  };

  /* ============================
      HANDLE MEDIA TAP
  ============================ */
  const handleMediaTap = (e: React.MouseEvent | React.TouchEvent, postId: string, isVideo: boolean) => {
    e.stopPropagation();
    
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastTapRef.current;
    
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap
      handleDoubleTap(postId);
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        handleSingleTap(postId, isVideo);
      }, 300);
    }
    
    lastTapRef.current = currentTime;
  };

  /* ============================
      TOGGLE VIDEO MUTE
  ============================ */
  const toggleMute = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) {
      video.muted = !video.muted;
      setIsVideoMuted(prev => ({ ...prev, [postId]: !prev[postId] }));
    }
  };

  /* ============================
      HANDLE NEW POST CREATION
  ============================ */
  const handlePostCreated = (newPost: PostType) => {
    setPosts(prev => {
      if (prev.some(post => post._id === newPost._id)) {
        return prev;
      }
      // Initialize video states for new post
      setIsVideoPlaying(prevStates => ({ ...prevStates, [newPost._id]: true }));
      setIsVideoMuted(prevStates => ({ ...prevStates, [newPost._id]: true }));
      
      return [newPost, ...prev];
    });
    setShowCreatePost(false);
    setCurrentPostIndex(0);
  };

  /* ============================
      LIKE FUNCTIONALITY
  ============================ */
  const toggleLike = async (postId: string) => {
    if (!session?.user?.id) return;

    const post = posts.find((p) => p._id === postId);
    if (!post) return;

    const wasLiked = post.likes.includes(session.user.id);
    const updatedLikes = wasLiked
      ? post.likes.filter((uid: string) => uid !== session.user.id)
      : [...post.likes, session.user.id];

    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, likes: updatedLikes } : p
      )
    );

    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    } catch (error) {
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, likes: post.likes } : p
        )
      );
    }
  };

  const openLikeModal = (postId: string, likeCount: number) => {
    setLikeModal({
      isOpen: true,
      postId,
      likeCount,
    });
  };

  const closeLikeModal = () => {
    setLikeModal({
      isOpen: false,
      postId: "",
      likeCount: 0,
    });
  };

  const openCommentsModal = async (postId: string, postUserId: string, currentComments: CommentType[] = []) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      let comments = currentComments;
      
      if (response.ok) {
        comments = await response.json();
      } else {
        console.error("Failed to fetch comments, using cached comments");
      }

      setCommentsModal({
        isOpen: true,
        postId,
        postUserId,
        comments: comments || [],
      });
    } catch (error) {
      console.error("Error fetching comments for modal:", error);
      setCommentsModal({
        isOpen: true,
        postId,
        postUserId,
        comments: currentComments || [],
      });
    }
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
        comments: [...prev.comments, newComment]
      }));
    }
  };

  const handleCommentDeleted = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, comments: post.comments.filter(c => c._id !== commentId) }
          : post
      )
    );

    if (commentsModal.isOpen && commentsModal.postId === postId) {
      setCommentsModal((prev) => ({
        ...prev,
        comments: prev.comments.filter(c => c._id !== commentId)
      }));
    }
  };

  /* ============================
      DELETE POST
  ============================ */
  const deletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Failed to delete post");

    setPosts((prev) => prev.filter((p) => p._id !== id));
  };

  /* ============================
      HANDLE USER AVATAR CLICK
  ============================ */
  const handleUserAvatarClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  /* ============================
      RENDER GUARD (SAFE)
  ============================ */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const currentPost = posts[currentPostIndex];
  const currentImage = currentPost?.images?.[0];
  const isCurrentVideo = currentImage ? isVideo(currentImage) : false;

  return (
    <>
      <div 
        ref={feedContainerRef}
        className={`relative h-screen w-screen overflow-hidden ${isDark ? "dark bg-black" : "bg-black"}`}
      >
        {/* FLOATING HEADER */}
        <AnimatePresence>
          {showHeader && (
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/50 to-transparent"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowHeader(false)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                    Imagination Feed
                  </h1>
                  <p className="text-xs text-gray-300">
                    {currentPostIndex + 1} of {posts.length}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Sparkles size={24} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SHOW HEADER BUTTON */}
        {!showHeader && (
          <button
            onClick={() => setShowHeader(true)}
            className="absolute top-4 left-4 z-30 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <Home size={20} />
          </button>
        )}

        {/* NOTE: REMOVED LEFT AND RIGHT CHEVRON BUTTONS HERE */}

        {/* CREATE POST MODAL */}
        <AnimatePresence>
          {showCreatePost && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Create Post</h2>
                  <button
                    onClick={() => setShowCreatePost(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4">
                  <CreatePost onPostCreated={handlePostCreated} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* CURRENT POST */}
        <AnimatePresence mode="wait">
          {currentPost ? (
            <motion.div
              key={currentPost._id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* POST MEDIA */}
              {currentImage && (
                <div 
                  className="flex-1 relative"
                  onClick={(e) => handleMediaTap(e, currentPost._id, isCurrentVideo)}
                  onTouchEnd={(e) => handleMediaTap(e, currentPost._id, isCurrentVideo)}
                >
                  {isCurrentVideo ? (
                    <>
                      <video
                        ref={(el) => { videoRefs.current[currentPost._id] = el; }}
                        src={currentImage}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                        autoPlay
                        loop
                        // muted={isVideoMuted[currentPost._id]}
                        playsInline
                        onClick={(e) => e.stopPropagation()}
                      />
                      {/* Play/Pause Overlay */}
                      {!isVideoPlaying[currentPost._id] && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                            <Play size={40} className="text-white" />
                          </div>
                        </div>
                      )}
                      {/* Mute/Unmute Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute(currentPost._id);
                        }}
                        className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full z-10 hover:bg-black/70 transition-colors"
                      >
                        {isVideoMuted[currentPost._id] ? (
                          <Volume2 size={24} />
                        ) : (
                          <VolumeX size={24} />
                        )}
                      </button>
                    </>
                  ) : (
                    <Image
                      src={currentImage}
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
                        <Heart size={100} className="text-white fill-red-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* POST OVERLAY */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* POST CONTENT OVERLAY */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                <div className="pointer-events-auto">
                  {/* USER INFO */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => handleUserAvatarClick(currentPost.userId?._id)}
                      className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity pointer-events-auto"
                    >
                      {currentPost.userId?.image || currentPost.userId?.avatar ? (
                        <Image
                          src={currentPost.userId.image || currentPost.userId.avatar || ''}
                          alt={currentPost.userId.name}
                          width={48}
                          height={48}
                          className="rounded-full w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {currentPost.userId?.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-lg">{currentPost.userId?.name}</h3>
                          <p className="text-sm text-gray-300">
                            {new Date(currentPost.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {currentPost.userId?._id === session?.user?.id && (
                          <button
                            onClick={() => deletePost(currentPost._id)}
                            className="p-2 text-gray-300 hover:text-red-400 transition-colors pointer-events-auto"
                            title="Delete post"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* POST TEXT */}
                  {currentPost.content && (
                    <div className="mb-4">
                      <p className="text-white text-lg leading-relaxed">
                        {currentPost.content}
                      </p>
                    </div>
                  )}

                  {/* ACTION BUTTONS WITH COUNTS */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleLike(currentPost._id)}
                          className="flex items-center gap-2 group pointer-events-auto"
                        >
                          <Heart
                            size={28}
                            className={`transition-all duration-300 ${currentPost.likes.includes(session?.user?.id || "")
                                ? "fill-red-500 text-red-500"
                                : "text-white"
                              }`}
                          />
                        </button>
                        <button
                          onClick={() => openLikeModal(currentPost._id, currentPost.likes.length)}
                          className="text-white font-medium hover:underline pointer-events-auto"
                        >
                          {currentPost.likes.length} likes
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCommentsModal(currentPost._id, currentPost.userId?._id, currentPost.comments || [])}
                          className="flex items-center gap-2 group pointer-events-auto"
                        >
                          <MessageCircle
                            size={28}
                            className="text-white"
                          />
                        </button>
                        <button
                          onClick={() => openCommentsModal(currentPost._id, currentPost.userId?._id, currentPost.comments || [])}
                          className="text-white font-medium hover:underline pointer-events-auto"
                        >
                          {currentPost.comments?.length || 0} comments
                        </button>
                      </div>

                      <button className="p-2 text-white hover:opacity-80 transition-opacity pointer-events-auto">
                        <Share2 size={24} />
                      </button>
                    </div>

                    <button className="p-2 text-white hover:opacity-80 transition-opacity pointer-events-auto">
                      <Bookmark size={24} />
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE ACTION BAR (Instagram Style) */}
              <div className="absolute right-4 bottom-1/3 flex flex-col gap-6">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggleLike(currentPost._id)}
                    className="flex flex-col items-center gap-1 pointer-events-auto"
                  >
                    <Heart
                      size={32}
                      className={`transition-all duration-300 ${currentPost.likes.includes(session?.user?.id || "")
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                        }`}
                    />
                  </button>
                  <button
                    onClick={() => openLikeModal(currentPost._id, currentPost.likes.length)}
                    className="text-white text-xs font-medium hover:underline pointer-events-auto"
                  >
                    {currentPost.likes.length}
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => openCommentsModal(currentPost._id, currentPost.userId?._id, currentPost.comments || [])}
                    className="flex flex-col items-center gap-1 pointer-events-auto"
                  >
                    <MessageCircle size={32} className="text-white" />
                  </button>
                  <button
                    onClick={() => openCommentsModal(currentPost._id, currentPost.userId?._id, currentPost.comments || [])}
                    className="text-white text-xs font-medium hover:underline pointer-events-auto"
                  >
                    {currentPost.comments?.length || 0}
                  </button>
                </div>

                <button className="flex flex-col items-center gap-1 pointer-events-auto">
                  <Share2 size={32} className="text-white" />
                  <span className="text-white text-xs font-medium">Share</span>
                </button>

                <button className="flex flex-col items-center gap-1 pointer-events-auto">
                  <Bookmark size={32} className="text-white" />
                  <span className="text-white text-xs font-medium">Save</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* LOADING OR NO POSTS */
            <div className="absolute inset-0 flex items-center justify-center">
              {loadingPosts ? (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
                  <p className="mt-4 text-gray-300">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center p-8">
                  <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-300 mb-2">No posts yet</h3>
                  <p className="text-gray-400 mb-6">
                    Be the first to share your imagination!
                  </p>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    Create Post
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </AnimatePresence>

        {/* LOAD MORE TRIGGER */}
        {hasMore && !loadingMore && posts.length > 0 && currentPostIndex > posts.length - 3 && (
          <div ref={loadMoreRef} className="h-1" />
        )}

        {/* PROGRESS INDICATOR */}
        {posts.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex gap-2">
              {posts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPostIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${index === currentPostIndex
                      ? "bg-white w-6"
                      : "bg-gray-500 hover:bg-gray-300"
                    }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LIKE USERS MODAL */}
      <LikeUserModal
        isOpen={likeModal.isOpen}
        onClose={closeLikeModal}
        postId={likeModal.postId}
        likeCount={likeModal.likeCount}
      />

      {/* COMMENTS MODAL */}
      <CommentsModal
        isOpen={commentsModal.isOpen}
        onClose={closeCommentsModal}
        postId={commentsModal.postId}
        postUserId={commentsModal.postUserId}
        comments={commentsModal.comments}
        onCommentAdded={(newComment) => handleCommentAdded(commentsModal.postId, newComment)}
        onCommentDeleted={(commentId) => handleCommentDeleted(commentsModal.postId, commentId)}
      />
    </>
  );
}