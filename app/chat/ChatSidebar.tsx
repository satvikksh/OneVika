"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User } from "../types/socket";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Loader2,
  Lock,
  Menu,
  MessageSquare,
  Pin,
  PinOff,
  Search,
  Shield,
  Trash2,
  User as UserIcon,
  X,
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
  onDeleteChat: (user: User) => Promise<void> | void;
  onArchiveChat: (user: User, nextArchived: boolean) => Promise<void> | void;
  onPinChat: (user: User, nextPinned: boolean) => Promise<void> | void;
  onLockChat: (
    user: User,
    password: string,
    visibility: "blur" | "hidden"
  ) => Promise<void> | void;
  onRemoveLock: (user: User, password: string) => Promise<void> | void;
  onUnlockChat: (
    user: User,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  deletingChatUserId?: string | null;
  updatingChatUserId?: string | null;
  isMobile?: boolean;
  showMobileSidebar: boolean;
  onBackToSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}

type ActionMenuState = { user: User; rect: DOMRect };
type LockDialogState =
  | { mode: "lock" | "unlock" | "removeLock"; user: User }
  | null;

const LONG_PRESS_DURATION_MS = 650;
const MOVE_CANCEL_THRESHOLD_PX = 12;

const getChatDisplayName = (user: User) => user.name || user.email || "Unknown user";
const getPresentedName = (user: User) =>
  user.isLocked && !user.isUnlocked && user.lockVisibility === "hidden"
    ? "Locked chat"
    : getChatDisplayName(user);

const getPresentedStatus = (
  user: User,
  typingUsers: Set<string>,
  isOnline: boolean
) => {
  if (user.isLocked && !user.isUnlocked) {
    return user.lockVisibility === "hidden"
      ? "Hidden until unlocked"
      : "Password protected";
  }

  if (typingUsers.has(user.id)) return "typing...";
  return isOnline ? "Online" : " ";
};

const styles = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes chatSheet { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes chatPopover { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  .animate-chatSheet { animation: chatSheet 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
  .animate-chatPopover { animation: chatPopover 0.18s ease-out; }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 999px; }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.75); }
  .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
`;

if (typeof document !== "undefined" && !document.getElementById("chat-sidebar-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "chat-sidebar-styles";
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const ChatActionMenu: React.FC<{
  menu: ActionMenuState | null;
  isMobile: boolean;
  busyUserId: string | null;
  onClose: () => void;
  onAction: (
    action: "delete" | "archive" | "pin" | "lock" | "removeLock",
    user: User
  ) => void;
}> = ({ menu, isMobile, busyUserId, onClose, onAction }) => {
  useEffect(() => {
    if (!menu) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isMobile) {
      document.body.style.overflow = "hidden";
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (isMobile) {
        document.body.style.overflow = "";
      }
    };
  }, [isMobile, menu, onClose]);

  if (!menu) return null;

  const { user, rect } = menu;
  const isBusy = busyUserId === user.id;
  const items = [
    { id: "delete" as const, icon: Trash2, label: "Delete Chat/User", danger: true },
    { id: "archive" as const, icon: Archive, label: user.isArchived ? "Restore Chat" : "Archive Chat" },
    { id: "pin" as const, icon: user.isPinned ? PinOff : Pin, label: user.isPinned ? "Unpin Chat" : "Pin Chat" },
    { id: "lock" as const, icon: Lock, label: user.isLocked ? "Update Lock" : "Lock Chat" },
    ...(user.isLocked
      ? [{ id: "removeLock" as const, icon: EyeOff, label: "Remove Lock" }]
      : []),
  ];

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <div className="fixed inset-x-0 bottom-0 z-[71] animate-chatSheet rounded-t-[28px] border border-white/10 bg-white px-4 pb-6 pt-3 shadow-2xl dark:bg-gray-950">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Chat actions</p>
              <h3 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{getPresentedName(user)}</h3>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" aria-label="Close chat actions">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onAction(item.id, user)}
                disabled={isBusy}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                  item.danger
                    ? "border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    : "border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                } disabled:opacity-60`}
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
                  item.danger ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" : "bg-white text-blue-600 dark:bg-gray-800 dark:text-blue-300"
                }`}>
                  {isBusy ? <Loader2 size={17} className="animate-spin" /> : <item.icon size={18} />}
                </div>
                <div className="font-medium">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const left = Math.min(rect.left + 12, window.innerWidth - 320);
  const top = Math.min(rect.bottom + 8, window.innerHeight - 320);

  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div className="fixed z-[71] min-w-[280px] max-w-[320px] animate-chatPopover rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-950" style={{ left, top }} role="menu">
        <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Chat actions</div>
          <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{getPresentedName(user)}</div>
        </div>
        <div className="mt-1 space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onAction(item.id, user)}
              disabled={isBusy}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                item.danger ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50" : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-900"
              } disabled:opacity-60`}
              role="menuitem"
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                item.danger ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
              }`}>
                {isBusy ? <Loader2 size={16} className="animate-spin" /> : <item.icon size={16} />}
              </div>
              <div className="font-medium">{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

const ChatPasswordDialog: React.FC<{
  dialog: LockDialogState;
  isMobile: boolean;
  password: string;
  confirmPassword: string;
  visibility: "blur" | "hidden";
  error: string;
  submitting: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onVisibilityChange: (value: "blur" | "hidden") => void;
  onClose: () => void;
  onSubmit: () => void;
  onRemoveLock?: () => void;
}> = ({
  dialog,
  isMobile,
  password,
  confirmPassword,
  visibility,
  error,
  submitting,
  onPasswordChange,
  onConfirmPasswordChange,
  onVisibilityChange,
  onClose,
  onSubmit,
  onRemoveLock,
}) => {
  useEffect(() => {
    if (!dialog) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [dialog, onClose, submitting]);

  if (!dialog) return null;

  const isLockMode = dialog.mode === "lock";
  const isRemoveLockMode = dialog.mode === "removeLock";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close password dialog" />
      <div className={`relative z-[81] w-full max-w-md overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 ${isMobile ? "animate-chatSheet" : "animate-chatPopover"}`} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{isLockMode ? "Protect chat" : isRemoveLockMode ? "Remove lock" : "Unlock chat"}</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{isLockMode ? "Set a chat password" : isRemoveLockMode ? "Confirm password to remove lock" : "Enter your chat password"}</h3>
          </div>
          <button onClick={onClose} disabled={submitting} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">{getPresentedName(dialog.user)}</span>
            {isLockMode
              ? " will require this password next time it is opened."
              : isRemoveLockMode
                ? " will be unlocked for future access after password confirmation."
                : " is locked. Enter the password to continue."}
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-800 dark:text-gray-200">Password</span>
            <input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} autoFocus className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder={isLockMode ? "Choose a password" : "Enter password"} />
          </label>
          {isLockMode ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-800 dark:text-gray-200">Confirm password</span>
                <input type="password" value={confirmPassword} onChange={(event) => onConfirmPasswordChange(event.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Re-enter password" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => onVisibilityChange("blur")} className={`rounded-2xl border px-4 py-3 text-left transition ${visibility === "blur" ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"}`}>
                  <div className="flex items-center gap-2 font-medium"><Shield size={16} /> Blur</div>
                </button>
                <button type="button" onClick={() => onVisibilityChange("hidden")} className={`rounded-2xl border px-4 py-3 text-left transition ${visibility === "hidden" ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"}`}>
                  <div className="flex items-center gap-2 font-medium"><EyeOff size={16} /> Hide</div>
                </button>
              </div>
            </>
          ) : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-gray-800">
          <button onClick={onClose} disabled={submitting} className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Cancel</button>
          {isRemoveLockMode && onRemoveLock ? (
            <button onClick={onRemoveLock} disabled={submitting} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Removing...</span> : "Remove lock"}
            </button>
          ) : null}
          {!isRemoveLockMode ? (
            <button onClick={onSubmit} disabled={submitting} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{isLockMode ? "Saving..." : "Unlocking..."}</span> : isLockMode ? "Save password" : "Unlock chat"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

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
  onArchiveChat,
  onPinChat,
  onLockChat,
  onRemoveLock,
  onUnlockChat,
  deletingChatUserId = null,
  updatingChatUserId = null,
  isMobile = false,
  showMobileSidebar = true,
  onToggleMobileSidebar,
}: ChatSidebarProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(true);
  const [pressingUserId, setPressingUserId] = useState<string | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [lockDialog, setLockDialog] = useState<LockDialogState>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [lockVisibility, setLockVisibility] = useState<"blur" | "hidden">("blur");
  const [dialogError, setDialogError] = useState("");
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pressAnimationFrameRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef(0);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const pressTriggeredRef = useRef(false);
  const suppressClickRef = useRef(false);

  const activeBusyUserId = deletingChatUserId || updatingChatUserId || null;

  const resetPressState = useCallback(() => {
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    if (pressAnimationFrameRef.current) window.cancelAnimationFrame(pressAnimationFrameRef.current);
    pressTimerRef.current = null;
    pressAnimationFrameRef.current = null;
    pressOriginRef.current = null;
    pressTriggeredRef.current = false;
    setPressingUserId(null);
    setPressProgress(0);
  }, []);

  const openActionMenu = useCallback((user: User, target: HTMLElement) => {
    setActionMenu({ user, rect: target.getBoundingClientRect() });
  }, []);

  const openLockDialog = useCallback((mode: "lock" | "unlock" | "removeLock", user: User) => {
    setActionMenu(null);
    setDialogError("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setLockVisibility(user.lockVisibility === "hidden" ? "hidden" : "blur");
    setLockDialog({ mode, user });
  }, []);

  const closeDialog = useCallback(() => {
    if (isDialogSubmitting) return;
    setLockDialog(null);
    setDialogError("");
    setPasswordInput("");
    setConfirmPasswordInput("");
  }, [isDialogSubmitting]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    setIsArchivedExpanded(true);
  }, [searchQuery]);

  useEffect(() => {
    if (!isMobile || !showMobileSidebar || !sidebarRef.current || actionMenu || lockDialog) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onToggleMobileSidebar?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [actionMenu, isMobile, lockDialog, onToggleMobileSidebar, showMobileSidebar]);

  useEffect(() => {
    if (isMobile && showMobileSidebar) {
      document.body.style.overflow = "hidden";
    } else if (!actionMenu && !lockDialog) {
      document.body.style.overflow = "";
    }

    return () => {
      if (!actionMenu && !lockDialog) {
        document.body.style.overflow = "";
      }
    };
  }, [actionMenu, isMobile, lockDialog, showMobileSidebar]);

  useEffect(() => () => resetPressState(), [resetPressState]);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user &&
          user.id &&
          (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [searchQuery, users]
  );

  const suggestedUsers = searchQuery.trim() ? filteredUsers.slice(0, 5) : [];
  const activeUsers = filteredUsers.filter((user) => !user.isArchived);
  const archivedUsers = filteredUsers.filter((user) => user.isArchived);
  const highlightedUserId = actionMenu?.user.id ?? pressingUserId;

  const handleUserSelect = useCallback((user: User) => {
    setActionMenu(null);
    if (user.isLocked && !user.isUnlocked) {
      openLockDialog("unlock", user);
      return;
    }

    onSelectUser(user);
  }, [onSelectUser, openLockDialog]);

  const beginLongPress = useCallback((event: React.PointerEvent<HTMLDivElement>, user: User) => {
    if (activeBusyUserId === user.id) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.currentTarget;
    resetPressState();
    suppressClickRef.current = false;
    pressStartTimeRef.current = performance.now();
    pressOriginRef.current = { x: event.clientX, y: event.clientY };
    setPressingUserId(user.id);
    setPressProgress(0);

    const animateProgress = () => {
      const progress = Math.min((performance.now() - pressStartTimeRef.current) / LONG_PRESS_DURATION_MS, 1);
      setPressProgress(progress);
      if (!pressTriggeredRef.current && progress < 1) {
        pressAnimationFrameRef.current = window.requestAnimationFrame(animateProgress);
      }
    };

    pressAnimationFrameRef.current = window.requestAnimationFrame(animateProgress);
    pressTimerRef.current = window.setTimeout(() => {
      pressTriggeredRef.current = true;
      suppressClickRef.current = true;
      setPressProgress(1);
      openActionMenu(user, target);
      if ("vibrate" in navigator) navigator.vibrate(12);
    }, LONG_PRESS_DURATION_MS);
  }, [activeBusyUserId, openActionMenu, resetPressState]);

  const cancelLongPress = useCallback((preserveClickSuppression = false) => {
    const wasTriggered = pressTriggeredRef.current;
    resetPressState();
    if (wasTriggered && preserveClickSuppression) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }, [resetPressState]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!pressOriginRef.current || pressTriggeredRef.current) return;
    const deltaX = Math.abs(event.clientX - pressOriginRef.current.x);
    const deltaY = Math.abs(event.clientY - pressOriginRef.current.y);
    if (deltaX > MOVE_CANCEL_THRESHOLD_PX || deltaY > MOVE_CANCEL_THRESHOLD_PX) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  const handleMenuAction = useCallback(async (action: "delete" | "archive" | "pin" | "lock" | "removeLock", user: User) => {
    try {
      if (action === "lock") {
        openLockDialog("lock", user);
        return;
      }

      if (action === "removeLock") {
        openLockDialog("removeLock", user);
        return;
      }

      setActionMenu(null);
      if (action === "delete") return void (await onDeleteChat(user));
      if (action === "archive") return void (await onArchiveChat(user, !user.isArchived));
      await onPinChat(user, !user.isPinned);
    } catch (error) {
      console.error("Chat action failed:", error);
      alert("Unable to update this chat right now. Please try again.");
    }
  }, [onArchiveChat, onDeleteChat, onPinChat, openLockDialog]);

  const handleDialogSubmit = useCallback(async () => {
    if (!lockDialog) return;

    if (lockDialog.mode === "lock") {
      if (passwordInput.trim().length < 4) {
        setDialogError("Use at least 4 characters for the chat password.");
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setDialogError("The password confirmation does not match.");
        return;
      }

      try {
        setDialogError("");
        setIsDialogSubmitting(true);
        await onLockChat(lockDialog.user, passwordInput, lockVisibility);
        closeDialog();
      } catch (error) {
        console.error("Lock chat failed:", error);
        setDialogError("Unable to save this chat lock right now.");
      } finally {
        setIsDialogSubmitting(false);
      }
      return;
    }

    if (lockDialog.mode === "removeLock") {
      if (!passwordInput.trim()) {
        setDialogError("Enter the current password to remove the lock.");
        return;
      }

      try {
        setDialogError("");
        setIsDialogSubmitting(true);
        await onRemoveLock(lockDialog.user, passwordInput);
        closeDialog();
      } catch (error) {
        console.error("Remove lock failed:", error);
        setDialogError("Unable to remove the lock right now.");
      } finally {
        setIsDialogSubmitting(false);
      }

      return;
    }

    if (!passwordInput.trim()) {
      setDialogError("Enter the password to unlock this chat.");
      return;
    }

    setDialogError("");
    setIsDialogSubmitting(true);
    const result = await onUnlockChat(lockDialog.user, passwordInput);
    if (!result.success) {
      setDialogError(result.error || "Incorrect password.");
      setIsDialogSubmitting(false);
      return;
    }

    setIsDialogSubmitting(false);
    closeDialog();
    handleUserSelect({ ...lockDialog.user, isUnlocked: true });
  }, [closeDialog, confirmPasswordInput, handleUserSelect, lockDialog, lockVisibility, onLockChat, onRemoveLock, onUnlockChat, passwordInput]);

  const renderUserRow = (user: User) => {
    const unreadCount = getUnreadCount(user.id);
    const isSelected = selectedUser?.id === user.id;
    const isOnline = onlineUsers.includes(user.id) || Boolean(user.isOnline);
    const isLockedHidden = user.isLocked && !user.isUnlocked && user.lockVisibility === "hidden";
    const isLockedBlurred = user.isLocked && !user.isUnlocked && user.lockVisibility !== "hidden";
    const isHighlighted = highlightedUserId === user.id;
    const isBusy = activeBusyUserId === user.id;

    return (
      <div
        key={user.id}
        onPointerDown={(event) => beginLongPress(event, user)}
        onPointerUp={() => cancelLongPress(true)}
        onPointerLeave={() => cancelLongPress()}
        onPointerCancel={() => cancelLongPress()}
        onPointerMove={handlePointerMove}
        onContextMenu={(event) => {
          event.preventDefault();
          openActionMenu(user, event.currentTarget);
        }}
        className={`group relative overflow-hidden transition-all duration-200 ${
          isSelected ? "bg-blue-100/90 dark:bg-blue-950/40" : "hover:bg-gray-100 dark:hover:bg-gray-900"
        } ${isHighlighted ? "bg-blue-50 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)] dark:bg-blue-950/30" : ""}`}
      >
        <button
          onClick={() => {
            if (suppressClickRef.current) return;
            handleUserSelect(user);
          }}
          onKeyDown={(event) => {
            if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
              event.preventDefault();
              openActionMenu(user, event.currentTarget);
            }
          }}
          className="flex w-full items-center gap-3 px-4 py-4 text-left"
          aria-haspopup="menu"
          aria-expanded={actionMenu?.user.id === user.id}
          aria-label={`${getPresentedName(user)}. Press Enter to open or press Shift+F10 for chat actions.`}
          title="Press and hold for chat actions"
          disabled={isBusy}
        >
          <div className="relative flex-shrink-0">
            {isLockedHidden ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"><Lock size={18} /></div>
            ) : (
              <div className={isLockedBlurred ? "blur-[3px]" : ""}>
                <PremiumAvatar src={typeof user.avatar === "string" ? user.avatar : null} alt={getChatDisplayName(user)} fallback={getChatDisplayName(user)} size={48} isPremium={Boolean(user.isPremium)} />
              </div>
            )}
            {isOnline && !isLockedHidden ? <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-950" /> : null}
            {user.isLocked ? <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-gray-900 text-white dark:border-gray-950 dark:bg-gray-100 dark:text-gray-900"><Lock size={12} /></span> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className={`min-w-0 ${isLockedBlurred ? "blur-[2px]" : ""}`}>
                {isLockedHidden ? (
                  <span className="block truncate font-semibold text-gray-900 dark:text-white">Locked chat</span>
                ) : (
                  <PremiumName name={getChatDisplayName(user)} isPremium={Boolean(user.isPremium)} badgeLabel="Premium" badgeClassName="px-1.5 py-0.5 text-[9px]" textClassName="font-semibold text-gray-900 dark:text-white" className="min-w-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5">{user.isPinned ? <Pin size={13} className="text-amber-500" /> : null}{user.isArchived ? <Archive size={13} className="text-gray-400" /> : null}</div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">
                {typingUsers.has(user.id) && !user.isLocked ? <span className="italic text-blue-600 dark:text-blue-400">typing...</span> : <span className={isOnline && !user.isLocked ? "text-green-600 dark:text-green-400" : undefined}>{getPresentedStatus(user, typingUsers, isOnline)}</span>}
              </p>
              {unreadCount > 0 ? <span className="flex min-w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-pink-600 px-2 py-1 text-xs font-bold text-white shadow-lg">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
            </div>
          </div>
        </button>
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left bg-gradient-to-r from-blue-500 via-cyan-400 to-sky-500 transition-transform duration-75 ${pressingUserId === user.id ? "opacity-100" : "opacity-0"}`} style={{ transform: `scaleX(${pressingUserId === user.id ? pressProgress : 0})` }} />
        {isHighlighted ? <div className="pointer-events-none absolute inset-0 rounded-2xl border border-blue-400/50" /> : null}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="px-4 py-12 text-center">
      <UserIcon className="mx-auto mb-3 h-16 w-16 text-gray-400" />
      <p className="font-medium text-gray-500 dark:text-gray-400">{searchQuery ? "No users found" : "No users available"}</p>
      {searchQuery ? <p className="mt-1 text-sm text-gray-400">Try a different search term</p> : null}
    </div>
  );

  const renderListContent = () => {
    if (loadingUsers) {
      return <div className="px-4 py-12 text-center"><Loader2 className="mx-auto mb-3 h-16 w-16 animate-spin text-gray-400" /><p className="font-medium text-gray-500 dark:text-gray-400">Loading users...</p></div>;
    }
    if (filteredUsers.length === 0) return renderEmptyState();

    return (
      <div className="pb-24">
        {activeUsers.length > 0 ? <div>{activeUsers.map((user) => renderUserRow(user))}</div> : null}
        {archivedUsers.length > 0 ? (
          <div className="border-t border-gray-200/80 pt-2 dark:border-gray-800">
            <button onClick={() => setIsArchivedExpanded((prev) => !prev)} className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={isArchivedExpanded}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Archive</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{archivedUsers.length} chat{archivedUsers.length === 1 ? "" : "s"} archived</div>
              </div>
              {isArchivedExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
            </button>
            {isArchivedExpanded ? <div>{archivedUsers.map((user) => renderUserRow(user))}</div> : null}
          </div>
        ) : null}
      </div>
    );
  };

  const sidebarHeader = (
    <div className="shrink-0 border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!isMobile ? <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"><MessageSquare size={20} /></div> : <button onClick={onToggleMobileSidebar} className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close sidebar"><ArrowLeft size={20} /></button>}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isMobile ? "Chats" : "Messages"}</h2>
            {!isMobile ? <p className="text-sm text-gray-500 dark:text-gray-400">{activeUsers.length} active, {archivedUsers.length} archived</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> : null}
          {isMobile ? <button onClick={() => setIsSearching((prev) => !prev)} className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={isSearching ? "Close search" : "Search chats"}><Search size={20} /></button> : <span className="text-sm text-gray-500 dark:text-gray-400">{users.length}</span>}
        </div>
      </div>
      {isMobile && isSearching ? (
        <div className="animate-fadeIn">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search users..." className="w-full rounded-2xl border border-gray-300 bg-gray-100 py-2.5 pl-10 pr-10 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} autoFocus />
            {searchQuery ? <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Clear search"><X size={14} /></button> : null}
          </div>
          {searchQuery.trim() ? <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">{suggestedUsers.length > 0 ? suggestedUsers.map((user) => <button key={`suggest-${user.id}`} onClick={() => { handleUserSelect(user); setIsSearching(false); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700"><span>{getPresentedName(user)}</span>{user.isLocked ? <Lock size={14} className="text-gray-400" /> : null}</button>) : <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matching users</p>}</div> : null}
        </div>
      ) : null}
      {!isMobile || !isSearching ? <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search users..." className="w-full rounded-2xl border border-gray-300 bg-gray-100 py-2.5 pl-10 pr-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onClick={() => { if (isMobile) setIsSearching(true); }} readOnly={isMobile && !isSearching} /></div> : null}
    </div>
  );

  const sidebarShell = (
    <>
      {sidebarHeader}
      <div className="flex-1 overflow-y-auto scrollbar-thin">{renderListContent()}</div>
      <div className="safe-area-bottom h-4" />
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${showMobileSidebar ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} onClick={onToggleMobileSidebar} />
        <aside ref={sidebarRef} className={`fixed inset-y-16 left-0 z-50 flex h-full w-full max-w-sm flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-black lg:hidden ${showMobileSidebar ? "translate-x-0" : "-translate-x-full"}`}>{sidebarShell}</aside>
        <ChatActionMenu menu={actionMenu} isMobile busyUserId={activeBusyUserId} onClose={() => setActionMenu(null)} onAction={handleMenuAction} />
        <ChatPasswordDialog dialog={lockDialog} isMobile password={passwordInput} confirmPassword={confirmPasswordInput} visibility={lockVisibility} error={dialogError} submitting={isDialogSubmitting} onPasswordChange={setPasswordInput} onConfirmPasswordChange={setConfirmPasswordInput} onVisibilityChange={setLockVisibility} onClose={closeDialog} onSubmit={handleDialogSubmit} onRemoveLock={handleDialogSubmit} />
      </>
    );
  }

  return (
    <>
      <aside className="fixed left-0 top-16 hidden h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-black lg:flex">{sidebarShell}</aside>
      <ChatActionMenu menu={actionMenu} isMobile={false} busyUserId={activeBusyUserId} onClose={() => setActionMenu(null)} onAction={handleMenuAction} />
      <ChatPasswordDialog dialog={lockDialog} isMobile={false} password={passwordInput} confirmPassword={confirmPasswordInput} visibility={lockVisibility} error={dialogError} submitting={isDialogSubmitting} onPasswordChange={setPasswordInput} onConfirmPasswordChange={setConfirmPasswordInput} onVisibilityChange={setLockVisibility} onClose={closeDialog} onSubmit={handleDialogSubmit} onRemoveLock={handleDialogSubmit} />
    </>
  );
}

export const MobileSidebarToggle: React.FC<{
  onClick: () => void;
  selectedUser: User | null;
  onBack?: () => void;
}> = ({ onClick, selectedUser, onBack }) => {
  if (selectedUser) {
    return (
      <button
        onClick={onBack}
        className="flex-shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-800 lg:hidden"
        aria-label="Back to chats"
      >
        <ArrowLeft size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-800 lg:hidden"
      aria-label="Open chats"
    >
      <Menu size={20} />
    </button>
  );
};
