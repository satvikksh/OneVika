// ChatArea.tsx
"use client";

import React, { useCallback, useEffect, useLayoutEffect } from "react";
import { ChatAttachment, Message, User } from "../types/socket";
import { Session } from "next-auth";
import {
  AudioLines,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Smile,
  X,
} from "lucide-react";

interface ChatAreaProps {
  selectedUser: User | null;
  loadingInitialMessages: boolean;
  loadingOlderMessages: boolean;
  syncingMessages: boolean;
  hasMoreMessages: boolean;
  messageError: string | null;
  onLoadOlderMessages: () => void;
  newMessage: string;
  messages: Message[];
  showHiddenMessages: boolean;
  hiddenMessagesCount: number;
  selectedMessageIds: string[];
  onStartMessageSelection: (message: Message) => void;
  onToggleMessageSelection: (message: Message) => void;
  setNewMessage: (message: string) => void;
  sendingMessage: boolean;
  handleTyping: () => void;
  handleInputFocus: () => void;
  handleInputBlur: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: () => void;
  handleFileChange: (file: File | null) => void;
  pendingAttachment: {
    previewUrl: string;
    type: "image" | "video" | "audio" | "file";
    mimeType: string;
    fileName: string;
    size: number;
  } | null;
  clearPendingAttachment: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  handleEmojiClick: (emoji: string) => void;
  commonEmojis: string[];
  handleMessageContextMenu: (
    e: React.MouseEvent | React.TouchEvent | { x: number; y: number },
    message: Message
  ) => void;
  handleDropdownClick: (e: React.MouseEvent, message: Message) => void;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hoveredMessageId: string | null;
  setHoveredMessageId: (id: string | null) => void;
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  session: Session | null;
  isMobile: boolean;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  isConnected?: boolean; // Optional for connection status
  isChatBlocked?: boolean;
}

const formatFileSize = (size?: number) => {
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const renderMessageText = (value: string) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = value.split(urlPattern);

  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/i.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all text-inherit underline underline-offset-2"
        >
          {part}
        </a>
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
};

const renderAttachment = (attachment?: ChatAttachment) => {
  if (!attachment?.url) return null;
  const targetHref = attachment.targetUrl || attachment.url;
  const isFeedShare = attachment.source === "feed" && Boolean(attachment.targetUrl);

  if (attachment.type === "image") {
    return (
      <a
        href={targetHref}
        target={isFeedShare ? undefined : "_blank"}
        rel={isFeedShare ? undefined : "noreferrer"}
        className="mb-2 block w-full max-w-[280px]"
      >
        <img
          src={attachment.url}
          alt={attachment.fileName || "Image attachment"}
          className="block max-h-72 w-full rounded-xl object-cover"
        />
      </a>
    );
  }

  if (attachment.type === "video") {
    if (isFeedShare) {
      return (
        <a
          href={targetHref}
          target={undefined}
          rel={undefined}
          className="relative mb-2 block w-full max-w-[280px] overflow-hidden rounded-xl"
        >
          <video
            src={attachment.url}
            muted
            playsInline
            loop
            autoPlay
            className="block max-h-72 w-full rounded-xl bg-black object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
              Open in feed
            </div>
          </div>
        </a>
      );
    }

    return (
      <video
        src={attachment.url}
        controls
        className="mb-2 block max-h-72 w-full max-w-[280px] rounded-xl bg-black"
      />
    );
  }

  if (attachment.type === "audio") {
    return (
      <div className="mb-2 rounded-xl bg-black/10 px-3 py-3 dark:bg-white/10">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <AudioLines size={16} />
          <span className="truncate">{attachment.fileName || "Audio file"}</span>
        </div>
        <audio src={attachment.url} controls className="w-full" />
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="mb-2 flex w-full max-w-[280px] items-center gap-3 rounded-xl bg-black/10 px-3 py-3 dark:bg-white/10"
    >
      <FileText size={18} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {attachment.fileName || "Attachment"}
        </div>
        <div className="text-xs opacity-75">{formatFileSize(attachment.size)}</div>
      </div>
    </a>
  );
};

const MessageStatusIndicator = ({
  status,
  isCurrentUser,
}: {
  status?: "sending" | "sent" | "delivered" | "read";
  isCurrentUser: boolean;
}) => {
  
  if (!isCurrentUser || !status) return null;

  return (
    <div className="flex items-center justify-end ml-2">
      {status === 'sending' && (
        <div className="flex items-center text-sky-600">
          <Check size={12} />
        </div>
      )}
      {status === 'sent' && (
        <div className="flex items-center text-sky-600">
          <Check size={12} />
        </div>
      )}
      {status === 'delivered' && (
        <div className="flex items-center text-amber-700 dark:text-amber-500">
          <CheckCheck size={12} />
        </div>
      )}
      {status === 'read' && (
        <div className="flex items-center text-emerald-600 dark:text-emerald-400">
          <CheckCheck size={12} />
        </div>
      )}
    </div>
  );
};

function ChatArea({
  selectedUser,
  loadingInitialMessages,
  loadingOlderMessages,
  syncingMessages,
  hasMoreMessages,
  messageError,
  onLoadOlderMessages,
  messages = [],
  showHiddenMessages,
  hiddenMessagesCount,
  selectedMessageIds,
  onStartMessageSelection,
  onToggleMessageSelection,
  newMessage,
  setNewMessage,
  sendingMessage,
  handleTyping,
  handleInputFocus,
  handleInputBlur,
  inputRef,
  fileInputRef,
  handleFileSelect,
  handleFileChange,
  pendingAttachment,
  clearPendingAttachment,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  handleEmojiClick,
  commonEmojis,
  handleMessageContextMenu,
  handleDropdownClick,
  replyTo,
  setReplyTo,
  messagesEndRef,
  hoveredMessageId,
  setHoveredMessageId,
  activeDropdownId,
  setActiveDropdownId,
  dropdownRef,
  session,
  isMobile,
  handleKeyDown,
  onSendMessage,
  isConnected = true, // Default to true for backward compatibility
  isChatBlocked = false,
}: ChatAreaProps) {
  const currentUserId = session?.user?.id;
  const selectedMessageIdSet = React.useMemo(
    () => new Set(selectedMessageIds),
    [selectedMessageIds]
  );
  const isSelectionMode = selectedMessageIds.length > 0;
  const longPressTimerRef = React.useRef<number | null>(null);
  const touchOriginRef = React.useRef<{ x: number; y: number } | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const previousMessageIdsRef = React.useRef<string[]>([]);
  const previousSelectedUserIdRef = React.useRef<string | null>(null);
  const previousScrollMetricsRef = React.useRef({
    scrollHeight: 0,
    scrollTop: 0,
    clientHeight: 0,
  });
  const [pressedMessageId, setPressedMessageId] = React.useState<string | null>(null);

  // Handle enter key for sending
  const handleKeyDownOverride = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleKeyDown(e);
  };

  // Handle send button click
  const handleSendClick = () => {
    onSendMessage();
  };

  const captureScrollMetrics = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    previousScrollMetricsRef.current = {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
    };
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const currentMessageIds = messages.map((message) => message.id);
    const currentSelectedUserId = selectedUser?.id ?? null;

    if (!container) {
      previousMessageIdsRef.current = currentMessageIds;
      previousSelectedUserIdRef.current = currentSelectedUserId;
      return;
    }

    const previousMessageIds = previousMessageIdsRef.current;
    const previousSelectedUserId = previousSelectedUserIdRef.current;
    const previousMetrics = previousScrollMetricsRef.current;
    const conversationChanged = previousSelectedUserId !== currentSelectedUserId;
    const prependedMessages =
      previousMessageIds.length > 0 &&
      currentMessageIds.length > previousMessageIds.length &&
      previousMessageIds[0] !== currentMessageIds[0] &&
      previousMessageIds[previousMessageIds.length - 1] ===
        currentMessageIds[currentMessageIds.length - 1];
    const appendedMessages =
      previousMessageIds.length > 0 &&
      currentMessageIds.length > previousMessageIds.length &&
      previousMessageIds[previousMessageIds.length - 1] !==
        currentMessageIds[currentMessageIds.length - 1];
    const firstMessageLoad =
      previousMessageIds.length === 0 && currentMessageIds.length > 0;
    const distanceFromBottom =
      previousMetrics.scrollHeight -
      (previousMetrics.scrollTop + previousMetrics.clientHeight);
    const wasNearBottom = distanceFromBottom < 120;
    const latestMessage = messages[messages.length - 1];
    const shouldStickToBottom =
      wasNearBottom || latestMessage?.senderId === currentUserId;

    if (conversationChanged || firstMessageLoad) {
      container.scrollTop = container.scrollHeight;
    } else if (prependedMessages) {
      const heightDelta = container.scrollHeight - previousMetrics.scrollHeight;
      container.scrollTop = previousMetrics.scrollTop + heightDelta;
    } else if (appendedMessages && shouldStickToBottom) {
      container.scrollTop = container.scrollHeight;
    }

    previousMessageIdsRef.current = currentMessageIds;
    previousSelectedUserIdRef.current = currentSelectedUserId;
    previousScrollMetricsRef.current = {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
    };
  }, [messages, selectedUser?.id, currentUserId]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchOriginRef.current = null;
    setPressedMessageId(null);
  }, []);

  useEffect(() => () => cancelLongPress(), [cancelLongPress]);

  const showInitialConversationLoader =
    Boolean(selectedUser) && loadingInitialMessages && messages.length === 0;
  const isComposerDisabled = isChatBlocked || isSelectionMode;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-black">
      {/* Connection Status Indicator (optional) */}
      {/* {isConnected !== undefined && (
        <div className={`px-4 py-2 text-xs text-center ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isConnected ? 'Connected' : 'Disconnected'} • Messages update in real-time
        </div>
      )}
       */}
      {/* Main Messages Area - Takes remaining space */}
      <div
        ref={scrollContainerRef}
        onScroll={captureScrollMetrics}
        className={`flex-1 overflow-y-auto ${selectedUser ? 'pb-24' : ''} lg:ml-80`}
      >
        {selectedUser ? (
            <div className="space-y-3 p-4">
              {showHiddenMessages ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  Hidden message view is on. Hidden messages stay highlighted until you unhide them.
                </div>
              ) : hiddenMessagesCount > 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                  {hiddenMessagesCount} hidden {hiddenMessagesCount === 1 ? "message is" : "messages are"} filtered from this chat.
                </div>
              ) : null}

              {showInitialConversationLoader ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Loading messages...
                </div>
              ) : null}
              {(hasMoreMessages || loadingOlderMessages) && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={onLoadOlderMessages}
                    disabled={loadingOlderMessages}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {loadingOlderMessages ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading older messages...
                      </>
                    ) : (
                      "Load older messages"
                    )}
                  </button>
                </div>
              )}

              {messageError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  {messageError}
                </div>
              )}

              {syncingMessages && messages.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking for new messages...
                </div>
              )}

              {!showInitialConversationLoader && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="text-gray-400 mb-4">💬</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {hiddenMessagesCount > 0 && !showHiddenMessages
                      ? "All visible messages are hidden. Use the menu to reveal them."
                      : "No messages yet. Start a conversation!"}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = msg.senderId === currentUserId;
                  const isHiddenMessage = Boolean(msg.isHidden);
                  const isSelected = selectedMessageIdSet.has(msg.id);
                  const hasAttachment = Boolean(msg.attachments?.[0]?.url);
                  const hasText = Boolean(msg.text || msg.content);
                  const bubbleBaseClasses = isCurrentUser
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none";
                  const hiddenBubbleClasses =
                    showHiddenMessages && isHiddenMessage
                      ? isCurrentUser
                        ? "bg-blue-500/85 text-white ring-1 ring-amber-200/70"
                        : "border border-dashed border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
                      : bubbleBaseClasses;

                  const startMessageLongPress = (touch: React.Touch) => {
                    if (!isMobile || isSelectionMode) return;

                    touchOriginRef.current = {
                      x: touch.clientX,
                      y: touch.clientY,
                    };
                    setPressedMessageId(msg.id);

                    longPressTimerRef.current = window.setTimeout(() => {
                      onStartMessageSelection(msg);
                      setPressedMessageId(null);
                      if ("vibrate" in navigator) {
                        navigator.vibrate(16);
                      }
                    }, 600);
                  };
                  
                  return (
                    <div
                      key={msg.id}
                      id={`message-${msg.id}`}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div
                        className={`group flex items-start gap-2 ${
                          isCurrentUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        {isSelectionMode ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleMessageSelection(msg);
                            }}
                            className={`mt-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-900"
                            }`}
                            aria-label={isSelected ? "Deselect message" : "Select message"}
                          >
                            <Check size={14} />
                          </button>
                        ) : null}

                        <div
                          className={`relative ${
                            hasAttachment ? "max-w-[320px] w-full" : "max-w-[70%] w-fit"
                          }`}
                        >
                          {/* Message Bubble */}
                          <div
                            className={`rounded-2xl ${
                              hasAttachment && !hasText ? "px-2 py-2" : "px-4 py-3"
                            } ${hiddenBubbleClasses} ${msg.status === 'sending' ? 'opacity-80' : ''} ${
                              pressedMessageId === msg.id ? "ring-2 ring-blue-400/60" : ""
                            } ${
                              isSelected
                                ? isCurrentUser
                                  ? "ring-2 ring-emerald-300 shadow-lg"
                                  : "bg-emerald-50 ring-2 ring-emerald-500 shadow-lg dark:bg-emerald-950/30"
                                : ""
                            } ${
                              isSelectionMode || !isMobile ? "cursor-pointer" : ""
                            }`}
                            onClick={(event) => {
                              if (isSelectionMode) {
                                event.preventDefault();
                                onToggleMessageSelection(msg);
                                return;
                              }

                              if (!isMobile) {
                                event.preventDefault();
                                onStartMessageSelection(msg);
                              }
                            }}
                            onContextMenu={(e) => {
                              if (isSelectionMode) {
                                e.preventDefault();
                                return;
                              }

                              handleMessageContextMenu(e, msg);
                            }}
                            onTouchStart={(event) => {
                              if (isSelectionMode) return;

                              const touch = event.touches[0];
                              if (touch) {
                                startMessageLongPress(touch);
                              }
                            }}
                            onTouchEnd={() => cancelLongPress()}
                            onTouchCancel={() => cancelLongPress()}
                            onTouchMove={(event) => {
                              const touch = event.touches[0];
                              if (!touchOriginRef.current || !touch) return;
                              const deltaX = Math.abs(touch.clientX - touchOriginRef.current.x);
                              const deltaY = Math.abs(touch.clientY - touchOriginRef.current.y);
                              if (deltaX > 12 || deltaY > 12) {
                                cancelLongPress();
                              }
                            }}
                          >
                            {showHiddenMessages && isHiddenMessage ? (
                              <div className="mb-2 inline-flex rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
                                Hidden
                              </div>
                            ) : null}

                            {/* Reply indicator */}
                            {msg.replyToId && (
                              <div className="mb-2 rounded-lg border-l-4 border-blue-400 bg-black/10 p-2 dark:bg-white/10">
                                <p className="text-xs italic opacity-75">Replying to a message</p>
                              </div>
                            )}

                            {renderAttachment(msg.attachments?.[0])}
                            {(msg.text || msg.content) && (
                              <div className="break-words whitespace-pre-wrap">
                                {renderMessageText(msg.text || msg.content || "")}
                              </div>
                            )}

                            {/* Message timestamp and status */}
                            <div className="mt-1 flex items-center justify-end">
                              <span className="mr-2 text-xs opacity-75">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>

                              {/* Read/unread indicators */}
                              {isCurrentUser && (
                                <MessageStatusIndicator
                                  isCurrentUser={isCurrentUser}
                                  status={msg.status}
                                />
                              )}
                            </div>
                          </div>

                          {/* Dropdown Arrow (only shows on hover) */}
                          {!isMobile && !isSelectionMode && (hoveredMessageId === msg.id || activeDropdownId === msg.id) && (
                            <div
                              ref={dropdownRef}
                              className={`absolute ${isCurrentUser ? 'left-0 -translate-x-8' : 'right-0 translate-x-8'} top-1/2 -translate-y-1/2`}
                            >
                              <button
                                onClick={(e) => {
                                  setActiveDropdownId(msg.id);
                                  handleDropdownClick(e, msg);
                                }}
                                className="rounded-full bg-white p-1 shadow-md transition-shadow hover:shadow-lg dark:bg-gray-800"
                                aria-label="Message options"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-12 w-12 text-gray-400 mx-auto mb-4">💬</div>
              <p className="text-gray-500 dark:text-gray-400">
                Select a chat to start messaging
              </p>
              {isConnected !== undefined && !isConnected && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                  Reconnecting to server...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom within chat area */}
      {selectedUser && (
        <div className="fixed bottom-0 left-0 lg:left-80 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
          {isSelectionMode ? (
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              Selection mode is active. Use the top bar actions or clear the selection to resume chatting.
            </div>
          ) : isChatBlocked ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              Messaging is disabled for this chat until the user is unblocked.
            </div>
          ) : null}
          {/* Reply Preview */}
          {replyTo && !isSelectionMode && (
            <div className="px-4 pt-3 bg-gradient-to-r from-blue-50 to-pink-50 dark:from-blue-900/20 dark:to-pink-900/20 border-b border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Replying to</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{replyTo.text || replyTo.content}</p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="ml-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-black rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Input Form */}
          <div className="p-4">
            <div className="flex items-end space-x-3">
              {/* Left Sidebar for additional actions */}
              <div className="flex items-center space-x-2">
                {/* File Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileChange(file);
                    }
                    e.target.value = "";
                  }}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  type="button"
                  onClick={handleFileSelect}
                  disabled={isComposerDisabled}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-black rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Attach file"
                >
                  <Paperclip size={20} />
                </button>
                
                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={isComposerDisabled}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-black rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Emoji"
                  >
                    <Smile size={20} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-full left-0 mb-6 bg-white dark:bg-black rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 w-105 z-50 animate-fadeIn"
                    >
                      <div className="grid grid-cols-5 gap-4">
                        {commonEmojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-2xl w-12 h-12"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Text Area with Send Button on Side */}
              <div className="flex-1 flex items-end space-x-3">
                <div className="flex-1 relative">
                  {pendingAttachment && (
                    <div className="mb-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {pendingAttachment.fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {pendingAttachment.mimeType || pendingAttachment.type} • {formatFileSize(pendingAttachment.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearPendingAttachment}
                          className="rounded-full p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                          aria-label="Remove attachment"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {pendingAttachment.type === "image" && (
                        <img
                          src={pendingAttachment.previewUrl}
                          alt={pendingAttachment.fileName}
                          className="max-h-40 rounded-xl object-cover"
                        />
                      )}
                      {pendingAttachment.type === "video" && (
                        <video
                          src={pendingAttachment.previewUrl}
                          controls
                          className="max-h-40 rounded-xl bg-black"
                        />
                      )}
                      {pendingAttachment.type === "audio" && (
                        <audio src={pendingAttachment.previewUrl} controls className="w-full" />
                      )}
                    </div>
                  )}

                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={handleKeyDownOverride}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={isSelectionMode ? "Selection mode active" : isChatBlocked ? "Unblock this user to send messages" : "Type a message..."}
                    disabled={isComposerDisabled}
                    className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ minHeight: '30px', maxHeight: '50px' }}
                  />
                </div>
                
                {/* Send Button on Side */}
                <button
                  type="button"
                  onClick={handleSendClick}
                  disabled={isComposerDisabled || sendingMessage || (!newMessage.trim() && !pendingAttachment) || (isConnected !== undefined && !isConnected)}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  {sendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
            {isConnected !== undefined && !isConnected && (
              <p className="text-xs text-red-500 mt-2 text-center">
                Unable to send messages. Reconnecting...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ChatArea);
