"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, User } from "../types/socket";
import {
  Paperclip,
  Smile,
  Send,
  Loader2,
  Reply,
  X,
} from "lucide-react";
import MessageBubble from "./MessageBubble";
// import ReplyPreview from "./ReplyPreview";
import { useSession } from "next-auth/react";

interface ChatAreaProps {
  selectedUser: User | null;
  messages: Message[];
  loadingMessages: boolean;
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (e?: React.FormEvent) => void;
  sendingMessage: boolean;
  handleTyping: () => void;
  handleInputFocus: () => void;
  handleInputBlur: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement>;
  handleEmojiClick: (emoji: string) => void;
  commonEmojis: string[];
  handleMessageContextMenu: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatArea({
  selectedUser,
  messages,
  loadingMessages,
  newMessage,
  setNewMessage,
  handleSendMessage,
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
  replyTo,
  setReplyTo,
  messagesEndRef,
}: ChatAreaProps) {
  const { data: session } = useSession();

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 scrollbar-thin">
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mb-6">
              <Send className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Select a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Choose a user from the sidebar to start chatting
            </p>
          </div>
        ) : loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <Send className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No messages yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Start the conversation with <span className="font-semibold">{selectedUser.name}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isCurrentUser={message.senderId === session?.user?.id}
                onContextMenu={handleMessageContextMenu}
                senderName={selectedUser.name}
                showStatus={true}
                // isGrouped={message.isGrouped}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {/* <ReplyPreview
        replyTo={replyTo}
        onCancel={() => setReplyTo(null)}
        senderName={selectedUser?.name}
      /> */}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={() => {}}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
      />

      {/* Message Input */}
      {selectedUser && (
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
            {/* File Attachment Button */}
            <button
              type="button"
              onClick={handleFileSelect}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0 active:scale-95 mb-1"
              disabled={sendingMessage}
              aria-label="Attach file"
            >
              <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            
            {/* Input Container */}
            <div className="flex-1 flex items-end bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all min-h-[44px]">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-transparent outline-none text-gray-900 dark:text-white disabled:opacity-50 resize-none max-h-[120px] scrollbar-thin"
                disabled={sendingMessage}
                rows={1}
                style={{ minHeight: '44px' }}
              />
              
              {/* Emoji Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 m-1 active:scale-95"
                  disabled={sendingMessage}
                  aria-label="Emoji"
                >
                  <Smile size={20} className="text-gray-600 dark:text-gray-400" />
                </button>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50"
                    style={{ width: '250px' }}
                  >
                    <div className="grid grid-cols-6 gap-2">
                      {commonEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition-colors active:scale-110"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage}
              className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex-shrink-0 active:scale-95 mb-1 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                !newMessage.trim() ? 'opacity-50' : ''
              }`}
              aria-label="Send message"
            >
              {sendingMessage ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}