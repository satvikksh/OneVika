"use client";

import React, { useState, useRef } from "react";
import { Message } from "../types/socket";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Reply,
  Copy,
  Forward,
  Pin,
  Star,
  Flag,
  Trash2,
  X,
} from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  senderName?: string;
  showStatus?: boolean;
  isGrouped?: boolean;
  onAction?: (action: string, message: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  onContextMenu,
  senderName,
  showStatus = true,
  isGrouped = false,
  onAction,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const formatMessageTime = (ts?: string) => {
    if (!ts) return "";
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return "";
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimerRef.current = setTimeout(() => {
      onContextMenu(e, message);
      // Haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      setIsQuickMenuOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    touchStartRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimerRef.current && touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // Cancel long press if finger moves too much
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        touchStartRef.current = null;
      }
    }
  };

  const handleQuickAction = (action: string) => {
    if (onAction) {
      onAction(action, message);
    }
    setIsQuickMenuOpen(false);
  };

  const quickActions = [
    { action: "reply", icon: Reply, label: "Reply", color: "text-blue-500" },
    { action: "copy", icon: Copy, label: "Copy", color: "text-green-500" },
    { action: "forward", icon: Forward, label: "Forward", color: "text-blue-500" },
  // { action: "pin", icon: Pin, label: message.isPinned ? "Unpin" : "Pin", color: "text-amber-500" },
  ];

  return (
    <div
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} ${
        isGrouped ? "mb-1" : "mb-3"
      } relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative max-w-[85%] sm:max-w-[75%]">
        {/* Message Bubble */}
        <div
          ref={bubbleRef}
          className={`px-3 sm:px-4 py-2 rounded-2xl transition-all duration-200 relative ${
            isCurrentUser
              ? "bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-br-sm"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700"
          }
        //    {message.failed ? "opacity-70" : ""} $
           ${
            isHovered ? "shadow-lg" : ""
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, message);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* Sender name for group chats */}
          {!isCurrentUser && senderName && !isGrouped && (
            <div className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">
              {senderName}
            </div>
          )}

          {/* Reply preview */}
          {/* {message.replyTo && ( */}
            <div className={`mb-2 pl-2 border-l-2 ${
              isCurrentUser 
                ? "border-blue-300" 
                : "border-blue-500"
            }`}>
              <div className="text-xs opacity-75 mb-0.5">
                {/* Replying to {message.replyTo.senderId === message.senderId ? "yourself" : senderName} */}
              </div>
              <div className="text-xs opacity-90 truncate">
                {/* {message.replyTo.text} */}
              </div>
            </div>
          {/* )} */}

          {/* Message content */}
          <p className="break-words whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
            {message.text}
          </p>

          {/* Message metadata */}
          <div className="flex items-center justify-end mt-1 space-x-1.5 text-xs">
            <span className={isCurrentUser ? "text-blue-200" : "text-gray-500"}>
              {message.timestamp.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                
            </span>
{/*             
            {isCurrentUser && showStatus && (
              <>
                {message.failed ? (
                  <span className="text-red-300 text-xs">✗</span>
                ) : message.read ? (
                  <CheckCheck size={14} className="text-blue-300" />
                ) : (
                  <Check size={14} className="text-gray-300" />
                )}
              </>
            )} */}
          </div>

          {/* Pinned indicator */}
          {/* {message.isPinned && (
            <div className={`absolute -top-1 -left-1 p-1 rounded-full ${
              isCurrentUser ? "bg-blue-500" : "bg-blue-500"
            }`}>
              <Pin size={10} className="text-white" />
            </div>
          )} */}

          {/* Starred indicator */}
          {/* {message.isStarred && (
            <div className={`absolute -top-1 -right-1 p-1 rounded-full ${
              isCurrentUser ? "bg-blue-500" : "bg-blue-500"
            }`}>
              <Star size={10} className="text-white" />
            </div>
          )} */}
        </div>

        {/* Quick actions on hover (desktop only) */}
        {isHovered && !('ontouchstart' in window) && (
          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 $ ${isCurrentUser ? "right-full mr-2" : "left-full ml-2"}`}>
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleQuickAction(action.action)}
                className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                title={action.label}
              >
                <action.icon size={14} className={action.color} />
              </button>
            ))}
            <button
              onClick={(e) => onContextMenu(e, message)}
              className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
              title="More options"
            >
              <ChevronDown size={14} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}

        {/* Mobile Quick Actions Menu (Bottom Sheet) */}
        {isQuickMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsQuickMenuOpen(false)}
            />
            
            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl lg:hidden">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Message preview */}
              <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Message</div>
                <div className="text-sm line-clamp-2 text-gray-900 dark:text-white">
                  {message.text}
                </div>
              </div>

              {/* Menu items */}
              <div className="p-4 pb-safe">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {quickActions.map((item) => (
                    <button
                      key={item.action}
                      onClick={() => handleQuickAction(item.action)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
                    >
                      <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
                
                <div className="space-y-1">
                  {!isCurrentUser && (
                    <button
                      onClick={() => handleQuickAction("report")}
                      className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-98 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Flag className="w-5 h-5 mr-3 text-red-500" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        Report
                      </span>
                    </button>
                  )}
                  {isCurrentUser && (
                    <button
                      onClick={() => handleQuickAction("delete")}
                      className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-98 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-5 h-5 mr-3 text-red-500" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        Delete
                      </span>
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-98"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Failed message retry button */}
      {/* {message.failed && (
        <button
          onClick={() => handleQuickAction("retry")}
          className="ml-2 p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
          title="Retry sending"
        >
          <span className="text-xs font-medium">↻</span>
        </button>
      )} */}

      {/* Edit indicator */}
      {/* {message.edited && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 self-end">
          edited
        </span>
      )} */}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
        }

        /* Smooth transitions */
        .group:hover .group-hover\\:opacity-100 {
          opacity: 1;
        }

        /* Long press animation */
        @keyframes longPress {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }

        .message-bubble:active {
          animation: longPress 0.5s ease;
        }
      `}</style>
    </div>
  );
};

// Additional helper components

interface MessageReactionProps {
  emoji: string;
  count: number;
  userReacted: boolean;
  onReactionClick: (emoji: string) => void;
}

export const MessageReaction: React.FC<MessageReactionProps> = ({
  emoji,
  count,
  userReacted,
  onReactionClick,
}) => {
  return (
    <button
      onClick={() => onReactionClick(emoji)}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
        userReacted
          ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      <span>{emoji}</span>
      <span className={userReacted ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
        {count}
      </span>
    </button>
  );
};

interface MessageStatusProps {
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status, timestamp }) => {
  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />;
      case "sent":
        return <Check size={12} className="text-gray-400" />;
      case "delivered":
        return <CheckCheck size={12} className="text-gray-400" />;
      case "read":
        return <CheckCheck size={12} className="text-blue-500" />;
      case "failed":
        return <span className="text-red-500 text-xs">✗</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-1">
      {timestamp && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {getStatusIcon()}
    </div>
  );
};

interface MessageForwardedProps {
  fromName: string;
}

export const MessageForwarded: React.FC<MessageForwardedProps> = ({ fromName }) => {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
      <Forward size={10} />
      <span>Forwarded from {fromName}</span>
    </div>
  );
};

export default MessageBubble;