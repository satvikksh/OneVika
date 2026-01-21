"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, Mail, Calendar, MapPin, Phone, 
  MessageCircle, Globe, Instagram, Twitter, 
  Linkedin, Video, User, Shield, GlobeIcon,
  Users, UserPlus, UserCheck, UserMinus, ChevronRight
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useSession } from 'next-auth/react';

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
  lastSeen?: string;
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
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { onlineUsers } = useSocket();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const userId = params.userId as string;

  const isUserOnline = onlineUsers.includes(userId);
  const isCurrentUser = session?.user?.id === userId;

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/user/${userId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user profile');
        }
        
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!session || !user) return;
    
    try {
      setFollowLoading(true);
      
      const response = await fetch(`/api/user/${userId}/follow`, {
        method: user.isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }
      
      const data = await response.json();
      
      // Update local state
      setUser(prev => prev ? {
        ...prev,
        isFollowing: data.isFollowing,
        followersCount: data.followersCount
      } : null);
      
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendMessage = () => {
    router.push(`/chat?userId=${userId}`);
  };

  const handleStartCall = () => {
    console.log('Starting call with:', user?.name);
  };

  const handleStartVideoCall = () => {
    console.log('Starting video call with:', user?.name);
  };

  const handleViewFollowers = () => {
    router.push(`/profile/${userId}/followers`);
  };

  const handleViewFollowing = () => {
    router.push(`/profile/${userId}/following`);
  };

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
            {error || 'User not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The user profile you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push('/chat')}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
            >
              Go to Chats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

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
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back</span>
            </button>
            
            {isCurrentUser && (
              <button
                onClick={() => router.push('/settings/profile')}
                className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Profile Card */}
          <div className="lg:w-1/3">
            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-6">
                  <div className="w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 ring-4 ring-white dark:ring-gray-900 shadow-xl">
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
                  <div className={`absolute bottom-4 right-4 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 ${
                    isUserOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>

                {/* User Info */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                  {user.name}
                </h1>
                
                <div className="flex items-center gap-2 mb-6">
                  <div className={`w-2 h-2 rounded-full ${isUserOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {isUserOnline ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
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
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {user.followersCount || 0}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      Followers
                    </span>
                  </button>
                  
                  <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                  
                  <button
                    onClick={handleViewFollowing}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {user.followingCount || 0}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      Following
                    </span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full">
                  {!isCurrentUser && (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`w-full py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 active:scale-[0.98] ${
                          user.isFollowing
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                        }`}
                      >
                        {followLoading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : user.isFollowing ? (
                          <>
                            <UserCheck size={18} />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus size={18} />
                            Follow
                          </>
                        )}
                      </button>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleSendMessage}
                          className="py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={18} />
                          Message
                        </button>
                        <button
                          onClick={handleStartVideoCall}
                          className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <Video size={18} />
                          Video
                        </button>
                      </div>
                    </>
                  )}
                  
                  {isCurrentUser && (
                    <button
                      onClick={() => router.push('/settings/profile')}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <User size={18} />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Follow Lists */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 mb-6">
              <button
                onClick={handleViewFollowers}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Followers</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.followersCount || 0} people
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
              
              <button
                onClick={handleViewFollowing}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group mt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <UserCheck size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Following</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.followingCount || 0} people
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                {user.email && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                      <Mail size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white break-all">{user.email}</p>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <Phone size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-gray-900 dark:text-white">{user.phone}</p>
                    </div>
                  </div>
                )}

                {user.location && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                      <MapPin size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-gray-900 dark:text-white">{user.location}</p>
                    </div>
                  </div>
                )}

                {user.joinedDate && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                      <Calendar size={18} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                      <p className="text-gray-900 dark:text-white">{formatDate(user.joinedDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:w-2/3">
            {/* Bio Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About</h2>
              {user.bio ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {user.bio}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {isCurrentUser 
                    ? "You haven't added a bio yet. Add one to tell others about yourself!"
                    : "This user hasn't added a bio yet."
                  }
                </p>
              )}
            </div>

            {/* Social Links */}
            {user.social && Object.values(user.social).some(val => val) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Social Links</h2>
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
                    <Globe size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-medium"
                    >
                      {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Additional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Account Status</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                
                {user.lastSeen && !isUserOnline && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Calendar size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last Seen</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatDate(user.lastSeen)}
                      </p>
                    </div>
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