"use client";

import React, { useEffect, useRef, useState } from "react";
import { User } from "../types/socket";
import {
  Archive,
  ArrowLeft,
  Ban,
  Copy,
  Eye,
  EyeOff,
  Forward,
  Info,
  Link2,
  Menu,
  MoreVertical,
  Phone,
  Reply,
  ShieldOff,
  Star,
  Trash2,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSocket } from "../context/SocketContext";
import { useRouter } from "next/navigation";
import { PremiumAvatar, PremiumName } from "../components/premium-ui";
import { useCall } from "../context/CallContext";

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
  onOpenGroupInfo?: () => void;
  isGroupInfoOpen?: boolean;
  isActionBusy?: boolean;
  showHiddenMessages?: boolean;
  hiddenMessageCount?: number;
  onToggleShowHiddenMessages?: () => void;
  selectedMessageCount?: number;
  onExitSelectionMode?: () => void;
  onCopySelectedMessages?: () => void;
  onForwardSelectedMessages?: () => void;
  onReplySelectedMessage?: () => void;
  onStarSelectedMessage?: () => void;
  onCopySelectedLink?: () => void;
  onHideSelectedMessages?: () => void;
  onUnhideSelectedMessages?: () => void;
  onDeleteSelectedMessages?: () => void;
  onDeleteSelectedForEveryone?: () => void;
  canReplySelectedMessage?: boolean;
  canCopySelectedMessages?: boolean;
  canStarSelectedMessage?: boolean;
  canCopySelectedLink?: boolean;
  canForwardSelectedMessages?: boolean;
  canHideSelectedMessages?: boolean;
  canUnhideSelectedMessages?: boolean;
  canDeleteSelectedMessages?: boolean;
  canDeleteSelectedForEveryone?: boolean;
  isSelectionActionBusy?: boolean;
}

function ChatTopBar({
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
  onOpenGroupInfo,
  isGroupInfoOpen = false,
  isActionBusy = false,
  showHiddenMessages = false,
  hiddenMessageCount = 0,
  onToggleShowHiddenMessages,
  selectedMessageCount = 0,
  onExitSelectionMode,
  onCopySelectedMessages,
  onForwardSelectedMessages,
  onReplySelectedMessage,
  onStarSelectedMessage,
  onCopySelectedLink,
  onHideSelectedMessages,
  onUnhideSelectedMessages,
  onDeleteSelectedMessages,
  onDeleteSelectedForEveryone,
  canReplySelectedMessage = false,
  canCopySelectedMessages = false,
  canStarSelectedMessage = false,
  canCopySelectedLink = false,
  canForwardSelectedMessages = false,
  canHideSelectedMessages = false,
  canUnhideSelectedMessages = false,
  canDeleteSelectedMessages = false,
  canDeleteSelectedForEveryone = false,
  isSelectionActionBusy = false,
}: ChatTopBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const { activeCall, startCall } = useCall();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSelectionMoreOpen, setIsSelectionMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectionMoreRef = useRef<HTMLDivElement>(null);

  const desktopLeft = "lg:left-80";
  const mobileClasses = isMobile ? "left-0 right-0" : "";
  const positionClasses = isMobile ? mobileClasses : `${desktopLeft} right-0`;
  const isGroupChat = selectedUser?.chatType === "group";
  const isAiChat = Boolean(selectedUser?.isAI);
  const isSelectionMode = selectedMessageCount > 0;
  const isCallDisabled =
    !session?.user?.id ||
    Boolean(activeCall) ||
    Boolean(selectedUser?.isBlocked) ||
    Boolean(selectedUser?.hasBlockedCurrentUser);

  const isUserOnline = selectedUser?.id
    ? !isGroupChat && onlineUsers.includes(selectedUser.id)
    : false;

  useEffect(() => {
    if (!isMenuOpen && !isSelectionMoreOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (
        selectionMoreRef.current &&
        !selectionMoreRef.current.contains(event.target as Node)
      ) {
        setIsSelectionMoreOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsSelectionMoreOpen(false);
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
  }, [isMenuOpen, isSelectionMoreOpen]);

  const handleUserProfileClick = () => {
    if (selectedUser && !isGroupChat) {
      router.push(`/profile/${selectedUser.id}`);
    }
  };

  const handleHeaderPrimaryAction = () => {
    if (isGroupChat) {
      onOpenGroupInfo?.();
      return;
    }

    handleUserProfileClick();
  };

  const handleMenuAction = (callback?: () => void) => {
    setIsMenuOpen(false);
    callback?.();
  };

  const handleStartCall = (video: boolean) => {
    if (!selectedUser || isGroupChat || isAiChat || isCallDisabled) return;

    void startCall(
      [
        {
          id: selectedUser.id,
          name: selectedUser.name,
          avatar:
            typeof selectedUser.avatar === "string"
              ? selectedUser.avatar
              : selectedUser.image ?? null,
        },
      ],
      {
        video,
        conversationId: selectedUser.conversationId,
      }
    );
  };

  if (!selectedUser) {
    return (
      <>
        <header
          className={`fixed top-16 ${positionClasses} z-40 h-16 border-b border-gray-200 bg-white transition-colors duration-200 dark:border-gray-800 dark:bg-black`}
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

      </>
    );
  }

  if (isSelectionMode) {
    const selectionActions = [
      {
        id: "reply",
        label: "Reply",
        icon: Reply,
        onClick: onReplySelectedMessage,
        disabled: !canReplySelectedMessage,
      },
      {
        id: "copy",
        label: "Copy Text",
        icon: Copy,
        onClick: onCopySelectedMessages,
        disabled: !canCopySelectedMessages,
      },
      {
        id: "star",
        label: "Star",
        icon: Star,
        onClick: onStarSelectedMessage,
        disabled: !canStarSelectedMessage,
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        onClick: onDeleteSelectedMessages,
        disabled: !canDeleteSelectedMessages,
      },
    ];
    const moreActions = [
      {
        id: "copyLink",
        label: "Copy Link",
        icon: Link2,
        onClick: onCopySelectedLink,
        disabled: !canCopySelectedLink,
      },
      {
        id: "forward",
        label: "Forward",
        icon: Forward,
        onClick: onForwardSelectedMessages,
        disabled: !canForwardSelectedMessages,
      },
      {
        id: "toggleHidden",
        label: canUnhideSelectedMessages ? "Unhide Message" : "Hide Message",
        icon: canUnhideSelectedMessages ? Eye : EyeOff,
        onClick: canUnhideSelectedMessages
          ? onUnhideSelectedMessages
          : onHideSelectedMessages,
        disabled: canUnhideSelectedMessages
          ? !canUnhideSelectedMessages
          : !canHideSelectedMessages,
      },
      {
        id: "deleteSelf",
        label: "Delete for Me",
        icon: Trash2,
        onClick: onDeleteSelectedMessages,
        disabled: !canDeleteSelectedMessages,
        danger: true,
      },
      {
        id: "deleteEveryone",
        label: "Delete for Everyone",
        icon: Trash2,
        onClick: onDeleteSelectedForEveryone,
        disabled: !canDeleteSelectedForEveryone,
        danger: true,
      },
    ];

    return (
      <>
        <header
          className={`fixed top-16 ${positionClasses} z-40 h-16 border-b border-emerald-800 bg-emerald-700 text-white transition-colors duration-200`}
        >
          <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                onClick={onExitSelectionMode}
                className="rounded-xl p-2 transition-colors hover:bg-white/10"
                aria-label="Clear selected messages"
              >
                {isMobile ? <ArrowLeft size={20} /> : <X size={20} />}
              </button>

              <div className="min-w-0">
                <div className="text-sm font-semibold sm:text-base">
                  {selectedMessageCount} selected
                </div>
                <p className="truncate text-xs text-emerald-100">
                  Tap more messages to add or remove them
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {selectionActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled || isSelectionActionBusy}
                  className="rounded-xl p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={action.label}
                  title={action.label}
                >
                  <action.icon size={18} />
                </button>
              ))}
              <div className="relative" ref={selectionMoreRef}>
                <button
                  type="button"
                  onClick={() => setIsSelectionMoreOpen((open) => !open)}
                  disabled={isSelectionActionBusy}
                  className="rounded-xl p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="More selected message actions"
                  title="More"
                >
                  <MoreVertical size={18} />
                </button>
                {isSelectionMoreOpen ? (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-white">
                    {moreActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          setIsSelectionMoreOpen(false);
                          action.onClick?.();
                        }}
                        disabled={action.disabled || isSelectionActionBusy}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-900 ${
                          action.danger ? "text-red-600 dark:text-red-300" : ""
                        }`}
                      >
                        <action.icon size={16} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

      </>
    );
  }

  const menuItems = [
    {
      id: "toggleHiddenMessages",
      label: showHiddenMessages
        ? "Hide Hidden Messages"
        : hiddenMessageCount > 0
          ? `Show Hidden Messages (${hiddenMessageCount})`
          : "Show Hidden Messages",
      icon: showHiddenMessages ? EyeOff : Eye,
      onClick: onToggleShowHiddenMessages,
      danger: false,
    },
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
  ].filter(
    (item) =>
      (item.id === "toggleHiddenMessages" ||
        (!isGroupChat && (!isAiChat || item.id === "clear"))) &&
      Boolean(item.onClick)
  );

  return (
    <>
      <header
        className={`fixed top-16 ${positionClasses} z-40 h-16 border-b transition-colors duration-200 ${
          selectedUser.isPremium
            ? "border-amber-300/20 bg-gradient-to-r from-stone-950/95 via-amber-950/70 to-slate-950/95 text-slate-50"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-black"
        }`}
      >
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {isMobile ? (
              <button
                onClick={onBack}
                className="flex-shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-black"
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

            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                onClick={handleHeaderPrimaryAction}
                className="relative flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={isGroupChat ? "Open group info" : "View user profile"}
              >
                <div className="relative">
                  <PremiumAvatar
                    src={typeof selectedUser.avatar === "string" ? selectedUser.avatar : null}
                    alt={selectedUser.name || (isGroupChat ? "Group" : "User")}
                    fallback={selectedUser.name || (isGroupChat ? "G" : "U")}
                    size={isMobile ? 36 : 40}
                    isPremium={Boolean(selectedUser.isPremium)}
                  />
                  {isGroupChat ? (
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white dark:border-gray-900">
                      <Users size={11} />
                    </div>
                  ) : isUserOnline ? (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
                  ) : null}
                </div>
              </button>

              <button
                onClick={handleHeaderPrimaryAction}
                className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
                aria-label={isGroupChat ? "Open group info" : "View user profile"}
              >
                {isGroupChat ? (
                  <div
                    className={`truncate text-sm font-bold sm:text-base ${
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
                    badgeLabel=""
                    badgeClassName="px-1.5 py-0.5 text-[9px]"
                    textClassName={`text-sm font-bold sm:text-base ${
                      selectedUser.isPremium
                        ? "text-slate-50"
                        : "text-gray-900 dark:text-white"
                    }`}
                    className="min-w-0"
                  />
                )}
                <p
                  className={`truncate text-xs sm:text-sm ${
                    selectedUser.isPremium ? "text-slate-300" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {isGroupChat ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-gray-500" />
                      {selectedUser.memberCount ?? selectedUser.memberIds?.length ?? 0} members
                    </span>
                  ) : isAiChat ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-green-600" />
                      AI assistant online
                    </span>
                  ) : selectedUser.isBlocked ? (
                    <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Messaging blocked
                    </span>
                  ) : typingUsers.has(selectedUser.id) ? (
                    <span className="italic text-gray-600 dark:text-gray-400">typing...</span>
                  ) : isUserOnline ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-600">
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

          <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-2" ref={menuRef}>
            {!isGroupChat && !isAiChat ? (
              <>
                <button
                  onClick={() => handleStartCall(false)}
                  disabled={isCallDisabled}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 sm:h-10 sm:w-10"
                  aria-label="Voice call"
                >
                  <Phone size={18} />
                </button>

                <button
                  onClick={() => handleStartCall(true)}
                  disabled={isCallDisabled}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 sm:h-10 sm:w-10"
                  aria-label="Video call"
                >
                  <Video size={18} />
                </button>

                <button
                  onClick={handleUserProfileClick}
                  className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 md:inline-flex"
                  aria-label="User info"
                >
                  <Info size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenGroupInfo}
                disabled={!onOpenGroupInfo}
                className={`rounded-xl p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800 ${
                  isGroupInfoOpen ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" : ""
                }`}
                aria-label="Open group info"
              >
                <Info size={18} />
              </button>
            )}

            {menuItems.length > 0 ? (
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                disabled={isActionBusy}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100 disabled:opacity-60 dark:hover:bg-gray-800 sm:h-10 sm:w-10"
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

    </>
  );
}

export default React.memo(ChatTopBar);
