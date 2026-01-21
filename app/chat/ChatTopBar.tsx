"use client";

import React from "react";
import { User } from "../types/socket";
import Image from "next/image";
import { ArrowLeft, Phone, Video, Info, Users, MoreVertical, Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSocket } from "../context/SocketContext";
import { useRouter } from "next/navigation";

interface ChatTopBarProps {
  selectedUser: User | null;
  onBack: () => void;
  typingUsers: Set<string>;
  isMobile?: boolean;
  isNavbarHidden?: boolean;
  onToggleSidebar?: () => void;
  showMobileSidebar?: boolean;
}

export default function ChatTopBar({
  selectedUser,
  onBack,
  typingUsers,
  isMobile = false,
  isNavbarHidden = false,
  onToggleSidebar,
  showMobileSidebar = false,
}: ChatTopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const desktopLeft = "lg:left-80";
  const mobileClasses = isMobile ? "left-0 right-0" : "";
  const positionClasses = isMobile ? mobileClasses : `${desktopLeft} right-0`;
  
  const { onlineUsers } = useSocket();
  const isUserOnline =
    selectedUser?.id
      ? onlineUsers.includes(selectedUser.id)
      : false;

  const handleUserProfileClick = () => {
    if (selectedUser) {
      // Navigate to the user's profile page
      router.push(`/profile/${selectedUser.id}`);
    }
  };

  if (!selectedUser) {
    return (
      <header className={`fixed top-16 ${positionClasses} z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 transition-all duration-300`}>
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isMobile && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95 flex-shrink-0"
                aria-label="Open chats"
              >
                <Menu size={20} />
              </button>
            )}
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Select a conversation
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
                aria-label="Menu"
              >
                <MoreVertical size={20} />
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`fixed top-16 ${positionClasses} z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 transition-all duration-300 translate-y-0`}>
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMobile ? (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95 flex-shrink-0"
              aria-label="Back to chats"
            >
              <ArrowLeft size={20} />
            </button>
          ) : onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <button
                onClick={handleUserProfileClick}
                className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-white dark:ring-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 active:scale-95 transition-transform"
                aria-label="View user profile"
              >
                {selectedUser.avatar ? (
                  <Image
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
              {isUserOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </div>
            <button
              onClick={handleUserProfileClick}
              className="text-left focus:outline-none hover:opacity-80 transition-opacity"
              aria-label="View user profile"
            >
              <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                {selectedUser.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {typingUsers.has(selectedUser.id) ? (
                  <span className="text-purple-600 dark:text-purple-400 italic">
                    typing...
                  </span>
                ) : isUserOnline ? (
                  "Online"
                ) : (
                  "Offline"
                )}
              </p>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
            aria-label="Voice call"
          >
            <Phone size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
            aria-label="Video call"
          >
            <Video size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={handleUserProfileClick}
            className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
            aria-label="User info"
          >
            <Info size={20} />
          </button>
          {isMobile && (
            <button 
              className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
              aria-label="More options"
            >
              <MoreVertical size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}