"use client";

import React, { useState, useEffect, useRef } from "react";
import { User } from "../types/socket";
import Image from "next/image";
import { 
  Search, 
  User as UserIcon, 
  Loader2, 
  ArrowLeft,
  Menu,
  Users,
  MessageSquare,
  Phone,
  Video,
  Info,
  MoreVertical
} from "lucide-react";
import { useSession } from "next-auth/react";

interface ChatSidebarProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadingUsers: boolean;
  isConnected: boolean;
  onlineUsers: string[];
  typingUsers: Set<string>;
  getUnreadCount: (userId: string) => number;
  isMobile?: boolean;
  showMobileSidebar: boolean;
  onBackToSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}

const formatTime = (ts?: string) => {
  if (!ts) return "Just now";
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return "Just now";
  }
};

export default function ChatSidebar({
  users,
  selectedUser,
  onSelectUser,
  searchQuery,
  setSearchQuery,
  loadingUsers,
  isConnected,
  typingUsers,
  getUnreadCount,
  isMobile = false,
  showMobileSidebar = true,
  onBackToSidebar,
  onToggleMobileSidebar,
}: ChatSidebarProps) {
  const { data: session } = useSession();
  const [isSearching, setIsSearching] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !showMobileSidebar || !sidebarRef.current) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onToggleMobileSidebar?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile, showMobileSidebar, onToggleMobileSidebar]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && showMobileSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobile, showMobileSidebar]);

  const filteredUsers = users.filter(
    (u) =>
      u &&
      u.id &&
      (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUserSelect = (user: User) => {
    onSelectUser(user);
    if (isMobile) {
      onToggleMobileSidebar?.();
    }
  };

  // Mobile sidebar overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
            showMobileSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onToggleMobileSidebar}
        />
        
        {/* Mobile Sidebar */}
        <aside
          ref={sidebarRef}
          className={`lg:hidden fixed inset-y-16 left-0 z-50 w-[100%] max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-transform duration-300 ease-in-out ${
            showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Sidebar Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onToggleMobileSidebar}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                  aria-label="Close sidebar"
                >
                  {/* <ArrowLeft size={20} /> */}
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Chats
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
                <button
                  onClick={() => setIsSearching(!isSearching)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                  aria-label={isSearching ? "Cancel search" : "Search"}
                >
                  <Search size={20} />
                </button>
              </div>
            </div>

            {/* Search input for mobile */}
            {isSearching && (
              <div className="relative mt-2 animate-fadeIn">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="text-lg">×</span>
                  </button>
                )}
              </div>
            )}

            {/* Static search bar when not in search mode */}
            {!isSearching && (
              <div className="relative mt-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => setIsSearching(true)}
                  readOnly={!isSearching}
                />
              </div>
            )}
          </div>

          {/* Mobile Users List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pb-14">
            {loadingUsers ? (
              <div className="text-center py-12 px-4">
                <Loader2 className="h-16 w-16 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Loading users...
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 px-4">
                <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {searchQuery ? "No users found" : "No users available"}
                </p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mt-1">
                    Try a different search term
                  </p>
                )}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const unreadCount = getUnreadCount(user.id);
                const isSelected = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`w-full flex items-center gap-3 p-4 transition-all duration-200 active:scale-98 ${
                      isSelected
                        ? "bg-purple-100 dark:bg-purple-900/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-white dark:ring-gray-900">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.name || "User"}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                        )}
                      </div>
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {user.name || "Unknown"}
                        </p>
                        {user.lastSeen && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTime(user.lastSeen)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {typingUsers.has(user.id) ? (
                          <span className="text-purple-600 dark:text-purple-400 italic">
                            typing...
                          </span>
                        ) : (
                          user.email || ""
                        )}
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <span className="px-2 py-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex-shrink-0 min-w-[24px] text-center font-bold shadow-lg">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Mobile bottom safe area */}
          <div className="h-4 safe-area-bottom" />
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="fixed top-16 ${positionClasses} hidden lg:flex w-80 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col h-full">
      {/* Desktop Sidebar Header */}
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <MessageSquare size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Messages
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {users.length}
            </span>
            <button
              onClick={() => setIsSearching(!isSearching)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Search"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 dark:text-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop Users List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loadingUsers ? (
          <div className="text-center py-12 px-4">
            <Loader2 className="h-16 w-16 text-gray-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Loading users...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {searchQuery ? "No users found" : "No users available"}
            </p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const unreadCount = getUnreadCount(user.id);
            const isSelected = selectedUser?.id === user.id;

            return (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`w-full flex items-center gap-3 p-4 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  isSelected
                    ? "bg-purple-100 dark:bg-purple-900/30 border-r-4 border-purple-500"
                    : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-white dark:ring-gray-900">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name || "User"}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                    )}
                  </div>
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {user.name || "Unknown"}
                    </p>
                    {user.lastSeen && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(user.lastSeen)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {typingUsers.has(user.id) ? (
                      <span className="text-purple-600 dark:text-purple-400 italic">
                        typing...
                      </span>
                    ) : (
                      user.email || ""
                    )}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <span className="px-2 py-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex-shrink-0 min-w-[24px] text-center font-bold shadow-lg">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

// Mobile hamburger button component for main layout
export const MobileSidebarToggle: React.FC<{
  onClick: () => void;
  selectedUser: User | null;
  onBack?: () => void;
}> = ({ onClick, selectedUser, onBack }) => {
  if (selectedUser) {
    return (
      <button
        onClick={onBack}
        className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95 flex-shrink-0"
        aria-label="Back to chats"
      >
        <ArrowLeft size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95 flex-shrink-0"
      aria-label="Open chats"
    >
      <Menu size={20} />
    </button>
  );
};

// Styles
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 2px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }
  
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}