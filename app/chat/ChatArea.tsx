/* eslint-disable react-hooks/refs */
// ChatArea.tsx
"use client";

import React, { useCallback, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatAttachment, Message, User } from "../types/socket";
import { Session } from "next-auth";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  AudioLines,
  BarChart3,
  Camera,
  Check,
  CheckCheck,
  Clock,
  Code2,
  Contact,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderTree,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  Mic,
  Package,
  Paperclip,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Smile,
  Sparkles,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import DateSeparator from "./DateSeparator";
import PremiumUpgradePrompt from "../components/PremiumUpgradePrompt";

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
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hoveredMessageId: string | null;
  setHoveredMessageId: (id: string | null) => void;
  session: Session | null;
  isMobile: boolean;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: (schedule?: {
    scheduleMode: "now" | "delay" | "later";
    delayMs?: number;
    scheduledFor?: string;
  }) => void;
  onEditScheduledMessage: (message: Message) => void;
  onRescheduleMessage: (message: Message) => void;
  onCancelScheduledMessage: (message: Message) => void;
  onDeleteScheduledMessage: (message: Message) => void;
  onExitSelectionMode?: () => void;
  isConnected?: boolean; // Optional for connection status
  isChatBlocked?: boolean;
  isPeerTyping?: boolean;
  chatMode: "normal" | "vanish" | "polished";
  setChatMode: (mode: "normal" | "vanish" | "polished") => void;
  vanishSeconds: number;
  setVanishSeconds: (seconds: number) => void;
  canUsePolishedMode: boolean;
  isPremiumUser: boolean;
  polishedPreview: {
    originalText: string;
    enhancedText: string;
    isGenerating: boolean;
    error: string | null;
  } | null;
  onRegeneratePolishedPreview: () => void;
  onCancelPolishedPreview: () => void;
  onApprovePolishedPreview: () => void;
  onInsertPolishedPreview: () => void;
  onSendOriginalPolishedPreview: () => void;
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

type MessageWithCreatedAt = Message & {
  createdAt?: string | Date;
};

const getMessageTimestamp = (message: MessageWithCreatedAt) =>
  message.createdAt ?? message.sentAt ?? message.timestamp;

const getLocalDateKey = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateSeparatorLabel = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const messageKey = getLocalDateKey(date);
  if (messageKey === getLocalDateKey(today)) return "Today";
  if (messageKey === getLocalDateKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
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
        className="mb-2 block w-[min(72vw,22rem)] max-w-full overflow-hidden rounded-xl"
      >
        <img
          src={attachment.url}
          alt={attachment.fileName || "Image attachment"}
          className="block h-auto max-h-[55vh] w-full rounded-xl object-contain"
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
          className="relative mb-2 block w-[min(72vw,22rem)] max-w-full overflow-hidden rounded-xl"
        >
          <video
            src={attachment.url}
            muted
            playsInline
            loop
            autoPlay
            className="block max-h-[55vh] w-full rounded-xl bg-black object-contain"
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
        className="mb-2 block max-h-[55vh] w-[min(72vw,22rem)] max-w-full rounded-xl bg-black object-contain"
      />
    );
  }

  if (attachment.type === "audio") {
    return (
      <div className="mb-2 min-w-0 rounded-xl bg-black/10 px-3 py-3 dark:bg-white/10">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <AudioLines size={16} />
          <span className="min-w-0 truncate">{attachment.fileName || "Audio file"}</span>
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
      className="mb-2 flex w-[min(72vw,22rem)] max-w-full items-center gap-3 rounded-xl bg-black/10 px-3 py-3 dark:bg-white/10"
    >
      <FileText size={18} />
      <div className="min-w-0 flex-1">
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
  status?: "sending" | "scheduled" | "sent" | "delivered" | "read" | "failed";
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
      {status === 'scheduled' && (
        <div className="flex items-center text-violet-100">
          <Clock size={12} />
        </div>
      )}
      {status === 'failed' && (
        <div className="flex items-center text-red-200">
          <X size={12} />
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

type Artifact = {
  language: string;
  code: string;
  title: string;
  source: string;
};

type ArtifactFile = {
  path: string;
  language: string;
  code: string;
};

type FileTreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: FileTreeNode[];
  file?: ArtifactFile;
};

type PreviewRoute = {
  path: string;
  filePath: string;
  title: string;
  kind: "html" | "next-app" | "next-pages" | "react-component";
  html?: string;
  code?: string;
};

type RouteDiagnostic = {
  filePath: string;
  message: string;
};

const artifactLanguagePattern =
  /\b(react|next\.?js|tsx|jsx|html|css|tailwind|javascript|typescript|json|sql|python|bash|shell|markdown|md|yaml|yml)\b/i;

const previewWidthStorageKey = "orbitbyte-ai-preview-width";
const previewMinWidth = 320;
const previewMaxWidth = 760;

const extensionByLanguage: Record<string, string> = {
  bash: "sh",
  css: "css",
  html: "html",
  javascript: "js",
  json: "json",
  jsx: "jsx",
  markdown: "md",
  md: "md",
  nextjs: "tsx",
  python: "py",
  react: "tsx",
  shell: "sh",
  sql: "sql",
  tailwind: "css",
  tsx: "tsx",
  typescript: "ts",
  yaml: "yaml",
  yml: "yml",
};

const languageByExtension: Record<string, string> = {
  css: "css",
  html: "html",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  md: "markdown",
  py: "python",
  sh: "bash",
  sql: "sql",
  ts: "typescript",
  tsx: "tsx",
  yaml: "yaml",
  yml: "yaml",
};

const clampPreviewWidth = (value: number) =>
  Math.min(previewMaxWidth, Math.max(previewMinWidth, value));

const normalizeArtifactPath = (value: string) =>
  value.replace(/^\.?\//, "").replace(/\\/g, "/").replace(/^`|`$/g, "");

const inferLanguageFromPath = (path: string, fallback: string) => {
  const extension = path.split(".").pop()?.toLowerCase() || "";
  return languageByExtension[extension] || fallback || "text";
};

const inferFileName = (language: string, index: number) => {
  const normalized = language.toLowerCase().replace(".", "");
  if (normalized === "html") return "index.html";
  if (normalized === "css" || normalized === "tailwind") return "styles.css";
  if (normalized === "javascript") return index === 0 ? "main.js" : `script-${index + 1}.js`;
  if (normalized === "typescript") return `file-${index + 1}.ts`;
  if (["tsx", "jsx", "react", "nextjs"].includes(normalized)) {
    return index === 0 ? "src/App.tsx" : `src/component-${index + 1}.tsx`;
  }
  if (normalized === "json") return "package.json";
  if (normalized === "markdown" || normalized === "md") return "README.md";
  return `artifact-${index + 1}.${extensionByLanguage[normalized] || "txt"}`;
};

const getFilePathFromContext = (source: string, blockStart: number, code: string, language: string, index: number) => {
  const before = source.slice(Math.max(0, blockStart - 260), blockStart);
  const contextLines = before
    .split("\n")
    .slice(-5)
    .map((line) => line.trim())
    .filter(Boolean);
  const filePattern =
    /(?:file|path|filename|name)?\s*[:\-]?\s*`?((?:[\w.-]+\/)*[\w.-]+\.(?:tsx|jsx|ts|js|css|html|json|md|py|sql|yaml|yml|sh))`?/i;

  for (let i = contextLines.length - 1; i >= 0; i -= 1) {
    const match = contextLines[i].match(filePattern);
    if (match?.[1]) return normalizeArtifactPath(match[1]);
  }

  const firstLine = code.split("\n", 1)[0]?.trim() || "";
  const commentMatch = firstLine.match(
    /(?:\/\/|#|\/\*|<!--)\s*(?:file|path|filename)?\s*[:\-]?\s*((?:[\w.-]+\/)*[\w.-]+\.(?:tsx|jsx|ts|js|css|html|json|md|py|sql|yaml|yml|sh))/i
  );
  if (commentMatch?.[1]) return normalizeArtifactPath(commentMatch[1]);

  return inferFileName(language, index);
};

const extractCodeBlocks = (value: string): Artifact[] => {
  const blocks: Artifact[] = [];
  const pattern = /```(\w+)?\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const language = (match[1] || "text").toLowerCase();
    const code = match[2]?.trim() || "";
    if (!code) continue;

    blocks.push({
      language,
      code,
      title: `${language.toUpperCase()} artifact`,
      source: value,
    });
  }

  return blocks;
};

const extractArtifactFiles = (artifact: Artifact): ArtifactFile[] => {
  const files: ArtifactFile[] = [];
  const seen = new Set<string>();
  const pattern = /```([\w.-]+)?\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(artifact.source)) !== null) {
    const rawLanguage = (match[1] || artifact.language || "text").toLowerCase().replace(".", "");
    const code = match[2]?.trim() || "";
    if (!code) continue;

    const path = getFilePathFromContext(artifact.source, match.index, code, rawLanguage, index);
    const uniquePath = seen.has(path)
      ? path.replace(/(\.[^.]+)?$/, `-${index + 1}$1`)
      : path;
    seen.add(uniquePath);
    files.push({
      path: uniquePath,
      language: inferLanguageFromPath(uniquePath, rawLanguage),
      code,
    });
    index += 1;
  }

  if (files.length === 0) {
    const path = inferFileName(artifact.language, 0);
    files.push({
      path,
      language: inferLanguageFromPath(path, artifact.language),
      code: artifact.code,
    });
  }

  return files;
};

const buildFileTree = (files: ArtifactFile[]) => {
  const root: FileTreeNode = { name: "root", path: "", type: "folder", children: [] };

  files.forEach((file) => {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      let node = current.children.find((child) => child.name === part && child.type === (isFile ? "file" : "folder"));

      if (!node) {
        node = {
          name: part,
          path,
          type: isFile ? "file" : "folder",
          children: [],
          file: isFile ? file : undefined,
        };
        current.children.push(node);
      }

      if (isFile) {
        node.file = file;
      } else {
        current = node;
      }
    });
  });

  const sortTree = (node: FileTreeNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  };
  sortTree(root);

  return root.children;
};

const getFileIcon = (file: ArtifactFile) => {
  const extension = file.path.split(".").pop()?.toLowerCase();
  if (extension === "css") return "CSS";
  if (extension === "html") return "HTML";
  if (extension === "json") return "JSON";
  if (extension === "md") return "MD";
  if (extension === "tsx" || extension === "jsx") return "RX";
  if (extension === "ts" || extension === "js") return "JS";
  return "FILE";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escapeScriptContent = (value: string) => value.replace(/<\/script/gi, "<\\/script");

const routeTitleFromPath = (path: string) => {
  if (path === "/") return "Home";
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[-_]/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
};

const routeFromFilePath = (path: string) => {
  const normalized = normalizeArtifactPath(path).replace(/\.(tsx|jsx|ts|js|html)$/i, "");
  if (/^app\/page$/i.test(normalized)) return "/";
  const appRouteMatch = normalized.match(/^app\/(.+)\/page$/i);
  if (appRouteMatch?.[1]) return `/${appRouteMatch[1].replace(/\([^)]*\)\//g, "").replace(/\/index$/i, "")}`;
  if (/^pages\/index$/i.test(normalized) || /^src\/pages\/index$/i.test(normalized)) return "/";
  const pagesRouteMatch = normalized.match(/^(?:src\/)?pages\/(.+)$/i);
  if (pagesRouteMatch?.[1]) return `/${pagesRouteMatch[1].replace(/\/index$/i, "")}`;
  const htmlRoute = normalized.match(/^(?:public\/)?(.+)$/i);
  if (htmlRoute?.[1] && path.endsWith(".html")) {
    const route = htmlRoute[1].replace(/^index$/i, "").replace(/\/index$/i, "");
    return route ? `/${route}` : "/";
  }
  const componentRoute = normalized.match(/(?:^|\/)(home|about|contact|dashboard|profile|settings|login|register|pricing|blog)$/i);
  if (componentRoute?.[1]) {
    const route = componentRoute[1].toLowerCase();
    return route === "home" ? "/" : `/${route}`;
  }
  return null;
};

const extractInternalLinks = (value: string) => {
  const routes = new Set<string>();
  const patterns = [
    /\bhref\s*=\s*["'](\/[^"'#?]*)/gi,
    /\bto\s*=\s*["'](\/[^"'#?]*)/gi,
    /\bnavigate\(\s*["'](\/[^"'#?]*)/gi,
    /\brouter\.push\(\s*["'](\/[^"'#?]*)/gi,
  ];

  patterns.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
      routes.add(match[1].replace(/\/$/, "") || "/");
    }
  });

  return routes;
};

const buildPreviewRoutes = (files: ArtifactFile[]) => {
  const routeMap = new Map<string, PreviewRoute>();

  files.forEach((file) => {
    const path = routeFromFilePath(file.path);
    if (!path) return;
    const routeKind: PreviewRoute["kind"] = file.path.startsWith("app/")
      ? "next-app"
      : file.path.includes("pages/")
        ? "next-pages"
        : file.path.endsWith(".html")
          ? "html"
          : "react-component";

    routeMap.set(path, {
      path,
      filePath: file.path,
      title: routeTitleFromPath(path),
      kind: routeKind,
      html: file.path.endsWith(".html") ? file.code : undefined,
      code: file.code,
    });
  });

  ["/", "/about", "/contact", "/dashboard"].forEach((path) => {
    if (routeMap.has(path)) return;
    const matchingFile = files.find((file) =>
      new RegExp(`(?:^|/)${path === "/" ? "home|index|page" : path.slice(1)}\\.(tsx|jsx|ts|js|html)$`, "i").test(file.path)
    );
    if (!matchingFile) return;
    routeMap.set(path, {
      path,
      filePath: matchingFile.path,
      title: routeTitleFromPath(path),
      kind: matchingFile.path.endsWith(".html") ? "html" : "react-component",
      html: matchingFile.path.endsWith(".html") ? matchingFile.code : undefined,
      code: matchingFile.code,
    });
  });

  if (!routeMap.has("/") && routeMap.size > 0) {
    const firstRoute = Array.from(routeMap.values())[0];
    routeMap.set("/", { ...firstRoute, path: "/", title: "Home" });
  }

  return Array.from(routeMap.values()).sort((a, b) => a.path.localeCompare(b.path));
};

const validatePreviewRoutes = (files: ArtifactFile[], routes: PreviewRoute[]) => {
  const diagnostics: RouteDiagnostic[] = [];
  const routePaths = new Set(routes.map((route) => route.path));
  const filePaths = new Set(files.map((file) => file.path));

  files.forEach((file) => {
    extractInternalLinks(file.code).forEach((route) => {
      if (!routePaths.has(route)) {
        diagnostics.push({
          filePath: file.path,
          message: `Route "${route}" is referenced but no generated page file was registered for it.`,
        });
      }
    });

    const importPattern = /import\s+(?:[\s\S]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(file.code)) !== null) {
      const importerParts = file.path.split("/");
      importerParts.pop();
      const resolvedParts = [...importerParts, ...match[1].split("/")].filter(Boolean);
      const normalizedParts: string[] = [];
      resolvedParts.forEach((part) => {
        if (part === ".") return;
        if (part === "..") normalizedParts.pop();
        else normalizedParts.push(part);
      });
      const basePath = normalizedParts.join("/");
      const hasMatch = ["", ".tsx", ".jsx", ".ts", ".js", ".css", ".json", "/index.tsx", "/index.jsx", "/index.ts", "/index.js"].some((suffix) =>
        filePaths.has(`${basePath}${suffix}`)
      );
      if (!hasMatch) {
        diagnostics.push({
          filePath: file.path,
          message: `Import "${match[1]}" could not be resolved against the generated files.`,
        });
      }
    }
  });

  return diagnostics;
};

const buildRouteFallbackMarkup = (route: PreviewRoute) => `
  <section class="ob-route-fallback">
    <div>
      <p class="ob-kicker">${escapeHtml(route.kind === "next-app" ? "Next.js App Router" : route.kind === "next-pages" ? "Next.js Pages Router" : "React route")}</p>
      <h1>${escapeHtml(route.title)}</h1>
      <p class="ob-muted">Preview route registered from <strong>${escapeHtml(route.filePath)}</strong>. Edit files on the Code tab; navigation stays inside this preview.</p>
      <pre>${escapeHtml(route.code || "")}</pre>
    </div>
  </section>
`;

const getHtmlBody = (html: string) => {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1] || html;
};

const buildPreviewRuntimeScript = (routes: PreviewRoute[], diagnostics: RouteDiagnostic[]) => {
  const runtimeRoutes = routes.map((route) => ({
    ...route,
    html: route.html ? getHtmlBody(route.html) : buildRouteFallbackMarkup(route),
    code: undefined,
  }));

  return `<script>
(() => {
  const routes = ${escapeScriptContent(JSON.stringify(runtimeRoutes))};
  const diagnostics = ${escapeScriptContent(JSON.stringify(diagnostics))};
  const routeByPath = new Map(routes.map((route) => [route.path, route]));
  const appRoot = document.querySelector("[data-ob-preview-root]") || document.getElementById("root") || document.getElementById("app") || document.body;

  const normalizePath = (value) => {
    try {
      const url = new URL(value, window.location.href);
      return url.pathname.replace(/\\/$/, "") || "/";
    } catch {
      return "/";
    }
  };

  const showOverlay = (title, detail, filePath, lineNumber) => {
    let overlay = document.getElementById("ob-preview-error-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "ob-preview-error-overlay";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '<div class="ob-error-card"><div class="ob-error-title"></div><div class="ob-error-location"></div><pre class="ob-error-detail"></pre></div>';
    overlay.querySelector(".ob-error-title").textContent = title || "Preview routing error";
    overlay.querySelector(".ob-error-location").textContent = [filePath, lineNumber ? "line " + lineNumber : ""].filter(Boolean).join(": ");
    overlay.querySelector(".ob-error-detail").textContent = detail || "";
  };

  const hideOverlay = () => {
    document.getElementById("ob-preview-error-overlay")?.remove();
  };

  const renderRoute = (path, options = {}) => {
    const normalized = normalizePath(path);
    const route = routeByPath.get(normalized);
    hideOverlay();

    if (!route) {
      showOverlay(
        "Route is not registered",
        "No generated page file exists for " + normalized + ". Registered routes: " + routes.map((item) => item.path).join(", "),
        "preview-router",
        1
      );
      return;
    }

    if (!options.skipHistory && window.location.pathname !== normalized) {
      window.history.pushState({ obPreviewRoute: normalized }, "", normalized);
    }

    if (route.html && appRoot) {
      appRoot.innerHTML = route.html;
    }

    document.querySelectorAll("a[href]").forEach((link) => {
      const linkPath = normalizePath(link.getAttribute("href") || "/");
      link.toggleAttribute("aria-current", linkPath === normalized);
    });
    document.title = route.title || "OrbitByte Preview";
  };

  window.addEventListener("click", (event) => {
    const link = event.target?.closest?.("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (/^(https?:|mailto:|tel:|#)/i.test(href)) return;
    const path = normalizePath(href);
    if (!path.startsWith("/")) return;
    event.preventDefault();
    renderRoute(path);
  });

  window.addEventListener("popstate", () => renderRoute(window.location.pathname, { skipHistory: true }));

  window.addEventListener("error", (event) => {
    const stack = event.error?.stack || "";
    const locationMatch = stack.match(/([^\\s()]+):(\\d+):(\\d+)/);
    showOverlay(
      "Runtime error",
      event.message || stack,
      locationMatch?.[1] || event.filename || "preview",
      locationMatch?.[2] || event.lineno
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const stack = reason?.stack || String(reason || "Unhandled promise rejection");
    const locationMatch = stack.match(/([^\\s()]+):(\\d+):(\\d+)/);
    showOverlay("Unhandled preview error", stack, locationMatch?.[1] || "preview", locationMatch?.[2]);
  });

  renderRoute(window.location.pathname || "/", { skipHistory: true });
  if (diagnostics.length > 0) {
    showOverlay(
      "Preview verified with warnings",
      diagnostics.map((item) => item.filePath + ": " + item.message).join("\\n"),
      diagnostics[0].filePath,
      1
    );
  }
  window.__orbitbytePreviewRouter = { routes, diagnostics, navigate: renderRoute };
})();
</script>`;
};

const buildPreviewDocument = (files: ArtifactFile[]) => {
  const routes = buildPreviewRoutes(files);
  const diagnostics = validatePreviewRoutes(files, routes);
  const runtimeScript = buildPreviewRuntimeScript(routes, diagnostics);
  const routerStyles = `
    <style>
      [aria-current="true"] { font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
      .ob-route-fallback { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: #f8fafc; color: #111827; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .ob-route-fallback > div { width: min(860px, 100%); border: 1px solid #d1d5db; border-radius: 18px; background: white; box-shadow: 0 20px 50px rgba(15, 23, 42, .12); padding: 24px; }
      .ob-route-fallback h1 { margin: 0 0 10px; font-size: clamp(28px, 5vw, 48px); line-height: 1; }
      .ob-kicker { margin: 0 0 8px; color: #047857; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      .ob-muted { color: #4b5563; }
      .ob-route-fallback pre { max-height: 50vh; overflow: auto; background: #0f172a; color: #d1fae5; border-radius: 14px; padding: 16px; white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
      #ob-preview-error-overlay { position: fixed; inset: 16px; z-index: 2147483647; pointer-events: none; display: flex; align-items: flex-start; justify-content: center; }
      .ob-error-card { width: min(760px, 100%); margin-top: 12px; border: 1px solid #fecaca; border-radius: 16px; background: #fff1f2; color: #7f1d1d; box-shadow: 0 24px 80px rgba(127, 29, 29, .22); padding: 16px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .ob-error-title { font-size: 15px; font-weight: 800; }
      .ob-error-location { margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; color: #be123c; }
      .ob-error-detail { margin: 10px 0 0; max-height: 42vh; overflow: auto; white-space: pre-wrap; font-size: 12px; line-height: 1.55; color: #7f1d1d; }
    </style>`;
  const htmlFile =
    files.find((file) => file.path.toLowerCase().endsWith("index.html")) ||
    files.find((file) => file.language === "html");
  const cssFiles = files.filter((file) => file.language === "css" || file.path.endsWith(".css"));
  const scriptFiles = files.filter((file) =>
    ["javascript", "typescript"].includes(file.language) || /\.(js|ts)$/.test(file.path)
  );
  const reactFiles = files.filter((file) => ["tsx", "jsx", "react", "nextjs"].includes(file.language));

  if (htmlFile) {
    const styleTags = cssFiles.map((file) => `<style data-file="${escapeHtml(file.path)}">\n${file.code}\n</style>`).join("\n");
    const scriptTags = scriptFiles
      .map((file) => `<script type="module" data-file="${escapeHtml(file.path)}">\n${escapeScriptContent(file.code)}\n//# sourceURL=${file.path}\n</script>`)
      .join("\n");
    const headMatch = htmlFile.code.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const body = getHtmlBody(htmlFile.code);

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${headMatch?.[1] || ""}
    ${routerStyles}
    ${styleTags}
  </head>
  <body>
    <div data-ob-preview-root>${body}</div>
    ${scriptTags}
    ${runtimeScript}
  </body>
</html>`;
  }

  if (reactFiles.length > 0) {
    const navRoutes = routes.length > 0 ? routes : [{
      path: "/",
      filePath: reactFiles[0].path,
      title: "Home",
      kind: "react-component" as const,
      code: reactFiles[0].code,
    }];

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${routerStyles}
    <style>
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #111827; }
      .ob-preview-nav { position: sticky; top: 0; z-index: 10; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid #e5e7eb; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); padding: 12px 16px; }
      .ob-preview-nav a { color: #065f46; text-decoration: none; border-radius: 999px; padding: 8px 12px; }
      .ob-preview-nav a:hover { background: #ecfdf5; }
      ${cssFiles.map((file) => file.code).join("\n")}
    </style>
  </head>
  <body>
    <nav class="ob-preview-nav">
      ${navRoutes.map((route) => `<a href="${escapeHtml(route.path)}">${escapeHtml(route.title)}</a>`).join("")}
    </nav>
    <main data-ob-preview-root></main>
    ${runtimeScript}
  </body>
</html>`;
  }

  const css = cssFiles.map((file) => file.code).join("\n");
  const scripts = scriptFiles.map((file) => `<script type="module">\n${file.code}\n</script>`).join("\n");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${css}</style>
    ${routerStyles}
  </head>
  <body>
    <div id="app" data-ob-preview-root></div>
    ${scripts}
    ${runtimeScript}
  </body>
</html>`;
};

const hasStructuredArtifact = (value = "") => {
  if (!value.trim()) return false;
  if (extractCodeBlocks(value).length > 0) return true;
  return (
    artifactLanguagePattern.test(value) ||
    /^\s*[{[][\s\S]*[}\]]\s*$/.test(value) ||
    /\|.+\|[\r\n]+\|[-:\s|]+\|/.test(value)
  );
};

const getArtifactFromMessage = (message?: Message | null): Artifact | null => {
  const text = message?.text || message?.content || "";
  const [firstBlock] = extractCodeBlocks(text);
  if (firstBlock) return firstBlock;

  if (!hasStructuredArtifact(text)) return null;

  const languageMatch = text.match(artifactLanguagePattern);
  return {
    language: languageMatch?.[1]?.toLowerCase().replace(".", "") || "markdown",
    code: text.trim(),
    title: "AI artifact",
    source: text,
  };
};

const markdownInline = (value: string) => {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-gray-950/5 px-1.5 py-0.5 font-mono text-[0.92em] text-emerald-700 dark:bg-white/10 dark:text-emerald-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-gray-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{renderMessageText(part)}</React.Fragment>;
  });
};

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [wrapped, setWrapped] = React.useState(true);
  const lines = code.split("\n");
  const shouldClamp = lines.length > 18 && !expanded;
  const normalizedLanguage = language || "text";

  const copyCode = async () => {
    await navigator.clipboard?.writeText(code).catch(() => {});
  };

  const downloadCode = () => {
    const extensionMap: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      jsx: "jsx",
      tsx: "tsx",
      python: "py",
      html: "html",
      css: "css",
      json: "json",
      sql: "sql",
      markdown: "md",
    };
    const extension = extensionMap[normalizedLanguage] || "txt";
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbitbyte-artifact.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-gray-800 bg-[#0d1117] shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
            <Code2 size={15} />
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-[0.14em] text-gray-300">
            {normalizedLanguage}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWrapped((prev) => !prev)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/10">
            Wrap
          </button>
          <button type="button" onClick={copyCode} className="rounded-lg p-1.5 text-gray-300 transition hover:bg-white/10" aria-label="Copy code">
            <Copy size={14} />
          </button>
          <button type="button" onClick={downloadCode} className="rounded-lg p-1.5 text-gray-300 transition hover:bg-white/10" aria-label="Download code">
            <Download size={14} />
          </button>
          {lines.length > 18 ? (
            <button type="button" onClick={() => setExpanded((prev) => !prev)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-white/10">
              {expanded ? "Collapse" : "Expand"}
            </button>
          ) : null}
        </div>
      </div>
      <pre className={`max-w-full overflow-auto p-0 text-[13px] leading-6 text-gray-100 ${shouldClamp ? "max-h-[27rem]" : "max-h-[42rem]"}`}>
        <code>
          {lines.map((line, index) => (
            <span key={`${index}-${line}`} className="grid grid-cols-[3rem_1fr] border-b border-white/[0.03] last:border-b-0">
              <span className="select-none bg-white/[0.02] px-3 text-right text-gray-500">
                {index + 1}
              </span>
              <span className={`px-4 ${wrapped ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}>
                {line || " "}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
};

const renderAiMarkdown = (value: string) => {
  const segments: React.ReactNode[] = [];
  const pattern = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const renderText = (text: string, keyPrefix: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      const key = `${keyPrefix}-${index}`;
      if (!line.trim()) return <div key={key} className="h-3" />;
      if (/^#{1,3}\s+/.test(line)) {
        return (
          <h3 key={key} className="mt-4 text-base font-bold text-gray-950 first:mt-0 dark:text-white">
            {markdownInline(line.replace(/^#{1,3}\s+/, ""))}
          </h3>
        );
      }
      if (/^[-*]\s+/.test(line)) {
        return (
          <div key={key} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <p>{markdownInline(line.replace(/^[-*]\s+/, ""))}</p>
          </div>
        );
      }
      if (/^\d+\.\s+/.test(line)) {
        return (
          <p key={key} className="pl-1">
            {markdownInline(line)}
          </p>
        );
      }
      if (line.includes("|")) {
        return (
          <p key={key} className="overflow-x-auto rounded-xl bg-gray-950/5 px-3 py-2 font-mono text-xs dark:bg-white/10">
            {line}
          </p>
        );
      }
      return <p key={key}>{markdownInline(line)}</p>;
    });
  };

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push(renderText(value.slice(lastIndex, match.index), `text-${lastIndex}`));
    }
    segments.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={(match[1] || "text").toLowerCase()}
        code={match[2]?.trim() || ""}
      />
    );
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    segments.push(renderText(value.slice(lastIndex), `text-${lastIndex}`));
  }

  return segments;
};

const AiMessageActions = ({
  text,
  hasArtifact,
  onOpenArtifact,
}: {
  text: string;
  hasArtifact: boolean;
  onOpenArtifact: () => void;
}) => {
  const copyMessage = async () => {
    await navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-200/70 pt-2 dark:border-white/10">
      {hasArtifact ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenArtifact();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          <PanelRightOpen size={14} />
          Preview
        </button>
      ) : null}
      {[
        { label: "Copy", icon: Copy, action: copyMessage },
        { label: "Regenerate", icon: RefreshCw },
        { label: "Like", icon: ThumbsUp },
        { label: "Dislike", icon: ThumbsDown },
        { label: "Speak", icon: Volume2 },
        { label: "Share", icon: Share2 },
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            item.action?.();
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <item.icon size={14} />
          {item.label}
        </button>
      ))}
    </div>
  );
};

const ArtifactWorkspace = ({
  artifact,
  onClose,
  isMobile,
  previewWidth,
  onPreviewWidthChange,
}: {
  artifact: Artifact | null;
  onClose: () => void;
  isMobile: boolean;
  previewWidth: number;
  onPreviewWidthChange: (width: number) => void;
}) => {
  const [activeTab, setActiveTab] = React.useState<"code" | "preview" | "console" | "dependencies">("preview");
  const [files, setFiles] = React.useState<ArtifactFile[]>([]);
  const [activePath, setActivePath] = React.useState("");
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(() => new Set(["src", "components"]));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isResizing, setIsResizing] = React.useState(false);
  const previewFrameRef = React.useRef<HTMLIFrameElement | null>(null);

  React.useEffect(() => {
    if (!artifact) return;
    const nextFiles = extractArtifactFiles(artifact);
    setFiles(nextFiles);
    setActivePath((current) => (nextFiles.some((file) => file.path === current) ? current : nextFiles[0]?.path || ""));
    setActiveTab("preview");
    setSearchTerm("");
  }, [artifact]);

  React.useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      onPreviewWidthChange(clampPreviewWidth(window.innerWidth - event.clientX - 16));
    };
    const handlePointerUp = () => setIsResizing(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing, onPreviewWidthChange]);

  const activeFile = files.find((file) => file.path === activePath) || files[0];
  const visibleFiles = React.useMemo(
    () =>
      searchTerm.trim()
        ? files.filter((file) => file.path.toLowerCase().includes(searchTerm.toLowerCase()))
        : files,
    [files, searchTerm]
  );
  const fileTree = React.useMemo(() => buildFileTree(visibleFiles), [visibleFiles]);
  const previewDocument = React.useMemo(() => buildPreviewDocument(files), [files]);
  const dependencies = React.useMemo(() => {
    const packageFile = files.find((file) => file.path.endsWith("package.json"));
    if (!packageFile) return [];
    try {
      const parsed = JSON.parse(packageFile.code) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      return Object.entries({
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      });
    } catch {
      return [];
    }
  }, [files]);

  const updateActiveFile = (code: string) => {
    if (!activeFile) return;
    setFiles((current) =>
      current.map((file) => (file.path === activeFile.path ? { ...file, code } : file))
    );
  };

  const formatActiveFile = () => {
    if (!activeFile) return;
    let nextCode = activeFile.code.replace(/\t/g, "  ").replace(/[ \t]+$/gm, "").trim();
    if (activeFile.language === "json") {
      try {
        nextCode = JSON.stringify(JSON.parse(activeFile.code), null, 2);
      } catch {
        nextCode = activeFile.code;
      }
    }
    updateActiveFile(`${nextCode}\n`);
  };

  const downloadBlob = (content: string, fileName: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const frame = previewFrameRef.current;
    const frameDocument = frame?.contentDocument;
    if (frameDocument) {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      return;
    }
    downloadBlob(previewDocument, "orbitbyte-preview.html", "text/html;charset=utf-8");
  };

  const downloadWord = () => {
    const wordHtml = `<!doctype html><html><head><meta charset="utf-8"><title>OrbitByte Preview</title></head><body>${previewDocument}</body></html>`;
    downloadBlob(
      wordHtml,
      "orbitbyte-preview.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  };

  const renderTree = (nodes: FileTreeNode[], level = 0): React.ReactNode =>
    nodes.map((node) => {
      if (node.type === "folder") {
        const isOpen = openFolders.has(node.path);
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() =>
                setOpenFolders((current) => {
                  const next = new Set(current);
                  if (next.has(node.path)) next.delete(node.path);
                  else next.add(node.path);
                  return next;
                })
              }
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              style={{ paddingLeft: `${8 + level * 14}px` }}
            >
              <span className="w-3 text-gray-400">{isOpen ? "▾" : "▸"}</span>
              <FolderTree size={14} />
              <span className="truncate">{node.name}</span>
            </button>
            {isOpen ? renderTree(node.children, level + 1) : null}
          </div>
        );
      }

      if (!node.file) return null;
      const isActive = node.file.path === activeFile?.path;
      return (
        <button
          key={node.path}
          type="button"
          onClick={() => setActivePath(node.file?.path || "")}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
            isActive
              ? "bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          }`}
          style={{ paddingLeft: `${22 + level * 14}px` }}
          title={node.file.path}
        >
          <span className="w-8 shrink-0 rounded bg-gray-200 px-1 py-0.5 text-center text-[9px] font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {getFileIcon(node.file)}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
      );
    });

  const workspace = (
    <>
      {!isMobile ? (
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            setIsResizing(true);
          }}
          className="absolute inset-y-0 left-0 z-10 flex w-3 cursor-col-resize items-center justify-center border-r border-gray-200 bg-gray-50 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/10 dark:bg-gray-900 dark:hover:bg-emerald-950/40"
          aria-label="Resize preview"
        >
          <span className="h-12 w-1 rounded-full bg-current/40" />
        </button>
      ) : null}
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2">
            {isMobile ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-white/10"
                aria-label="Back to AI chat"
              >
                ←
              </button>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-950 dark:text-white">{artifact?.title || "AI preview"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{files.length} file{files.length === 1 ? "" : "s"} connected</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">
              <FileText size={14} />
              PDF
            </button>
            <button type="button" onClick={downloadWord} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">
              <Download size={14} />
              Word
            </button>
            {!isMobile ? (
              <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Collapse preview">
                <PanelRightOpen size={18} />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close preview">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-44 shrink-0 border-r border-gray-100 bg-gray-50/80 p-2 dark:border-white/10 dark:bg-white/[0.03] sm:block">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search files"
              className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-gray-950"
            />
            <div className="max-h-full overflow-auto pr-1">{renderTree(fileTree)}</div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-[2.9rem] items-center gap-1 overflow-x-auto border-b border-gray-100 px-2 py-2 dark:border-white/10">
              {[
                { id: "preview", label: "Preview", icon: Eye },
                { id: "code", label: "Code", icon: Code2 },
                { id: "console", label: "Console", icon: Terminal },
                { id: "dependencies", label: "Deps", icon: Package },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "code" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex gap-1 overflow-x-auto border-b border-gray-100 bg-gray-50 px-2 py-1 dark:border-white/10 dark:bg-white/[0.03]">
                  {files.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setActivePath(file.path)}
                      className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs ${
                        file.path === activeFile?.path
                          ? "bg-white font-semibold text-gray-950 shadow-sm dark:bg-gray-900 dark:text-white"
                          : "text-gray-500 hover:bg-white/70 dark:hover:bg-white/10"
                      }`}
                    >
                      {file.path.split("/").pop()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-xs dark:border-white/10">
                  <span className="truncate font-mono text-gray-500">{activeFile?.path}</span>
                  <button type="button" onClick={formatActiveFile} className="rounded-lg px-2 py-1 font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">
                    Format
                  </button>
                </div>
                <textarea
                  value={activeFile?.code || ""}
                  onChange={(event) => updateActiveFile(event.target.value)}
                  spellCheck={false}
                  className="min-h-0 flex-1 resize-none bg-[#0d1117] p-4 font-mono text-[13px] leading-6 text-gray-100 outline-none selection:bg-emerald-500/30"
                />
              </div>
            ) : null}

            {activeTab === "preview" ? (
              <iframe
                ref={previewFrameRef}
                title="Artifact preview"
                srcDoc={previewDocument}
                className="min-h-0 flex-1 border-0 bg-white"
                sandbox="allow-forms allow-modals allow-popups allow-scripts"
              />
            ) : null}

            {activeTab === "console" ? (
              <div className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-xs text-emerald-300">
                <p>$ orbitbyte preview build</p>
                <p className="mt-2 text-gray-400">Connected {files.length} generated file{files.length === 1 ? "" : "s"} into the live preview sandbox.</p>
                <p className="mt-2 text-gray-400">Edits rebuild automatically as you type.</p>
              </div>
            ) : null}

            {activeTab === "dependencies" ? (
              <div className="min-h-0 flex-1 overflow-auto p-4 text-sm text-gray-600 dark:text-gray-300">
                {dependencies.length > 0 ? (
                  <div className="space-y-2">
                    {dependencies.map(([name, version]) => (
                      <div key={name} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                        <span className="font-mono text-xs">{version}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                    No external dependencies detected from this response.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {artifact ? (
        isMobile ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-white dark:bg-gray-950"
            aria-label="AI preview"
          >
            {workspace}
          </motion.div>
        ) : (
          <motion.aside
            initial={{ x: previewWidth, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: previewWidth, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed bottom-4 right-4 top-20 z-[70] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950"
            style={{ width: previewWidth }}
            aria-label="AI artifact workspace"
          >
            {workspace}
          </motion.aside>
        )
      ) : null}
    </AnimatePresence>
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
  replyTo,
  setReplyTo,
  messagesEndRef,
  hoveredMessageId,
  setHoveredMessageId,
  session,
  isMobile,
  handleKeyDown,
  onSendMessage,
  onEditScheduledMessage,
  onRescheduleMessage,
  onCancelScheduledMessage,
  onDeleteScheduledMessage,
  onExitSelectionMode,
  isConnected = true, // Default to true for backward compatibility
  isChatBlocked = false,
  isPeerTyping = false,
  chatMode,
  setChatMode,
  vanishSeconds,
  setVanishSeconds,
  canUsePolishedMode,
  isPremiumUser,
  polishedPreview,
  onRegeneratePolishedPreview,
  onCancelPolishedPreview,
  onApprovePolishedPreview,
  onInsertPolishedPreview,
  onSendOriginalPolishedPreview,
}: ChatAreaProps) {
  const router = useRouter();
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
  const [now, setNow] = React.useState(() => Date.now());
  const [scheduleMode, setScheduleMode] = React.useState<"now" | "delay" | "later">("now");
  const [delayMs, setDelayMs] = React.useState(60_000);
  const [customDateTime, setCustomDateTime] = React.useState("");
  const [showPremiumPrompt, setShowPremiumPrompt] = React.useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = React.useState(false);
  const [isArtifactWorkspaceOpen, setIsArtifactWorkspaceOpen] = React.useState(false);
  const [previewWidth, setPreviewWidth] = React.useState(420);
  const [dismissedArtifactMessageId, setDismissedArtifactMessageId] =
    React.useState<string | null>(null);
  const [stoppedStreamingMessages, setStoppedStreamingMessages] = React.useState<
    Record<string, string>
  >({});
  const isAiConversation = Boolean(selectedUser?.isAI);
  const latestStreamingAiMessage = React.useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) =>
            isAiConversation &&
            message.senderId !== currentUserId &&
            message.isStreaming &&
            stoppedStreamingMessages[message.id] === undefined
        ) ?? null,
    [currentUserId, isAiConversation, messages, stoppedStreamingMessages]
  );
  const latestArtifactMessage = React.useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => {
          const text = message.text || message.content || "";
          return (
            isAiConversation &&
            message.senderId !== currentUserId &&
            hasStructuredArtifact(text)
          );
        }) ?? null,
    [currentUserId, isAiConversation, messages]
  );
  const activeArtifact = React.useMemo(
    () => getArtifactFromMessage(latestArtifactMessage),
    [latestArtifactMessage]
  );
  const premiumMembershipUrl = currentUserId
    ? `/profile/${currentUserId}#premium-membership`
    : "/profile#premium-membership";
  const handleUpgradeToPremium = React.useCallback(() => {
    router.push(premiumMembershipUrl);
  }, [premiumMembershipUrl, router]);

  const handlePolishedFeatureClick = React.useCallback(() => {
    if (!isPremiumUser) {
      setShowPremiumPrompt(true);
      return;
    }

    setShowPremiumPrompt(false);
    setChatMode("polished");
    inputRef.current?.focus();
  }, [inputRef, isPremiumUser, setChatMode]);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const storedWidth = window.localStorage.getItem(previewWidthStorageKey);
    if (!storedWidth) return;
    const parsedWidth = Number(storedWidth);
    if (Number.isFinite(parsedWidth)) {
      setPreviewWidth(clampPreviewWidth(parsedWidth));
    }
  }, []);

  const handlePreviewWidthChange = React.useCallback((width: number) => {
    const nextWidth = clampPreviewWidth(width);
    setPreviewWidth(nextWidth);
    window.localStorage.setItem(previewWidthStorageKey, String(nextWidth));
  }, []);

  React.useEffect(() => {
    if (
      activeArtifact &&
      latestArtifactMessage?.id !== dismissedArtifactMessageId &&
      isAiConversation &&
      !isMobile
    ) {
      setIsArtifactWorkspaceOpen(true);
    } else if (!activeArtifact || !isAiConversation) {
      setIsArtifactWorkspaceOpen(false);
    }
  }, [
    activeArtifact,
    dismissedArtifactMessageId,
    isAiConversation,
    isMobile,
    latestArtifactMessage?.id,
  ]);

  React.useEffect(() => {
    setStoppedStreamingMessages({});
    setDismissedArtifactMessageId(null);
  }, [selectedUser?.id]);

  React.useEffect(() => {
    if (isSelectionMode || isChatBlocked) {
      setShowAttachmentSheet(false);
      setShowEmojiPicker(false);
    }
  }, [isChatBlocked, isSelectionMode, setShowEmojiPicker]);

  const openArtifactWorkspace = React.useCallback(() => {
    setDismissedArtifactMessageId(null);
    setIsArtifactWorkspaceOpen(true);
  }, []);

  const closeArtifactWorkspace = React.useCallback(() => {
    setDismissedArtifactMessageId(latestArtifactMessage?.id ?? null);
    setIsArtifactWorkspaceOpen(false);
  }, [latestArtifactMessage?.id]);

  const handleStopGenerating = React.useCallback(() => {
    if (!latestStreamingAiMessage) return;

    const partialText =
      latestStreamingAiMessage.text || latestStreamingAiMessage.content || "";
    setStoppedStreamingMessages((prev) => ({
      ...prev,
      [latestStreamingAiMessage.id]: partialText,
    }));
  }, [latestStreamingAiMessage]);

  // Handle enter key for sending
  const handleKeyDownOverride = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleKeyDown(e);
  };

  // Handle send button click
  const handleSendClick = () => {
    const schedule =
      scheduleMode === "now"
        ? { scheduleMode: "now" as const }
        : scheduleMode === "delay"
          ? { scheduleMode: "delay" as const, delayMs }
          : {
              scheduleMode: "later" as const,
              scheduledFor: customDateTime
                ? new Date(customDateTime).toISOString()
                : undefined,
            };
    onSendMessage(schedule);
  };

  const formatCountdown = (scheduledFor?: string | Date) => {
    if (!scheduledFor) return "";
    const target = new Date(scheduledFor).getTime();
    const diff = Math.max(0, target - now);
    const totalSeconds = Math.ceil(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
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
    <div
      className={`flex h-full w-full min-w-0 flex-col overflow-x-hidden ${
        isAiConversation
          ? "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(180deg,#f8fafc,white)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),linear-gradient(180deg,#020617,#030712)]"
          : "bg-white dark:bg-black"
      }`}
    >
      {polishedPreview && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-gray-950 dark:text-white">
                    <Sparkles className="h-4 w-4 text-green-700" />
                    AI Polished Your Message
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Review the result before anything is sent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancelPolishedPreview}
                  className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                  aria-label="Close polished preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Original
                </p>
                <div className="max-h-28 overflow-y-auto rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  <p className="whitespace-pre-wrap break-words">
                    {polishedPreview.originalText}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Polished
                </p>
                {polishedPreview.isGenerating ? (
                  <div className="flex min-h-28 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                    Polishing your message...
                  </div>
                ) : polishedPreview.enhancedText.trim() ? (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    <p className="whitespace-pre-wrap break-words">
                      {polishedPreview.enhancedText}
                    </p>
                  </div>
                ) : (
                  <div className="min-h-20 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    No polished text generated yet.
                  </div>
                )}
              </div>
              {polishedPreview.error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                  {polishedPreview.error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={onCancelPolishedPreview}
                disabled={polishedPreview.isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onInsertPolishedPreview}
                disabled={polishedPreview.isGenerating || !polishedPreview.enhancedText.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200"
              >
                <Edit3 size={16} />
                Edit Polished Text
              </button>
              <button
                type="button"
                onClick={onRegeneratePolishedPreview}
                disabled={polishedPreview.isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200"
              >
                {polishedPreview.isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Regenerate
              </button>
              <button
                type="button"
                onClick={onSendOriginalPolishedPreview}
                disabled={polishedPreview.isGenerating || sendingMessage}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200"
              >
                Send Original
              </button>
              <button
                type="button"
                onClick={onApprovePolishedPreview}
                disabled={polishedPreview.isGenerating || !polishedPreview.enhancedText.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                <Send size={16} />
                Send Polished
              </button>
            </div>
          </div>
        </div>
      )}
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
        className={`min-w-0 flex-1 overflow-y-auto overflow-x-hidden transition-[margin] duration-300 ${
          selectedUser ? "pb-48 sm:pb-44" : ""
        } lg:ml-80`}
        style={{
          marginRight:
            !isMobile && isAiConversation && activeArtifact && isArtifactWorkspaceOpen
              ? `${previewWidth + 24}px`
              : undefined,
        }}
      >
        {selectedUser ? (
            <div
              className={`w-full min-w-0 space-y-4 p-3 sm:p-5 ${
                isAiConversation ? "mx-auto max-w-5xl" : ""
              }`}
            >
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
                messages.map((msg, index) => {
                  const messageTimestamp = getMessageTimestamp(msg);
                  const previousMessage = index > 0 ? messages[index - 1] : null;
                  const messageDateKey = getLocalDateKey(messageTimestamp);
                  const previousDateKey = previousMessage
                    ? getLocalDateKey(getMessageTimestamp(previousMessage))
                    : "";
                  const shouldShowDateSeparator =
                    Boolean(messageDateKey) && messageDateKey !== previousDateKey;
                  const dateSeparatorLabel = shouldShowDateSeparator
                    ? formatDateSeparatorLabel(messageTimestamp)
                    : "";
                  const isCurrentUser = msg.senderId === currentUserId;
                  const isAiAssistantMessage = isAiConversation && !isCurrentUser;
                  const isAiUserMessage = isAiConversation && isCurrentUser;
                  const visibleMessageText =
                    stoppedStreamingMessages[msg.id] ?? msg.text ?? msg.content ?? "";
                  const isMessageStreaming =
                    Boolean(msg.isStreaming) && stoppedStreamingMessages[msg.id] === undefined;
                  const isHiddenMessage = Boolean(msg.isHidden);
                  const isSelected = selectedMessageIdSet.has(msg.id);
                  const hasAttachment = Boolean(msg.attachments?.[0]?.url);
                  const hasText = Boolean(visibleMessageText);
                  const isScheduledMessage =
                    msg.status === "scheduled" ||
                    ["pending", "processing", "cancelled"].includes(
                      msg.scheduledStatus ?? ""
                    );
                  const bubbleBaseClasses = isCurrentUser
                    ? isAiUserMessage
                      ? "bg-gradient-to-br from-gray-950 via-emerald-950 to-cyan-950 text-white rounded-br-md ring-1 ring-white/10 shadow-xl shadow-emerald-950/20"
                      : "bg-gray-900 text-white rounded-br-md dark:bg-gray-500 dark:text-black dark:ring-gray-700"
                    : "bg-gray-100 text-gray-950 rounded-bl-md ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800";
                  const hiddenBubbleClasses =
                    showHiddenMessages && isHiddenMessage
                      ? isCurrentUser
                        ? "bg-blue-500/85 text-white ring-1 ring-amber-200/70"
                        : "border border-dashed border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
                      : bubbleBaseClasses;

                  const startMessageLongPress = (touch: React.Touch) => {
                    if (isSelectionMode) return;

                    touchOriginRef.current = {
                      x: touch.clientX,
                      y: touch.clientY,
                    };
                    setPressedMessageId(msg.id);

                    longPressTimerRef.current = window.setTimeout(() => {
                      onStartMessageSelection(msg);
                      setPressedMessageId(null);
                      if ("vibrate" in navigator) {
                        navigator.vibrate(28);
                      }
                    }, 600);
                  };
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {dateSeparatorLabel ? (
                        <DateSeparator label={dateSeparatorLabel} />
                      ) : null}
                      <div
                        id={`message-${msg.id}`}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        onClick={(event) => {
                          if (event.currentTarget === event.target && isSelectionMode) {
                            onExitSelectionMode?.();
                          }
                        }}
                      >
                      <div
                        className={`group flex min-w-0 items-start gap-2 ${
                          isCurrentUser ? "flex-row-reverse" : ""
                        } ${isAiAssistantMessage ? "w-full" : ""}`}
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
                          className={`relative min-w-0 ${
                            isAiAssistantMessage
                              ? "max-w-[min(86vw,44rem)] sm:max-w-[min(74vw,46rem)] lg:max-w-[min(72%,52rem)]"
                              : "max-w-[min(86vw,44rem)] sm:max-w-[min(74vw,46rem)] lg:max-w-[min(68%,48rem)]"
                          }`}
                        >
                          {/* Message Bubble */}
                          <div
                            className={`w-fit max-w-full rounded-[22px] shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${
                              hasAttachment && !hasText ? "px-2 py-2" : "px-4 py-3"
                            } ${hiddenBubbleClasses} ${msg.status === 'sending' ? 'opacity-80' : ''} ${
                              isScheduledMessage ? "border border-violet-300/70 bg-violet-600 text-white" : ""
                            } ${
                              pressedMessageId === msg.id ? "ring-2 ring-blue-400/60" : ""
                            } ${
                              isSelected
                                ? isCurrentUser
                                  ? "ring-2 ring-emerald-300 shadow-lg"
                                  : "bg-emerald-50 ring-2 ring-emerald-500 shadow-lg dark:bg-emerald-950/30"
                                : ""
                            } ${
                              isSelectionMode ? "cursor-pointer" : ""
                            }`}
                            onClick={(event) => {
                              if (isSelectionMode) {
                                event.preventDefault();
                                onToggleMessageSelection(msg);
                                return;
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (isSelectionMode) return;
                              onStartMessageSelection(msg);
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

                            {selectedUser?.chatType === "group" && !isCurrentUser ? (
                              <div className="mb-1 max-w-full truncate text-xs font-semibold text-blue-600 dark:text-blue-300">
                                {msg.senderName || "Member"}
                              </div>
                            ) : null}

                            {isScheduledMessage ? (
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-100">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1">
                                  <Clock size={12} />
                                  Scheduled
                                </span>
                                {msg.scheduledStatus === "cancelled" ? (
                                  <span>Cancelled</span>
                                ) : (
                                  <span>{formatCountdown(msg.scheduledFor)} left</span>
                                )}
                              </div>
                            ) : null}

                            {/* Reply indicator */}
                            {msg.replyToId && (
                              <div className="mb-2 rounded-lg border-l-4 border-blue-400 bg-black/10 p-2 dark:bg-white/10">
                                <p className="text-xs italic opacity-75">Replying to a message</p>
                              </div>
                            )}

                            {renderAttachment(msg.attachments?.[0])}
                            {hasText && (
                              <div className={`break-words text-[15px] leading-relaxed [overflow-wrap:break-word] ${
                                isAiAssistantMessage
                                  ? "space-y-2 whitespace-normal"
                                  : "whitespace-pre-wrap"
                              }`}>
                                {isAiAssistantMessage
                                  ? renderAiMarkdown(visibleMessageText)
                                  : renderMessageText(visibleMessageText)}
                                {isMessageStreaming ? (
                                  <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-current align-[-2px] opacity-70" />
                                ) : null}
                              </div>
                            )}

                            {isMessageStreaming && !hasText ? (
                              <div className="flex items-center gap-2 text-sm opacity-80">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Thinking...
                              </div>
                            ) : null}

                            {isAiAssistantMessage && hasText ? (
                              <AiMessageActions
                                text={visibleMessageText}
                                hasArtifact={hasStructuredArtifact(visibleMessageText)}
                                onOpenArtifact={openArtifactWorkspace}
                              />
                            ) : null}

                            {/* Message timestamp and status */}
                            <div className="mt-1 flex items-center justify-end">
                              <span className="mr-2 text-xs opacity-75">
                                {new Date(
                                  isScheduledMessage && msg.scheduledFor
                                    ? msg.scheduledFor
                                    : msg.timestamp
                                ).toLocaleTimeString([], {
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

                          {isCurrentUser && isScheduledMessage ? (
                            <div className="mt-1 flex flex-wrap justify-end gap-1 text-xs">
                              {msg.scheduledStatus !== "cancelled" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onEditScheduledMessage(msg)}
                                    className="inline-flex items-center gap-1 rounded-full border border-violet-200 px-2 py-1 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950"
                                  >
                                    <Edit3 size={12} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRescheduleMessage(msg)}
                                    className="inline-flex items-center gap-1 rounded-full border border-violet-200 px-2 py-1 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950"
                                  >
                                    <Clock size={12} />
                                    Reschedule
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onCancelScheduledMessage(msg)}
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-2 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
                                  >
                                    <X size={12} />
                                    Cancel
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => onDeleteScheduledMessage(msg)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              {isPeerTyping ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-none bg-gray-200 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <span className="typing-indicator" aria-label="Typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  </div>
                </div>
              ) : null}
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
        <div
          className={`fixed bottom-0 left-0 right-0 max-w-full overflow-x-hidden border-t transition-[right] duration-300 lg:left-80 ${
            isAiConversation
              ? "border-white/50 bg-white/70 shadow-2xl shadow-gray-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-gray-950/70"
              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-black"
          }`}
          style={{
            right:
              !isMobile && isAiConversation && activeArtifact && isArtifactWorkspaceOpen
                ? `${previewWidth + 24}px`
                : undefined,
          }}
        >
          {isSelectionMode ? (
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              Selection mode is active. Use the top bar actions or clear the selection to resume chatting.
            </div>
          ) : isChatBlocked ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              Messaging is disabled for this chat until the user is unblocked.
            </div>
          ) : null}
          {showPremiumPrompt && !isPremiumUser && !isSelectionMode && !isChatBlocked ? (
            <div className="border-b border-amber-100 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-950/10 sm:p-4">
              <PremiumUpgradePrompt
                description={
                  selectedUser?.chatType === "group"
                    ? "Improve your group messages using AI."
                    : undefined
                }
                onClose={() => setShowPremiumPrompt(false)}
                onUpgrade={handleUpgradeToPremium}
              />
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
          <div className={`${isAiConversation ? "mx-auto max-w-5xl p-3 sm:p-4" : "p-3 sm:p-4"}`}>
            {!isSelectionMode && !isChatBlocked ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                {isAiConversation ? (
                  <div className="flex w-full gap-2 overflow-x-auto pb-1">
                    {isMobile && activeArtifact ? (
                      <button
                        type="button"
                        onClick={openArtifactWorkspace}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                      >
                        <Eye size={14} />
                        Preview
                      </button>
                    ) : null}
                    {/* {[
                      "Continue",
                      "Explain",
                      "Summarize",
                      "Optimize",
                      "Translate",
                      "Generate UI",
                      "Create API",
                      "Fix Errors",
                      "Improve Performance",
                      "Generate Tests",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setNewMessage(newMessage.trim() ? `${newMessage} ${suggestion.toLowerCase()}` : suggestion);
                          inputRef.current?.focus();
                        }}
                        className="shrink-0 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-300 dark:hover:text-emerald-200"
                      >
                        {suggestion}
                      </button>
                    ))} */}
                  </div>
                ) : null}
                <div className="inline-flex rounded-xl border border-gray-300 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900">
                  {(["normal", "vanish"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChatMode(mode)}
                      className={`rounded-lg px-2.5 py-1.5 font-medium capitalize transition ${
                        chatMode === mode
                          ? "bg-white text-blue-700 shadow-sm dark:bg-gray-800 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                  {canUsePolishedMode ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handlePolishedFeatureClick}
                        disabled={sendingMessage && chatMode === "polished"}
                        title={
                          isPremiumUser
                            ? "Polish with AI"
                            : "Premium required for Polished Chat"
                        }
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          chatMode === "polished"
                            ? "bg-white text-green-700 shadow-sm dark:bg-gray-800 dark:text-green-500"
                            : isPremiumUser
                              ? "text-gray-600 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {sendingMessage && chatMode === "polished" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : !isPremiumUser ? (
                          <Lock size={13} />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        {sendingMessage && chatMode === "polished"
                          ? "Polishing..."
                          : isPremiumUser
                            ? "Polished"
                            : "Polished"}
                        {!isPremiumUser ? (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                            Premium
                          </span>
                        ) : null}
                      </button>
                    </div>
                  ) : null}
                </div>
                {chatMode === "vanish" ? (
                  <label className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <Timer size={14} />
                    <select
                      value={vanishSeconds}
                      onChange={(event) => setVanishSeconds(Number(event.target.value))}
                      className="bg-transparent outline-none"
                    >
                      <option value={30}>30 sec</option>
                      <option value={60}>1 min</option>
                      <option value={300}>5 min</option>
                      <option value={900}>15 min</option>
                      <option value={3600}>1 hour</option>
                      <option value={86400}>24 hours</option>
                    </select>
                  </label>
                ) : null}
                <select
                  value={scheduleMode}
                  onChange={(event) =>
                    setScheduleMode(event.target.value as "now" | "delay" | "later")
                  }
                  className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="now">Send Now</option>
                  <option value="delay">Send After Delay</option>
                  <option value="later">Schedule for Later</option>
                </select>
                {scheduleMode === "delay" ? (
                  <select
                    value={delayMs}
                    onChange={(event) => setDelayMs(Number(event.target.value))}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <option value={60_000}>1 minute</option>
                    <option value={120_000}>2 minutes</option>
                    <option value={300_000}>5 minutes</option>
                    <option value={600_000}>10 minutes</option>
                    <option value={1_800_000}>30 minutes</option>
                    <option value={3_600_000}>1 hour</option>
                  </select>
                ) : null}
                {scheduleMode === "later" ? (
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(event) => setCustomDateTime(event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                ) : null}
              </div>
            ) : null}
            <div
              className={`flex min-w-0 items-end gap-2 sm:gap-3 ${
                isAiConversation
                  ? "rounded-[24px] border border-gray-200 bg-white/80 p-2 shadow-xl shadow-gray-950/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
                  : ""
              }`}
            >
              {/* Left Sidebar for additional actions */}
              <div className="flex shrink-0 items-center">
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
                  onClick={() => setShowAttachmentSheet(true)}
                  disabled={isComposerDisabled}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-blue-300"
                  aria-label="Open attachment menu"
                >
                  <Plus size={22} />
                </button>
              </div>
              
              {/* Text Area with Send Button on Side */}
              <div className="flex min-w-0 flex-1 items-end gap-2 sm:gap-3">
                <div className="relative min-w-0 flex-1">
                  {pendingAttachment && (
                    <div className="mb-2 w-full max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="max-w-full truncate text-sm font-medium text-gray-900 dark:text-white" title={pendingAttachment.fileName}>
                            {pendingAttachment.fileName}
                          </p>
                          <p className="break-words text-xs text-gray-500 dark:text-gray-400">
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
                          className="block max-h-[32vh] w-full rounded-xl object-contain"
                        />
                      )}
                      {pendingAttachment.type === "video" && (
                        <video
                          src={pendingAttachment.previewUrl}
                          controls
                          className="block max-h-[32vh] w-full rounded-xl bg-black"
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
                    placeholder={
                      isSelectionMode
                        ? "Selection mode active"
                        : isChatBlocked
                          ? "Unblock this user to send messages"
                          : isAiConversation
                            ? "Ask Orbito to reason, write, code, debug, or design..."
                            : "Type a message..."
                    }
                    disabled={isComposerDisabled}
                    className={`w-full resize-none border px-3 py-3 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-base ${
                      isAiConversation
                        ? "rounded-[18px] border-transparent bg-transparent text-gray-950 placeholder:text-gray-400 focus:ring-0 dark:text-white"
                        : "rounded-2xl border-gray-300 bg-gray-50 focus:ring-2 focus:ring-gray-500 dark:border-gray-700 dark:bg-gray-800"
                    }`}
                    rows={1}
                    style={{ minHeight: isAiConversation ? "56px" : "48px", maxHeight: "192px" }}
                  />
                </div>
                
                {/* Send Button on Side */}
                <button
                  type="button"
                  onClick={latestStreamingAiMessage ? handleStopGenerating : handleSendClick}
                  disabled={
                    latestStreamingAiMessage
                      ? false
                      : isComposerDisabled ||
                        sendingMessage ||
                        (!newMessage.trim() && !pendingAttachment) ||
                        (scheduleMode === "later" && !customDateTime) ||
                        (isConnected !== undefined && !isConnected)
                  }
                  className={`flex items-center justify-center rounded-2xl p-3 text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${
                    latestStreamingAiMessage
                      ? "bg-gray-950 hover:scale-105 dark:bg-white dark:text-gray-950"
                      : isAiConversation
                      ? "bg-gradient-to-br from-emerald-500 to-cyan-500 hover:scale-105"
                      : "bg-green-700 hover:bg-green-800"
                  }`}
                  style={{ minHeight: isAiConversation ? "52px" : "44px", minWidth: isAiConversation ? "52px" : "44px" }}
                  aria-label={latestStreamingAiMessage ? "Stop generating" : "Send message"}
                >
                  {latestStreamingAiMessage ? (
                    <>
                      <X size={20} />
                      <span className="hidden text-sm font-semibold sm:inline">Stop</span>
                    </>
                  ) : sendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : scheduleMode === "now" ? (
                    <Send size={20} />
                  ) : (
                    <Clock size={20} />
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
          <AnimatePresence>
            {showAttachmentSheet && !isSelectionMode ? (
              <>
                <motion.button
                  type="button"
                  className="fixed inset-0 z-[86] bg-black/35 lg:hidden"
                  aria-label="Close attachment menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAttachmentSheet(false)}
                />
                <motion.div
                  className="fixed inset-x-0 bottom-0 z-[87] rounded-t-[28px] border border-white/10 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:bg-gray-950 lg:absolute lg:bottom-full lg:left-3 lg:right-auto lg:mb-3 lg:w-80 lg:rounded-3xl lg:border-gray-200 lg:pb-4 dark:lg:border-gray-800"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                >
                  <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-700 lg:hidden" />
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-950 dark:text-white">
                        Add to message
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Choose an attachment or tool
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAttachmentSheet(false)}
                      className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-900"
                      aria-label="Close attachment menu"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        label: "Camera",
                        icon: Camera,
                        onClick: handleFileSelect,
                        color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300",
                      },
                      {
                        label: "Gallery",
                        icon: ImagePlus,
                        onClick: handleFileSelect,
                        color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300",
                      },
                      {
                        label: "Document",
                        icon: FileText,
                        onClick: handleFileSelect,
                        color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300",
                      },
                      {
                        label: "Voice",
                        icon: Mic,
                        onClick: () => inputRef.current?.focus(),
                        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300",
                      },
                      {
                        label: "Emoji",
                        icon: Smile,
                        onClick: () => setShowEmojiPicker(true),
                        color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300",
                      },
                      {
                        label: "Mention",
                        icon: AtSign,
                        onClick: () => {
                          setNewMessage(newMessage.endsWith(" ") || !newMessage ? `${newMessage}@` : `${newMessage} @`);
                          inputRef.current?.focus();
                        },
                        color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 dark:text-cyan-300",
                      },
                      {
                        label: "Location",
                        icon: MapPin,
                        onClick: () => inputRef.current?.focus(),
                        color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-300",
                      },
                      {
                        label: "Contact",
                        icon: Contact,
                        onClick: () => inputRef.current?.focus(),
                        color: "text-slate-600 bg-slate-100 dark:bg-slate-500/10 dark:text-slate-300",
                      },
                      {
                        label: "GIF",
                        icon: Sparkles,
                        onClick: () => inputRef.current?.focus(),
                        color: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
                      },
                      {
                        label: "Poll",
                        icon: BarChart3,
                        onClick: () => inputRef.current?.focus(),
                        color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300",
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          item.onClick();
                          setShowAttachmentSheet(false);
                        }}
                        className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition hover:bg-gray-50 active:scale-95 dark:hover:bg-gray-900"
                      >
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}>
                          <item.icon size={22} />
                        </span>
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {showEmojiPicker && !isSelectionMode ? (
              <>
                <motion.button
                  type="button"
                  className="fixed inset-0 z-[88] bg-black/25"
                  aria-label="Close emoji picker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEmojiPicker(false)}
                />
                <motion.div
                  ref={emojiPickerRef}
                  className="fixed inset-x-3 bottom-24 z-[89] rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-950 sm:left-auto sm:w-80"
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 24, opacity: 0 }}
                >
                  <div className="grid grid-cols-5 gap-2">
                    {commonEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleEmojiClick(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="h-11 w-11 rounded-xl text-2xl transition hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-800"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>
      )}
      {isAiConversation ? (
        <ArtifactWorkspace
          artifact={isArtifactWorkspaceOpen ? activeArtifact : null}
          onClose={closeArtifactWorkspace}
          isMobile={isMobile}
          previewWidth={previewWidth}
          onPreviewWidthChange={handlePreviewWidthChange}
        />
      ) : null}
    </div>
  );
}

export default React.memo(ChatArea);
