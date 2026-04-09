"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Message } from "../types/socket";
import {
  Copy,
  Download,
  Link,
  MessageSquareReply,
  Star,
  Trash2,
  X,
} from "lucide-react";

interface ContextMenuProps {
  message: Message;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: string, message: Message) => void;
  isCurrentUser: boolean;
  isMobile?: boolean;
  className?: string;
}

type MenuItem = {
  id: string;
  label: string;
  description: string;
  action: string;
  danger?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ContextMenu: React.FC<ContextMenuProps> = ({
  message,
  position,
  onClose,
  onAction,
  isCurrentUser,
  isMobile = false,
  className = "",
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  const messagePreview =
    message.text ||
    message.attachments?.[0]?.fileName ||
    message.content ||
    "Media message";

  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        id: "reply",
        label: "Reply",
        description: "Reply to this message",
        action: "reply",
        icon: MessageSquareReply,
      },
      {
        id: "copy",
        label: "Copy text",
        description: "Copy the message content",
        action: "copy",
        icon: Copy,
      },
      {
        id: "copyLink",
        label: "Copy link",
        description: "Copy a direct link to this message",
        action: "copyLink",
        icon: Link,
      },
      {
        id: "toggleStar",
        label: message.isStarred ? "Unstar message" : "Star message",
        description: message.isStarred
          ? "Remove this message from your starred list"
          : "Save this message to your starred list",
        action: "toggleStar",
        icon: Star,
      },
      ...(message.attachments?.[0]?.url
        ? [
            {
              id: "download",
              label: "Download",
              description: "Download the attached media or file",
              action: "download",
              icon: Download,
            } satisfies MenuItem,
          ]
        : []),
      {
        id: "deleteSelf",
        label: "Delete for me",
        description: "Remove this message from your view only",
        action: "deleteSelf",
        danger: true,
        icon: Trash2,
      },
      ...(isCurrentUser
        ? [
            {
              id: "deleteEveryone",
              label: "Delete for everyone",
              description: "Remove this message for both people",
              action: "deleteEveryone",
              danger: true,
              icon: Trash2,
            } satisfies MenuItem,
          ]
        : []),
    ],
    [isCurrentUser, message.attachments, message.isStarred]
  );

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    if (isMobile) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      if (isMobile) {
        document.body.style.overflow = "";
      }
    };
  }, [handleClose, isMobile]);

  const handleAction = (action: string) => {
    onAction(action, message);
    handleClose();
  };

  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
            isAnimating ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleClose}
        />
        <div
          ref={menuRef}
          className={`fixed bottom-0 left-0 right-0 z-[51] rounded-t-3xl bg-white shadow-2xl transition-transform duration-200 dark:bg-gray-950 ${
            isAnimating ? "translate-y-0" : "translate-y-full"
          } ${className}`}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>

          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Message actions
                </div>
                <div className="mt-1 max-w-[240px] truncate text-sm text-gray-900 dark:text-white">
                  {messagePreview}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAction(item.action)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    item.danger
                      ? "border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                      : "border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
                      item.danger
                        ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-white text-blue-600 dark:bg-gray-800 dark:text-blue-300"
                    }`}
                  >
                    <item.icon size={18} />
                  </div>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="safe-area-bottom h-4" />
        </div>
      </>
    );
  }

  const left = Math.min(position.x, window.innerWidth - 320);
  const top = Math.min(position.y, window.innerHeight - 360);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={handleClose} />
      <div
        ref={menuRef}
        className={`fixed z-50 min-w-[280px] max-w-[320px] origin-top-left rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-150 dark:border-gray-800 dark:bg-gray-950 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } ${className}`}
        style={{ left, top }}
      >
        <div className="border-b border-gray-100 px-3 py-3 dark:border-gray-800">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Message actions
          </div>
          <div className="mt-1 truncate text-sm text-gray-900 dark:text-white">
            {messagePreview}
          </div>
        </div>

        <div className="p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleAction(item.action)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                item.danger
                  ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
                  : "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-900"
              }`}
            >
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                  item.danger
                    ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                }`}
              >
                <item.icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-medium">{item.label}</div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ContextMenu;
