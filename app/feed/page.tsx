"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, MessageCircle, Sparkles, Trash2, X, User, Send, Loader2 } from "lucide-react";
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

  useEffect(() => {
    if (isOpen && postId) {
      fetchLikeUsers();
    } else {
      // Reset when modal closes
      setUsers([]);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
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
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <User size={16} className="text-gray-400" />
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
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

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
        
        // Clear textarea height
        if (commentInputRef.current) {
          commentInputRef.current.style.height = "auto";
        }

        // Scroll to bottom of comments
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
    // Auto-expand textarea
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
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
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

        {/* Comments List */}
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                  </div>
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

        {/* Comment Input */}
        <div className="p-4 border-t dark:border-gray-700">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
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
            </div>
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
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  /* ============================
     🔐 REDIRECT (SIDE EFFECT)
  ============================ */
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

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
      
      // If no data returned, set hasMore to false
      if (data.length === 0) {
        setHasMore(false);
        return;
      }

      // Fetch comments for each post
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

      // For initial load (page 1), shuffle the posts
      if (isInitialLoad) {
        const shuffledPosts = shuffleArray(postsWithComments);
        setPosts(shuffledPosts);
        setInitialLoad(false);
      } else {
        // For subsequent loads, append to existing posts
        setPosts(prev => {
          // Filter out duplicates
          const newPosts = postsWithComments.filter(
            newPost => !prev.some(existingPost => existingPost._id === newPost._id)
          );
          return [...prev, ...newPosts];
        });
      }

      // If we got less than 10 posts, there are no more to load
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
    if (!hasMore || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, false);
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, page, fetchPosts]);

  /* ============================
     HANDLE NEW POST CREATION
  ============================ */
  const handlePostCreated = (newPost: PostType) => {
    // Add new post at the top of the feed
    setPosts(prev => {
      // Check if post already exists (to avoid duplicates)
      if (prev.some(post => post._id === newPost._id)) {
        return prev;
      }
      return [newPost, ...prev];
    });
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

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, likes: updatedLikes } : p
      )
    );

    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    } catch (error) {
      // Revert on error
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
      // Fetch fresh comments when opening modal
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
    // Update the post with new comment
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      )
    );

    // Update comments in modal if open
    if (commentsModal.isOpen && commentsModal.postId === postId) {
      setCommentsModal((prev) => ({
        ...prev,
        comments: [...prev.comments, newComment]
      }));
    }
  };

  const handleCommentDeleted = (postId: string, commentId: string) => {
    // Remove comment from post
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, comments: post.comments.filter(c => c._id !== commentId) }
          : post
      )
    );

    // Update comments in modal if open
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
     RENDER GUARD (SAFE)
  ============================ */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  /* ============================
     RENDER
  ============================ */
  return (
    <>
      <div className={`${isDark ? "dark bg-black" : "bg-gray-50"} min-h-screen`}>
        {/* HEADER */}
        <div className="py-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800 bg-white/10 dark:bg-gray-800/40 backdrop-blur-sm mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                IMAGINATION FEED
              </span>
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Share Your Imagination
            </h1>
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-24">
          <CreatePost onPostCreated={handlePostCreated} />

          <div className="space-y-6 mt-6">
            {posts.map((post) => {
              const isLiked = session?.user?.id
                ? post.likes.includes(session.user.id)
                : false;

              return (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow"
                >
                  {/* USER HEADER */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                      {post.userId?.image || post.userId?.avatar ? (
                        <Image
                          src={post.userId.image || post.userId.avatar || ''}
                          alt={post.userId.name}
                          width={48}
                          height={48}
                          className="rounded-full w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {post.userId?.name?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{post.userId?.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {post.userId?._id === session?.user?.id && (
                          <button
                            onClick={() => deletePost(post._id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete post"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* POST CONTENT */}
                  {post.content && (
                    <p className="mb-4 text-gray-800 dark:text-gray-200 leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {/* MEDIA */}
                  {post.images?.map((url: string, i: number) =>
                    url.endsWith(".mp4") || url.endsWith(".webm") ? (
                      <video
                        key={i}
                        src={url}
                        controls
                        className="rounded-xl mb-4 w-full max-h-[500px] object-cover"
                      />
                    ) : (
                      <Image
                        key={i}
                        src={url}
                        alt="media"
                        width={700}
                        height={400}
                        className="rounded-xl mb-4 w-full max-h-[500px] object-cover"
                      />
                    )
                  )}

                  {/* INTERACTION STATS */}
                  <div className="flex items-center justify-between border-y dark:border-gray-800 py-3 my-4">
                    <button
                      onClick={() => openLikeModal(post._id, post.likes.length)}
                      className={`text-sm ${post.likes.length > 0 ? "text-purple-600 dark:text-purple-400 font-medium hover:underline" : "text-gray-500"}`}
                    >
                      {post.likes.length} {post.likes.length === 1 ? "like" : "likes"}
                    </button>
                    <button
                      onClick={() => openCommentsModal(post._id, post.userId?._id, post.comments || [])}
                      className={`text-sm ${(post.comments?.length || 0) > 0 ? "text-blue-600 dark:text-blue-400 font-medium hover:underline" : "text-gray-500"}`}
                    >
                      {post.comments?.length || 0} {post.comments?.length === 1 ? "comment" : "comments"}
                    </button>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 pt-3">
                    {/* LIKE BUTTON */}
                    <button
                      onClick={() => toggleLike(post._id)}
                      className="flex items-center gap-2 group flex-1 justify-center py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="relative">
                        <Heart
                          size={22}
                          className={`transition-all duration-300 ${isLiked
                              ? "fill-red-500 text-red-500 scale-110"
                              : "text-gray-500 group-hover:text-red-400"
                            }`}
                        />
                      </div>
                      <span className={`font-medium ${isLiked ? "text-red-500" : "text-gray-600 dark:text-gray-400"}`}>
                        {isLiked ? "Liked" : "Like"}
                      </span>
                    </button>

                    {/* COMMENT BUTTON */}
                    <button
                      onClick={() => openCommentsModal(post._id, post.userId?._id, post.comments || [])}
                      className="flex items-center gap-2 group flex-1 justify-center py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <MessageCircle
                        size={22}
                        className="text-gray-500 group-hover:text-blue-400 transition-colors"
                      />
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Comment
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* Loading Initial Posts */}
            {loadingPosts && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-500">Loading posts...</p>
              </div>
            )}

            {/* Loading More Posts */}
            {/* {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-500">Loading more posts...</span>
              </div>
            )} */}

            {/* No Posts Message */}
            {!loadingPosts && posts.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300 mb-2">No posts yet</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Be the first to share your imagination!
                </p>
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            {hasMore && !loadingMore && (
              <div ref={loadMoreRef} className="h-10" />
            )}

            {/* End of Feed Message */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    You've reached the end of the feed
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
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