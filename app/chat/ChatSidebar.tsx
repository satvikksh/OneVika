"use client";

import React, { useState, useEffect, useRef } from "react";
import { User } from "../types/socket";
import { 
  Search, 
  User as UserIcon, 
  Loader2, 
  ArrowLeft,
  Menu,
  MessageSquare,
  MoreVertical,
  Trash2
} from "lucide-react";
import { PremiumAvatar, PremiumName } from "../components/premium-ui";

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
  onDeleteChat: (user: User) => void;
  deletingChatUserId?: string | null;
  isMobile?: boolean;
  showMobileSidebar: boolean;
  onBackToSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}

export default function ChatSidebar({
  users,
  selectedUser,
  onSelectUser,
  searchQuery,
  setSearchQuery,
  loadingUsers,
  isConnected,
  onlineUsers,
  typingUsers,
  getUnreadCount,
  onDeleteChat,
  deletingChatUserId = null,
  isMobile = false,
  showMobileSidebar = true,
  onToggleMobileSidebar,
}: ChatSidebarProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !showMobileSidebar || !sidebarRef.current) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onToggleMobileSidebar?.();
      }
      setActiveMenuUserId(null);
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
  const suggestedUsers = searchQuery.trim() ? filteredUsers.slice(0, 5) : [];

  const handleUserSelect = (user: User) => {
    setActiveMenuUserId(null);
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
          className={`lg:hidden fixed inset-y-16 left-0 z-50 w-[100%] max-w-sm bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-transform duration-300 ease-in-out ${
            showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Sidebar Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
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
              <div className="mt-2 animate-fadeIn">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
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
                {searchQuery.trim() && (
                  <div className="mt-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {suggestedUsers.length > 0 ? (
                      suggestedUsers.map((user) => (
                        <button
                          key={`suggest-${user.id}`}
                          onClick={() => {
                            handleUserSelect(user);
                            setIsSearching(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <PremiumName
                            name={user.name || user.email || "Unknown user"}
                            isPremium={Boolean(user.isPremium)}
                            badgeLabel="Premium"
                            badgeClassName="px-1.5 py-0.5 text-[9px]"
                            textClassName="text-inherit"
                          />
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No matching users
                      </p>
                    )}
                  </div>
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
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => setIsSearching(true)}
                  readOnly={!isSearching}
                />
              </div>
            )}
          </div>

          {/* Mobile Users List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pb-30">
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
                const isOnline = onlineUsers.includes(user.id) || Boolean(user.isOnline);

                return (
                  <div
                    key={user.id}
                    className={`relative w-full transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <button
                      onClick={() => handleUserSelect(user)}
                      className="w-full flex items-center gap-3 p-4 pr-14 active:scale-98"
                    >
                    <div className="relative flex-shrink-0">
                      <PremiumAvatar
                        src={typeof user.avatar === "string" ? user.avatar : null}
                        alt={user.name || "User"}
                        fallback={user.name || "U"}
                        size={48}
                        isPremium={Boolean(user.isPremium)}
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <PremiumName
                          name={user.name || "Unknown"}
                          isPremium={Boolean(user.isPremium)}
                          badgeLabel="Premium"
                          badgeClassName="px-1.5 py-0.5 text-[9px]"
                          textClassName="font-semibold text-gray-900 dark:text-white"
                          className="min-w-0"
                        />
                        {user.lastSeen && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {/* {formatTime(user.lastSeen)} */}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {typingUsers.has(user.id) ? (
                          <span className="text-blue-600 dark:text-blue-400 italic">
                            typing...
                          </span>
                        ) : (
                          <span className={isOnline ? "text-green-600 dark:text-green-400" : ""}>
                            {/* {isOnline ? "Online" : "Offline"} */}
                          </span>
                        )}
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-full flex-shrink-0 min-w-[24px] text-center font-bold shadow-lg">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuUserId((prev) => (prev === user.id ? null : user.id));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Chat options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenuUserId === user.id && (
                      <div className="absolute right-3 top-11 z-20 min-w-36 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuUserId(null);
                            onDeleteChat(user);
                          }}
                          disabled={deletingChatUserId === user.id}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 flex items-center gap-2"
                        >
                          {deletingChatUserId === user.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete chat
                        </button>
                      </div>
                    )}
                  </div>
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
    <aside className="fixed top-16 left-0 hidden lg:flex w-80 shrink-0 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 flex-col h-full">
      {/* Desktop Sidebar Header */}
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
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
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop Users List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin  pb-14">
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
            const isOnline = onlineUsers.includes(user.id) || Boolean(user.isOnline);

            return (
              <div
                key={user.id}
                className={`relative w-full transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-900/30 border-r-4 border-blue-500"
                    : ""
                }`}
              >
                <button
                  onClick={() => handleUserSelect(user)}
                  className="w-full flex items-center gap-3 p-4 pr-14"
                >
                <div className="relative flex-shrink-0">
                  <PremiumAvatar
                    src={typeof user.avatar === "string" ? user.avatar : null}
                    alt={user.name || "User"}
                    fallback={user.name || "U"}
                    size={48}
                    isPremium={Boolean(user.isPremium)}
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <PremiumName
                      name={user.name || "Unknown"}
                      isPremium={Boolean(user.isPremium)}
                      badgeLabel="Premium"
                      badgeClassName="px-1.5 py-0.5 text-[9px]"
                      textClassName="font-semibold text-gray-900 dark:text-white"
                      className="min-w-0"
                    />
                    {user.lastSeen && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {/* {formatTime(user.lastSeen)} */}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {typingUsers.has(user.id) ? (
                      <span className="text-blue-600 dark:text-blue-400 italic">
                        typing...
                      </span>
                    ) : (
                      <span className={isOnline ? "text-green-600 dark:text-green-400" : ""}>
                        {/* {isOnline ? "Online" : "Offline"} */}
                      </span>
                    )}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <span className="px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-full flex-shrink-0 min-w-[24px] text-center font-bold shadow-lg">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuUserId((prev) => (prev === user.id ? null : user.id));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label="Chat options"
                >
                  <MoreVertical size={16} />
                </button>
                {activeMenuUserId === user.id && (
                  <div className="absolute right-3 top-11 z-20 min-w-36 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuUserId(null);
                        onDeleteChat(user);
                      }}
                      disabled={deletingChatUserId === user.id}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 flex items-center gap-2"
                    >
                      {deletingChatUserId === user.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete chat
                    </button>
                  </div>
                )}
              </div>
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

