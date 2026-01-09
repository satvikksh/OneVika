"use client";

import React from "react";
import { Message } from "../types/socket";
import { Reply, X } from "lucide-react";

interface ReplyPreviewProps {
  replyTo: Message | null;
  onCancel: () => void;
  senderName?: string;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ replyTo, onCancel, senderName }) => {
  if (!replyTo) return null;

  return (
    <div className="px-3 sm:px-4 pt-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-lg bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-sm">
        <Reply size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
            Replying to {senderName}
          </div>
          <div className="text-sm truncate text-gray-700 dark:text-gray-300">
            {replyTo.text}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0 active:scale-95"
          aria-label="Cancel reply"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default ReplyPreview;