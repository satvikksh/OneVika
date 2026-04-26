'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const RECENT_POST_WINDOW_DAYS = 3;
const RECENT_POST_LIMIT = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  avatar?: string;
  isPremium?: boolean;
}

interface Post {
  _id: string;
  content: string;
  contentType?: 'post';
  images: string[];
  userId: User | null;
  likes: string[];
  comments: unknown[];
  createdAt: string;
}

export default function NewPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/posts?type=post&recentDays=${RECENT_POST_WINDOW_DAYS}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        
        const data = await response.json();
        
        const cutoff = Date.now() - RECENT_POST_WINDOW_DAYS * MS_PER_DAY;

        const recentPosts = (data.posts || data).filter((post: Post) => {
          const postTime = new Date(post.createdAt).getTime();
          const isPost = !post.contentType || post.contentType === 'post';

          return isPost && Number.isFinite(postTime) && postTime >= cutoff;
        });

        setPosts(recentPosts.slice(0, RECENT_POST_LIMIT));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading posts');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
    
    // Refresh posts every 5 minutes
    const interval = setInterval(fetchRecentPosts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="w-full pb-8">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 dark:text-stone-400">
          New Posts
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400 dark:text-stone-500" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full pb-8">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 dark:text-stone-400">
          New Posts
        </h2>
        <div className="text-center py-6">
          <p className="text-xs text-stone-500 dark:text-stone-500">{error}</p>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="w-full pb-8">
        <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 dark:text-stone-400">
          New Posts
        </h2>
        <div className="text-center py-8">
          <p className="text-xs text-stone-500 dark:text-stone-500">No posts from the last few days yet. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full pb-8">
      <h2 className="text-stone-600 font-medium text-sm tracking-wide mb-4 px-1 dark:text-stone-400">
        New Posts
      </h2>
      
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {posts.map((post) => {
          const authorName = post.userId?.name || 'Unknown User';
          const authorAvatar = post.userId?.avatar || post.userId?.image;

          return (
            <article
              key={post._id}
              className="h-full overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-950"
            >
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                {authorAvatar && (
                  <Image
                    src={authorAvatar}
                    alt={authorName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {post.userId?._id ? (
                    <Link
                      href={`/profile/${post.userId._id}`}
                      className="font-semibold text-stone-900 text-sm hover:text-blue-600 truncate dark:text-stone-100 dark:hover:text-blue-300"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <p className="font-semibold text-stone-900 text-sm truncate dark:text-stone-100">
                      {authorName}
                    </p>
                  )}
                  <p className="text-xs text-stone-500 dark:text-stone-500">
                    {new Date(post.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-stone-800 text-sm mb-3 line-clamp-3 dark:text-stone-200">{post.content}</p>

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <div className="mb-3">
                  {post.images.length === 1 ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900">
                      <Image
                        src={post.images[0]}
                        alt="Post image"
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {post.images.slice(0, 4).map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="relative aspect-square w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900"
                        >
                          <Image
                            src={image}
                            alt={`Post image ${index + 1}`}
                            fill
                            sizes="(min-width: 768px) 25vw, 50vw"
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button className="flex items-center gap-1.5 text-stone-500 hover:text-red-500 transition text-xs dark:text-stone-500 dark:hover:text-red-300">
                  <Heart className="w-4 h-4" />
                  <span>{post.likes?.length || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 text-stone-500 hover:text-blue-500 transition text-xs dark:text-stone-500 dark:hover:text-blue-300">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments?.length || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 text-stone-500 hover:text-green-500 transition text-xs ml-auto dark:text-stone-500 dark:hover:text-green-300">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
