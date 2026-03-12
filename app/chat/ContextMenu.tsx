"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Message } from "../types/socket";
import {
  Reply,
  Copy,
  Forward,
  Pin,
  Star,
  Flag,
  Trash2,
  Edit,
  Bookmark,
  Archive,
  Share2,
  Download,
  User,
  CheckCircle,
  Link,
  X,
  ChevronRight,
  Check,
  BookOpen,
  MessageSquare,
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

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  action: string;
  hasSubMenu?: boolean;
  danger?: boolean;
}

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
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showSubMenu, setShowSubMenu] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Prevent scrolling when context menu is open on mobile
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      
      if (isMobile) {
        document.body.style.overflow = '';
      }
    };
  }, [isMobile, handleClose]);

  const handleAction = (action: string) => {
    onAction(action, message);
    handleClose();
  };

  const toggleSelect = (item: string) => {
    setSelectedItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  // Base menu items for all users
  const baseMenuItems: MenuItem[] = [
    {
      id: "reply",
      icon: Reply,
      label: "Reply",
      description: "Reply to this message",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      action: "reply"
    },
    {
      id: "copy",
      icon: Copy,
      label: "Copy text",
      description: "Copy message text",
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      action: "copy"
    },
    {
      id: "forward",
      icon: Forward,
      label: "Forward",
      description: "Forward to other chats",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      action: "forward",
      hasSubMenu: true
    },
    {
      id: "pin",
      icon: Pin,
      label: "Pin message",
      description: "Pin this message",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      action: "pin"
    },
    {
      id: "star",
      icon: Star,
      label: "Star message",
      description: "Add to favorites",
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      action: "star"
    },
    {
      id: "bookmark",
      icon: Bookmark,
      label: "Save message",
      description: "Save for later",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      action: "bookmark"
    },
    {
      id: "link",
      icon: Link,
      label: "Copy link",
      description: "Copy message link",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      action: "copyLink"
    },
    {
      id: "share",
      icon: Share2,
      label: "Share",
      description: "Share outside app",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      action: "share"
    }
  ];

  // Current user specific items
  const currentUserItems: MenuItem[] = [
    {
      id: "edit",
      icon: Edit,
      label: "Edit message",
      description: "Edit this message",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      action: "edit"
    },
    {
      id: "delete",
      icon: Trash2,
      label: "Delete message",
      description: "Delete for everyone",
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      action: "delete",
      danger: true
    }
  ];

  // Other user specific items
  const otherUserItems: MenuItem[] = [
    {
      id: "report",
      icon: Flag,
      label: "Report message",
      description: "Report inappropriate content",
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      action: "report",
      danger: true
    },
    {
      id: "block",
      icon: User,
      label: "Block user",
      description: "Block this user",
      color: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-900/20",
      action: "block"
    }
  ];

  // Additional utility items
  const utilityItems: MenuItem[] = [
    {
      id: "select",
      icon: CheckCircle,
      label: "Select message",
      description: "Select for bulk actions",
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      action: "select"
    },
    {
      id: "info",
      icon: BookOpen,
      label: "Message info",
      description: "View delivery status",
      color: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-900/20",
      action: "info"
    },
    {
      id: "archive",
      icon: Archive,
      label: "Archive",
      description: "Move to archive",
      color: "text-gray-500",
      bgColor: "bg-gray-50 dark:bg-gray-900/20",
      action: "archive"
    },
    {
      id: "download",
      icon: Download,
      label: "Download",
      description: "Download attachments",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      action: "download"
    }
  ];

  // Get all menu items based on user
  const getAllMenuItems = () => {
    const items = [...baseMenuItems];
    
    if (isCurrentUser) {
      items.push(...currentUserItems);
    } else {
      items.push(...otherUserItems);
    }
    
    items.push(...utilityItems);
    return items;
  };

  const menuItems = getAllMenuItems();
  const messagePreview =
    message.text ||
    message.attachments?.[0]?.fileName ||
    message.content ||
    "Media message";

  // Forward submenu items
  const forwardSubMenuItems = [
    {
      id: "forward_contacts",
      icon: User,
      label: "To Contacts",
      color: "text-blue-500"
    },
    {
      id: "forward_groups",
      icon: Users,
      label: "To Groups",
      color: "text-green-500"
    },
    {
      id: "forward_channel",
      icon: MessageSquare,
      label: "To Channel",
      color: "text-blue-500"
    }
  ];

  // Mobile bottom sheet style
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 ${
            isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
        />
        
        {/* Bottom Sheet */}
        <div
          ref={menuRef}
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transform transition-transform duration-200 ${
            isAnimating ? 'translate-y-0' : 'translate-y-full'
          } ${className}`}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Message preview header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <MessageSquare size={16} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Message Options
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                    {messagePreview}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick actions grid */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-4 gap-3">
              {menuItems.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAction(item.action)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
                >
                  <div className={`p-2.5 rounded-full ${item.bgColor} ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                    {/* {item.label.split(' ')[0]} */}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Full menu items with search */}
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="p-2">
              {/* Search bar */}
              <div className="relative mb-2 px-2">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <SearchIcon className="text-gray-400" size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search actions..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Menu sections */}
              <div className="space-y-1">
                <div className="px-3 py-1.5">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Message Actions
                  </h4>
                </div>
                
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      item.hasSubMenu
                        ? setShowSubMenu(item.id)
                        : item.action === "select"
                          ? toggleSelect(item.id)
                          : handleAction(item.action)
                    }
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-98 ${
                      item.danger ? 'hover:text-red-600 dark:hover:text-red-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.bgColor}`}>
                        <item.icon size={18} className={item.color} />
                      </div>
                      <div className="text-left">
                        <span className={`block text-sm font-medium ${
                          item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {item.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    {item.hasSubMenu && (
                      <ChevronRight size={16} className="text-gray-400" />
                    )}
                    {selectedItems.includes(item.id) && (
                      <Check size={16} className="text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <button
                  onClick={() => handleAction('bulkAction')}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply to {selectedItems.length} items
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Safe area padding for mobile */}
          <div className="h-4 bg-transparent safe-area-bottom" />
        </div>

        {/* Submenu for forward */}
        {showSubMenu === 'forward' && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSubMenu(null)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Forward to
                  </h3>
                  <button
                    onClick={() => setShowSubMenu(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  {forwardSubMenuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAction(`forward_${item.id.split('_')[1]}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className={`p-2 rounded-lg ${item.color} bg-opacity-10`}>
                        <item.icon size={18} className={item.color} />
                      </div>
                      <span className="text-gray-900 dark:text-white">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop context menu
  return (
    <>
      {/* Backdrop (only for desktop with animation) */}
      <div 
        className="fixed inset-0 z-40"
        onClick={handleClose}
      />
      
      {/* Desktop Context Menu */}
      <div
        ref={menuRef}
        className={`fixed z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[280px] max-w-[320px] transform transition-all duration-150 origin-top-left ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } ${className}`}
        style={{
          left: `${Math.min(position.x, window.innerWidth - 320)}px`,
          top: `${Math.min(position.y, window.innerHeight - 400)}px`,
          maxHeight: 'calc(100vh - 40px)',
        }}
      >
        {/* Message preview header */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              <MessageSquare size={16} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Message</div>
              <div className="text-sm text-gray-900 dark:text-white truncate max-w-[220px]">
                {messagePreview}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-1 max-h-[60vh] overflow-y-auto">
          {/* Quick actions row */}
          <div className="flex p-2 border-b border-gray-100 dark:border-gray-800">
            {menuItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => handleAction(item.action)}
                className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={item.label}
              >
                <div className={`p-1.5 rounded-full ${item.bgColor}`}>
                  <item.icon size={16} className={item.color} />
                </div>
                {/* <span className="text-xs text-gray-700 dark:text-gray-300">{item.label.split(' ')[0]}</span> */}
              </button>
            ))}
          </div>

          {/* Full menu list */}
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  item.hasSubMenu
                    ? setShowSubMenu(item.id)
                    : item.action === "select"
                      ? toggleSelect(item.id)
                      : handleAction(item.action)
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group ${
                  item.danger ? 'hover:text-red-600 dark:hover:text-red-400' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                    <item.icon size={16} className={item.color} />
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${
                      item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.label}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                      {item.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {item.hasSubMenu && (
                    <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                  )}
                  {selectedItems.includes(item.id) && (
                    <Check size={14} className="text-green-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer with selected count */}
        {selectedItems.length > 0 && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => handleAction('bulkAction')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Apply to {selectedItems.length} selected
            </button>
          </div>
        )}

        {/* Submenu for forward (desktop) */}
        {showSubMenu === 'forward' && (
          <div
            className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[200px] z-10"
            style={{ maxHeight: '300px' }}
          >
            <div className="p-2">
              <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Forward to</h4>
              </div>
              <div className="space-y-0.5">
                {forwardSubMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleAction(`forward_${item.id.split('_')[1]}`);
                      setShowSubMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                  >
                    <item.icon size={16} className={item.color} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Search icon component
const SearchIcon = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

// Users icon for forward submenu
const Users = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// Export the component
export default ContextMenu;

// Additional hook for using context menu
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);

  const openContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    message: Message
  ) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX, clientY;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setContextMenu({
      message,
      position: { x: clientX, y: clientY },
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
  };
};

// Simple context menu for quick actions (minimal version)
export const QuickContextMenu: React.FC<Omit<ContextMenuProps, 'isMobile'>> = ({
  message,
  position,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const quickActions = [
    { icon: Reply, label: "Reply", action: "reply", color: "text-blue-500" },
    { icon: Copy, label: "Copy", action: "copy", color: "text-green-500" },
    { icon: Forward, label: "Forward", action: "forward", color: "text-blue-500" },
    { icon: Trash2, label: "Delete", action: "delete", color: "text-red-500", danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] py-1 animate-scaleIn"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {quickActions.map((item) => (
        <button
          key={item.action}
          onClick={() => {
            onAction(item.action, message);
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
            item.danger ? 'hover:text-red-600 dark:hover:text-red-400' : ''
          }`}
        >
          <item.icon size={16} className={item.color} />
          <span className={`text-sm ${
            item.danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};

// Message info panel component (can be used with context menu)
export const MessageInfoPanel: React.FC<{
  message: Message;
  onClose: () => void;
}> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Message Info
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Message preview */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-900 dark:text-white">
                {message.text || message.attachments?.[0]?.fileName || message.content || "Media message"}
              </p>
            </div>
            
            {/* Status info */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Delivery Status
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  {/* <span className={`text-sm font-medium ${statusInfo[message.status || 'sent']?.color}`}>
                    {statusInfo[message.status || 'sent']?.label}
                  </span> */}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sent</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                </div>
                {message.read && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Read</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {/* {new Date(message.read).toLocaleString()} */}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Message ID */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Message ID</span>
                <button
                  onClick={() => navigator.clipboard.writeText(message.id)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Copy ID
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                {message.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Animation styles
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }

  .animate-slideUp {
    animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .animate-scaleIn {
    animation: scaleIn 0.15s ease-out;
  }

  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(107, 114, 128, 0.7);
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
