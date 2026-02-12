"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Users, UserPlus, UserCheck, UserMinus } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Following {
  id: string;
  name: string;
  avatar?: string;
  isFollowing: boolean;
}

export default function FollowingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const userId = params.userId as string;
  const isCurrentUser = session?.user?.id === userId;

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/user/profile/${userId}/following`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch following');
        }
        
        const data = await response.json();
        setFollowing(data.following);
      } catch (err) {
        console.error('Error fetching following:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchFollowing();
    }
  }, [userId]);

  const handleFollowToggle = async (followingId: string, currentStatus: boolean) => {
    if (!session) return;
    
    try {
      setFollowLoading(followingId);
      
      const response = await fetch(`/api/user/profile/${followingId}/follow`, {
        method: currentStatus ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }
      
      const data = await response.json();
      
      // Update local state
      setFollowing(prev => prev.map(user => 
        user.id === followingId 
          ? { ...user, isFollowing: data.isFollowing }
          : user
      ));
      
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status');
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUnfollow = async (followingId: string) => {
    if (!isCurrentUser) return;
    
    try {
      setFollowLoading(followingId);
      
      const response = await fetch(`/api/user/profile/${followingId}/follow`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to unfollow');
      }
      
      // Remove from list if it's the current user's following list
      if (isCurrentUser) {
        setFollowing(prev => prev.filter(user => user.id !== followingId));
      } else {
        const data = await response.json();
        setFollowing(prev => prev.map(user => 
          user.id === followingId 
            ? { ...user, isFollowing: data.isFollowing }
            : user
        ));
      }
      
    } catch (err) {
      console.error('Error unfollowing:', err);
      alert('Failed to unfollow user');
    } finally {
      setFollowLoading(null);
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-8"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <UserCheck size={24} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Following
              </h1>
            </div>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
              <UserCheck className="w-10 h-10 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {error}
            </h2>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium mt-4"
            >
              Go Back
            </button>
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/30 dark:to-gray-700/30 flex items-center justify-center">
              <UserCheck className="w-10 h-10 text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Not following anyone
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isCurrentUser 
                ? "Find friends to follow and connect with!"
                : "This user is not following anyone yet."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((user) => (
              <div
                key={user.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 flex items-center justify-between hover:shadow-xl transition-shadow"
              >
                <div 
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => handleViewProfile(user.id)}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-500 ring-2 ring-white dark:ring-gray-900">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.name}
                    </h3>
                  </div>
                </div>
                
                {session?.user?.id !== user.id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowToggle(user.id, user.isFollowing);
                    }}
                    disabled={followLoading === user.id}
                    className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-2 ${
                      user.isFollowing
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        : 'bg-gradient-to-r from-blue-600 to-blue-600 text-white hover:from-blue-700 hover:to-blue-700'
                    }`}
                  >
                    {followLoading === user.id ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : user.isFollowing ? (
                      <>
                        <UserCheck size={16} />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Follow
                      </>
                    )}
                  </button>
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    You
                  </div>
                )}
                
                {isCurrentUser && session?.user?.id !== user.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfollow(user.id);
                    }}
                    disabled={followLoading === user.id}
                    className="ml-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-xl transition-colors font-medium flex items-center gap-2"
                  >
                    {followLoading === user.id ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <UserMinus size={16} />
                        Unfollow
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}