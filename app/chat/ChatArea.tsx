// ChatArea.tsx
"use client";

import React, { useEffect } from "react";
import { Message, User } from "../types/socket";
import { Session } from "next-auth";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Loader2,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";

interface ChatAreaProps {
  selectedUser: User | null;
  loadingMessages: boolean;
  newMessage: string;
    messages: Message[];
  setNewMessage: (message: string) => void;
  sendingMessage: boolean;
  handleTyping: () => void;
  handleInputFocus: () => void;
  handleInputBlur: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  handleEmojiClick: (emoji: string) => void;
  commonEmojis: string[];
  handleMessageContextMenu: (
    e: React.MouseEvent | React.TouchEvent,
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
  messageStatus: Record<string, "sending" | "sent" | "delivered" | "read">;
  isMobile: boolean;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  isConnected?: boolean; // Optional for connection status
}

const MessageStatusIndicator = ({ 
  messageId, 
  isCurrentUser, 
  messageStatus 
}: { 
  messageId: string, 
  isCurrentUser: boolean,
  messageStatus: Record<string, 'sending' | 'sent' | 'delivered' | 'read'>
}) => {
  const status = messageStatus[messageId];
  
  if (!isCurrentUser || !status) return null;

  return (
    <div className="flex items-center justify-end ml-2">
      {status === 'sending' && (
        <div className="flex items-center text-gray-400">
          <Check size={12} />
        </div>
      )}
      {status === 'sent' && (
        <div className="flex items-center text-gray-400">
          <Check size={12} />
        </div>
      )}
      {status === 'delivered' && (
        <div className="flex items-center text-gray-400">
          <CheckCheck size={12} />
        </div>
      )}
      {status === 'read' && (
        <div className="flex items-center text-blue-500">
          <CheckCheck size={12} />
        </div>
      )}
    </div>
  );
};

export default function ChatArea({
  selectedUser,
  loadingMessages,
  messages = [],
  newMessage,
  setNewMessage,
  sendingMessage,
  handleTyping,
  handleInputFocus,
  handleInputBlur,
  inputRef,
  fileInputRef,
  handleFileSelect,
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
  messageStatus,
  isMobile,
  handleKeyDown,
  onSendMessage,
  isConnected = true, // Default to true for backward compatibility
}: ChatAreaProps) {
  const currentUserId = session?.user?.id;

  // Handle enter key for sending
  const handleKeyDownOverride = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isMobile && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    } else {
      handleTyping();
    }
  };

  // Handle send button click
  const handleSendClick = () => {
    onSendMessage();
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, messagesEndRef]);

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
      <div className={`flex-1 overflow-y-auto ${selectedUser ? 'pb-24' : ''} lg:ml-80`}>
        {selectedUser ? (
          loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="text-gray-400 mb-4">💬</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No messages yet. Start a conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = msg.senderId === currentUserId;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className="relative group max-w-[70%] w-fit">
                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            isCurrentUser
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                          } ${msg.status === 'sending' ? 'opacity-80' : ''}`}
                          onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                        >
                          {/* Reply indicator */}
                          {msg.replyToId && (
                            <div className="mb-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg border-l-4 border-blue-400">
                              <p className="text-xs italic opacity-75">Replying to a message</p>
                            </div>
                          )}
                          
                        <div>{msg.text || msg.content}</div>

                          
                          {/* Message timestamp and status */}
                          <div className="flex items-center justify-end mt-1">
                            <span className="text-xs opacity-75 mr-2">
                              {new Date(msg.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true 
                              })}
                            </span>
                            
                            {/* Read/unread indicators */}
                            {isCurrentUser && (
                              <MessageStatusIndicator 
                                messageId={msg.id}
                                isCurrentUser={isCurrentUser}
                                messageStatus={messageStatus}
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Dropdown Arrow (only shows on hover) */}
                        {(hoveredMessageId === msg.id || activeDropdownId === msg.id) && (
                          <div 
                            ref={dropdownRef}
                            className={`absolute ${isCurrentUser ? 'left-0 -translate-x-8' : 'right-0 translate-x-8'} top-1/2 -translate-y-1/2`}
                          >
                            <button
                              onClick={(e) => handleDropdownClick(e, msg)}
                              className="p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
                              aria-label="Message options"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )
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
          {/* Reply Preview */}
          {replyTo && (
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
                      console.log('Selected file:', file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={handleFileSelect}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-black rounded-lg transition-colors"
                  aria-label="Attach file"
                >
                  <Paperclip size={20} />
                </button>
                
                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-black rounded-lg transition-colors"
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
                    placeholder="Type a message..."
                    className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: '30px', maxHeight: '50px' }}
                  />
                </div>
                
                {/* Send Button on Side */}
                <button
                  type="button"
                  onClick={handleSendClick}
                  disabled={sendingMessage || !newMessage.trim() || (isConnected !== undefined && !isConnected)}
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