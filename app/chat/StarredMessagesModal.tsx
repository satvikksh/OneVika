"use client";

import React from "react";
import { Loader2, Star, X } from "lucide-react";
import { Message } from "../types/socket";

type StarredMessageItem = Message & {
  chatName?: string;
  chatType?: "direct" | "group";
};

interface StarredMessagesModalProps {
  isOpen: boolean;
  loading: boolean;
  messages: StarredMessageItem[];
  error: string | null;
  onClose: () => void;
  onSelectMessage: (message: StarredMessageItem) => void;
}

export default function StarredMessagesModal({
  isOpen,
  loading,
  messages,
  error,
  onClose,
  onSelectMessage,
}: StarredMessagesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close starred messages" />
      <div className="relative z-[91] flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Starred messages</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Saved highlights</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading starred messages...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center">
              <Star className="mx-auto mb-4 h-12 w-12 text-amber-500" />
              <p className="font-medium text-gray-600 dark:text-gray-300">No starred messages yet.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Use the message menu to save the ones you want to come back to.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => onSelectMessage(message)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50/70 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {message.chatName || "Conversation"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <Star size={12} />
                      {message.chatType === "group" ? "Group" : "Direct"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {message.text || message.content || message.attachments?.[0]?.fileName || "Media message"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
