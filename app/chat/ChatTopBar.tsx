"use client";

import React, { useEffect, useRef, useState } from "react";
import { User } from "../types/socket";
import {
  Archive,
  ArrowLeft,
  Ban,
  Info,
  Menu,
  MoreVertical,
  Phone,
  ShieldOff,
  Trash2,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSocket } from "../context/SocketContext";
import { useRouter } from "next/navigation";
import { useAudioCall } from "../hooks/useAudioCall";
import AudioCallModal from "../components/AudioCallModal";
import { PremiumAvatar, PremiumName } from "../components/premium-ui";

interface ChatTopBarProps {
  selectedUser: User | null;
  onBack: () => void;
  typingUsers: Set<string>;
  isMobile?: boolean;
  isNavbarHidden?: boolean;
  onToggleSidebar?: () => void;
  showMobileSidebar?: boolean;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onArchiveChat?: () => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
  isActionBusy?: boolean;
}

export default function ChatTopBar({
  selectedUser,
  onBack,
  typingUsers,
  isMobile = false,
  onToggleSidebar,
  onClearChat,
  onDeleteChat,
  onArchiveChat,
  onBlockUser,
  onUnblockUser,
  isActionBusy = false,
}: ChatTopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roomName = `audio-${session?.user?.id}-${selectedUser?.id}`;
  const { startCall, endCall, inCall, loading, isReady } = useAudioCall(roomName);

  const desktopLeft = "lg:left-80";
  const mobileClasses = isMobile ? "left-0 right-0" : "";
  const positionClasses = isMobile ? mobileClasses : `${desktopLeft} right-0`;
  const isGroupChat = selectedUser?.chatType === "group";

  const isUserOnline = selectedUser?.id
    ? !isGroupChat && onlineUsers.includes(selectedUser.id)
    : false;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const handleUserProfileClick = () => {
    if (selectedUser && !isGroupChat) {
      router.push(`/profile/${selectedUser.id}`);
    }
  };

  const handleMenuAction = (callback?: () => void) => {
    setIsMenuOpen(false);
    callback?.();
  };

  if (!selectedUser) {
    return (
      <>
        <header
          className={`fixed top-16 ${positionClasses} z-40 h-16 border-b border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-black`}
        >
          <div className="flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {isMobile && onToggleSidebar ? (
                <button
                  onClick={onToggleSidebar}
                  className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Open chats"
                >
                  <Menu size={20} />
                </button>
              ) : null}
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Select a conversation
              </span>
            </div>
          </div>
        </header>

        <AudioCallModal incoming={false} onAccept={startCall} onReject={() => {}} inCall={inCall} onEnd={endCall} />
      </>
    );
  }

  const menuItems = [
    {
      id: "clear",
      label: "Clear All Chat",
      icon: XCircle,
      onClick: onClearChat,
      danger: true,
    },
    {
      id: selectedUser.isBlockedByCurrentUser ? "unblock" : "block",
      label: selectedUser.isBlockedByCurrentUser ? "Unblock User" : "Block User",
      icon: selectedUser.isBlockedByCurrentUser ? ShieldOff : Ban,
      onClick: selectedUser.isBlockedByCurrentUser ? onUnblockUser : onBlockUser,
      danger: !selectedUser.isBlockedByCurrentUser,
    },
    {
      id: "archive",
      label: selectedUser.isArchived ? "Restore Chat" : "Archive Chat",
      icon: Archive,
      onClick: onArchiveChat,
      danger: false,
    },
    {
      id: "delete",
      label: "Delete Chat",
      icon: Trash2,
      onClick: onDeleteChat,
      danger: true,
    },
  ].filter((item) => !isGroupChat && Boolean(item.onClick));

  return (
    <>
      <header
        className={`fixed top-16 ${positionClasses} z-40 h-16 border-b transition-all duration-300 ${
          selectedUser.isPremium
            ? "border-amber-300/20 bg-gradient-to-r from-stone-950/95 via-amber-950/70 to-slate-950/95 text-slate-50"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-black"
        }`}
      >
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <button
                onClick={onBack}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-black"
                aria-label="Back to chats"
              >
                <ArrowLeft size={20} />
              </button>
            ) : onToggleSidebar ? (
              <button
                onClick={onToggleSidebar}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-black"
                aria-label="Toggle sidebar"
              >
                <Menu size={20} />
              </button>
            ) : null}

            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <button
                  onClick={handleUserProfileClick}
                  disabled={isGroupChat}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-default disabled:ring-0"
                  aria-label={isGroupChat ? "Group conversation" : "View user profile"}
                >
                  <PremiumAvatar
                    src={typeof selectedUser.avatar === "string" ? selectedUser.avatar : null}
                    alt={selectedUser.name || (isGroupChat ? "Group" : "User")}
                    fallback={selectedUser.name || (isGroupChat ? "G" : "U")}
                    size={40}
                    isPremium={Boolean(selectedUser.isPremium)}
                  />
                </button>
                {isGroupChat ? (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white dark:border-gray-900">
                    <Users size={11} />
                  </div>
                ) : isUserOnline ? (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
                ) : null}
              </div>

              <button
                onClick={handleUserProfileClick}
                disabled={isGroupChat}
                className="text-left transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
                aria-label={isGroupChat ? "Group conversation" : "View user profile"}
              >
                {isGroupChat ? (
                  <div
                    className={`text-sm font-bold sm:text-base ${
                      selectedUser.isPremium
                        ? "text-slate-50"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {selectedUser.name || "Group chat"}
                  </div>
                ) : (
                  <PremiumName
                    name={selectedUser.name}
                    isPremium={Boolean(selectedUser.isPremium)}
                    badgeLabel="Premium"
                    badgeClassName="px-1.5 py-0.5 text-[9px]"
                    textClassName={`text-sm font-bold sm:text-base ${
                      selectedUser.isPremium
                        ? "text-slate-50"
                        : "text-gray-900 dark:text-white"
                    }`}
                  />
                )}
                <p
                  className={`text-xs sm:text-sm ${
                    selectedUser.isPremium ? "text-slate-300" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {isGroupChat ? (
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      {selectedUser.memberCount ?? selectedUser.memberIds?.length ?? 0} members
                    </span>
                  ) : selectedUser.isBlocked ? (
                    <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Messaging blocked
                    </span>
                  ) : typingUsers.has(selectedUser.id) ? (
                    <span className="italic text-blue-600 dark:text-blue-400">typing...</span>
                  ) : isUserOnline ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Offline
                    </span>
                  )}
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2" ref={menuRef}>
            {!isGroupChat ? (
              <>
                <button
                  onClick={startCall}
                  disabled={!isReady || loading || Boolean(selectedUser.isBlocked)}
                  className="rounded-xl p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
                  aria-label="Voice call"
                >
                  <Phone size={18} />
                </button>

                <button
                  disabled={Boolean(selectedUser.isBlocked)}
                  className="rounded-xl p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
                  aria-label="Video call"
                >
                  <Video size={18} />
                </button>

                <button
                  onClick={handleUserProfileClick}
                  className="hidden rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:block"
                  aria-label="User info"
                >
                  <Info size={20} />
                </button>
              </>
            ) : null}

            {menuItems.length > 0 ? (
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                disabled={isActionBusy}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:hover:bg-gray-800"
                aria-label="Chat options"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
              >
                <MoreVertical size={18} />
              </button>
            ) : null}

            {isMenuOpen && menuItems.length > 0 ? (
              <>
                {isMobile ? (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsMenuOpen(false)} />
                    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-gray-950">
                      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="space-y-2">
                        {menuItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleMenuAction(item.onClick)}
                            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                              item.danger
                                ? "border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                                : "border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                            }`}
                          >
                            <item.icon size={18} />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute right-0 top-12 z-50 min-w-[220px] rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-950" role="menu">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleMenuAction(item.onClick)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${
                          item.danger
                            ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
                            : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-900"
                        }`}
                        role="menuitem"
                      >
                        <item.icon size={16} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>

      <AudioCallModal incoming={false} onAccept={startCall} onReject={() => {}} inCall={inCall} onEnd={endCall} />
    </>
  );
}
