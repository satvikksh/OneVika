"use client";

import React from "react";
import { User } from "../types/socket";
import Image from "next/image";
import { ArrowLeft, Phone, Video, Info, Users, MoreVertical, Menu } from "lucide-react";
import { useSession } from "next-auth/react";

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

  // Desktop: Top bar should start at the edge of sidebar (80px)
  // Mobile: Top bar should be full width and NOT auto-hide
  const desktopLeft = "lg:left-80";
  const mobileClasses = isMobile ? "left-0 right-0" : "";
  const positionClasses = isMobile ? mobileClasses : `${desktopLeft} right-0`;

  if (!selectedUser) {
    return (
      <header className={`fixed top-16 ${positionClasses} z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 transition-all duration-300`}>
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile when no user selected */}
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
    <header className={`fixed top-16 ${positionClasses} z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 transition-all duration-300 ${
      // REMOVED the auto-hide transform for mobile
      // isMobile && isNavbarHidden ? '-translate-y-full' : 'translate-y-0'
      'translate-y-0'
    }`}>
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button on mobile, Menu button on desktop when sidebar is hidden */}
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
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-white dark:ring-gray-900">
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
              </div>
              {selectedUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                {selectedUser.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {typingUsers.has(selectedUser.id) ? (
                  <span className="text-purple-600 dark:text-purple-400 italic">
                    typing...
                  </span>
                ) : selectedUser.isOnline ? (
                  "Online"
                ) : (
                  "Offline"
                )}
              </p>
            </div>
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
            className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
            aria-label="Info"
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