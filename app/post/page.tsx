"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  PlusCircle,
  Video,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Sparkles,
  Crown,
  Globe,
  Lock,
  Heart,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { BackButton } from "@/app/components/MobileBackBar";

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
  type: 'image' | 'video';
}

interface CreatePostProps {
  onPostCreated?: (post: any) => void;
}

/* ============================
   SHARED UI HELPERS
============================ */
function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

/** Small gold badge shown for premium users. */
function PremiumChip({ label = "Premium" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
      <Crown className="h-3 w-3" />
      {label}
    </span>
  );
}

/** Consistent control chip used for Photo / Video / Audience / Restrict. */
function ControlChip({
  icon,
  label,
  onPress,
  premium,
  disabled = false,
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  premium: boolean;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cx(
        "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-3.5 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:grid sm:h-11 sm:w-11 sm:place-items-center sm:px-0",
        premium
          ? cx(muted
              ? "border border-amber-300/25 bg-gray-900/60 text-amber-100/80 hover:bg-gray-800"
              : "border border-amber-300/30 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20")
          : cx(muted
              ? "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10")
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-xs font-semibold sm:hidden">{label}</span>
    </button>
  );
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dragDropRef = useRef<HTMLButtonElement | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ============================
      PREMIUM STATUS (UI ONLY)
  ============================ */
  const fetchPremiumStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/premium/status", {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setIsPremium(Boolean(data?.isPremium));
      }
    } catch {
      /* non-fatal; premium styling is cosmetic only */
    }
  }, []);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  /* ============================
      GENERATE UNIQUE ID
  ============================ */
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  /* ============================
      AUTO-SCROLL PREVIEWS
  ============================ */
  useEffect(() => {
    if (files.length > 1) {
      scrollIntervalRef.current = setInterval(() => {
        setCurrentPreviewIndex(prev => (prev + 1) % files.length);
      }, 3000);
      return () => {
        if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      };
    }
  }, [files.length]);

  const scrollToIndex = (index: number) => {
    setCurrentPreviewIndex(index);
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  console.log("Cloud name:", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
console.log("Preset:", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

  /* ============================
   CLOUDINARY UPLOAD & POST
============================ */
async function uploadMedia(file: File): Promise<string> {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("File too large (>50MB)");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
  );

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("Cloudinary error:", data);
    throw new Error(data.error?.message || "Failed to upload media");
  }

  return data.secure_url;
}


async function handleCreatePost() {
  if (!session) return router.push("/login");

  if (!content.trim() && files.length === 0) {
    return setError("Post cannot be empty");
  }

  setLoading(true);
  setError(null);

  try {
    // ✅ upload all media in parallel (FAST)
    const mediaUrls = await Promise.all(
      files.map(async (f) => {
        return uploadMedia(f.file);
      })
    );

    // ✅ now create post with URLs only
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        images: mediaUrls,
      }),
    });

    if (!res.ok) throw new Error("Failed to create post");

    const newPost = await res.json();

    onPostCreated?.(newPost);

    // reset UI
    setContent("");
    setFiles([]);
    setCurrentPreviewIndex(0);
    setSuccess("Posted successfully!");

    router.refresh();
    setTimeout(() => router.push("/feed"), 500);

  } catch (err: any) {
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
}


  /* ============================
      FILE HANDLING
  ============================ */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    addFiles(selected);
  }

  function addFiles(newFiles: File[]) {
    if (files.length + newFiles.length > 10) return setError("Max 10 files allowed");

    const processed = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: generateId(),
      type: file.type.startsWith('video') ? 'video' : 'image'
    })) as FileWithPreview[];

    setFiles(prev => [...prev, ...processed]);
    setError(null);
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (currentPreviewIndex > 0) setCurrentPreviewIndex(prev => prev - 1);
  }

  /* ============================
      DRAG & DROP
  ============================ */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    const valid = dropped.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (valid.length) addFiles(valid);
  };

  useEffect(() => {
    return () => files.forEach(f => URL.revokeObjectURL(f.preview));
  }, []);

  const charCount = content.length;
  const overLimit = charCount > 1800;
  const canPost = content.trim().length > 0 || files.length > 0;
  const uploadingAll = loading && files.length > 0;
  const buttonLabel = loading ? (uploadingAll ? "Uploading…" : "Posting…") : "Post";

  /* ============================
      RENDER
  ============================ */
  return (
    // Mobile: pinned between the fixed top navbar (top-16) and above the fixed
    // bottom nav (bottom-16). Desktop: static, max-height drawer in the flow.
    <div
      aria-label="Create a post"
      className={cx(
        "flex flex-col fixed inset-x-0 top-16 bottom-16 z-40 sm:static sm:z-auto sm:h-auto sm:max-h-[80vh] w-full min-w-0 sm:rounded-[1.75rem] overflow-hidden relative font-sans",
        isPremium
          ? "bg-[radial-gradient(120%_60%_at_0%_0%,rgba(212,167,44,0.10),transparent_55%),radial-gradient(110%_70%_at_100%_100%,rgba(184,134,11,0.06),transparent_60%)] bg-gray-950"
          : "bg-white dark:bg-gray-900"
      )}
    >
      {/* 1. SCROLLABLE CONTENT
          pb clears the sticky bottom action bar so nothing is ever hidden. */}
      <div className="flex-1 overflow-y-auto touch-pan-y overscroll-contain p-4 sm:p-7 custom-scrollbar pb-[12rem] sm:pb-44">
        {/* ===== COMPACT TOP HEADER ===== */}
        <header className="flex items-center gap-3 py-1">
          <BackButton className="lg:hidden -ml-1" />
          <div
            className={cx(
              "relative h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full",
              isPremium
                ? "bg-[conic-gradient(from_180deg_at_50%_50%,#caa03d_0deg,#8a6404_90deg,#1f2937_180deg,#b8860b_270deg,#caa03d_360deg)] p-[2px] shadow-[0_0_16px_rgba(184,134,11,0.35)]"
                : "bg-gradient-to-br from-gray-500 to-gray-800 ring-2 ring-white dark:ring-gray-800"
            )}
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-gray-700 to-gray-900">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="User" width={44} height={44} className="object-cover" />
              ) : (
                <span className="text-[15px] font-bold text-white">{session?.user?.name?.[0] || "U"}</span>
              )}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[15px] font-bold text-gray-900 dark:text-white">
                {session?.user?.name || "You"}
              </span>
              {isPremium && <PremiumChip />}
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {isPremium ? "Premium Studio" : "Create a new post"}
            </p>
          </div>
          {isPremium && (
            <Sparkles className="h-5 w-5 shrink-0 text-amber-300/90" />
          )}
        </header>

        {/* ===== COMPOSER CARD ===== */}
        <div
          className={cx(
            "mt-4 rounded-2xl transition-colors",
            isPremium
              ? "border border-amber-300/20 bg-gray-900/40 shadow-[0_0_24px_-12px_rgba(184,134,11,0.4)]"
              : "border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60"
          )}
        >
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            enterKeyHint="send"
            aria-label="Post content"
            className="w-full min-h-[150px] rounded-xl bg-transparent px-4 py-4 outline-none resize-none text-[17px] leading-relaxed text-gray-900 placeholder:text-gray-400 dark:text-slate-50 dark:placeholder:text-slate-500 focus:ring-0"
          />
          <div className="flex items-center justify-between px-3 py-2">
            <span className={cx("flex items-center gap-1 text-[11px] font-medium", isPremium ? "text-amber-200/70" : "text-gray-400 dark:text-gray-500")}>
              <PlusCircle size={12} />
              {files.length === 0 ? "Add media below" : `${files.length} attached`}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-600">Markdown supported</span>
          </div>
        </div>

        {/* ===== MEDIA SECTION (separated from the editor) ===== */}
        <section className="mt-4" aria-label="Media">
          {/* Selected files => preview carousel */}
          {files.length > 0 && (
            <div className="relative mt-2 aspect-video w-full max-w-full overflow-hidden rounded-2xl bg-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  className={cx(
                    "absolute inset-0 transition-opacity duration-300",
                    idx === currentPreviewIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                  )}
                >
                  {file.type === 'video' ? (
                    <video src={file.preview} className="h-full w-full object-contain" controls />
                  ) : (
                    <Image src={file.preview} alt="Preview" fill className="object-contain" />
                  )}

                  <button
                    onClick={() => removeFile(file.id)}
                    aria-label="Remove media"
                    className="absolute right-2.5 top-2.5 z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition-all hover:bg-red-600 active:scale-95 hover:scale-105"
                  >
                    <X size={18} />
                  </button>

                  {file.type === 'video' && (
                    <span className="absolute bottom-2.5 left-2.5 z-20 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">
                      <Video size={12} />
                      Video
                    </span>
                  )}
                </div>
              ))}

              {files.length > 1 && (
                <>
                  <button
                    onClick={() => scrollToIndex((currentPreviewIndex - 1 + files.length) % files.length)}
                    aria-label="Previous media"
                    className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-all hover:bg-black/70 active:scale-95 sm:opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => scrollToIndex((currentPreviewIndex + 1) % files.length)}
                    aria-label="Next media"
                    className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-all hover:bg-black/70 active:scale-95 sm:opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={20} />
                  </button>

                  <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
                    {files.map((_, idx) => (
                      <span
                        key={idx}
                        className={cx(
                          "h-1.5 w-1.5 rounded-full transition-all",
                          idx === currentPreviewIndex ? "w-4 bg-white" : "bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload zone: tappable picker when empty, "add more" row when previewing */}
          <button
            type="button"
            ref={dragDropRef}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            aria-label="Add photos or videos to your post"
            className={cx(
              "mt-2 grid w-full place-items-center rounded-2xl border-[1.5px] border-dashed transition-all select-none disabled:opacity-60",
              files.length === 0 ? "px-6 py-9" : "px-4 py-3.5",
              isDragging
                ? cx("scale-[1.02] border-amber-400 bg-amber-400/10", isPremium ? "border-amber-400" : "border-blue-500 bg-blue-500/10")
                : cx(files.length === 0 ? "border-gray-300 hover:border-gray-400" : "border-gray-300/70 hover:border-gray-400", "dark:border-gray-700 dark:hover:border-gray-500")
            )}
          >
            <div className={cx("flex flex-col items-center gap-2.5 pointer-events-none", files.length === 0 ? "" : "sm:hidden")}>
              <div className={cx("grid h-14 w-14 place-items-center rounded-2xl", isDragging ? "bg-amber-400/20 text-amber-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                {isDragging ? <PlusCircle size={26} /> : <Upload size={26} />}
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {isDragging ? "Release to add media" : "Add photos or videos"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Tap to open your files · up to 10 files · 50MB each
              </p>
            </div>
            {files.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 sm:inline-flex">
                <PlusCircle size={16} className="shrink-0" />
                <span>Add more media</span>
              </div>
            )}
          </button>
        </section>

        {/* -------- STATUS MESSAGES -------- */}
        {error && (
          <div className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-400" role="alert">
            <X size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-400" role="status">
            <Heart size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 break-words">{success}</span>
          </div>
        )}
      </div>

      {/* 2. STICKY BOTTOM ACTION BAR
          Always reachable above the fixed bottom nav, including with keyboard open. */}
      <div
        className={cx(
          "absolute bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md",
          isPremium
            ? "border-amber-300/20 bg-gray-950/90"
            : "border-gray-200 bg-white/95 dark:border-gray-800 dark:bg-gray-900/95"
        )}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/* Controls + desktop Post button */}
        <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 sm:flex-nowrap sm:gap-2 sm:px-4">
          <ControlChip
            icon={<ImageIcon size={20} />}
            label="Photo"
            onPress={() => fileInputRef.current?.click()}
            premium={isPremium}
            disabled={loading}
          />
          <ControlChip
            icon={<Video size={20} />}
            label="Video"
            onPress={() => videoInputRef.current?.click()}
            premium={isPremium}
            disabled={loading}
          />
          <span className={cx("mx-0.5 hidden h-6 w-px sm:mx-1 sm:block", isPremium ? "bg-amber-300/20" : "bg-gray-500/40 dark:bg-gray-600/60")} />
          <ControlChip
            icon={<Globe size={20} />}
            label="Audience"
            premium={isPremium}
            muted
          />
          <ControlChip
            icon={<Lock size={20} />}
            label="Restrict"
            premium={isPremium}
            muted
          />

          {/* Desktop: counter + inline Post */}
          <span className={cx("ml-auto hidden text-xs tabular-nums sm:inline", overLimit ? "font-bold text-red-400" : isPremium ? "text-amber-200/80" : "text-gray-400 dark:text-gray-500")}>
            {charCount}/2000
          </span>
          <button
            onClick={handleCreatePost}
            disabled={loading || !canPost}
            className={cx(
              "group hidden min-h-11 min-w-[120px] items-center justify-center gap-2 rounded-full px-5 text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex",
              isPremium
                ? "bg-gradient-to-r from-[#caa03d] via-[#b8860b] to-[#8a6404] text-stone-950"
                : "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
            )}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
            <span>{buttonLabel}</span>
          </button>
        </div>

        {/* Mobile: counter + status row */}
        <div className="flex items-center justify-between gap-3 px-3.5 pt-1.5 sm:hidden">
          <span className={cx("text-xs tabular-nums", overLimit ? "font-bold text-red-400" : isPremium ? "text-amber-200/80" : "text-gray-400 dark:text-gray-500")}>
            {charCount}/2000
          </span>
          <span className={cx("text-[11px] font-medium", isPremium ? "text-amber-200/70" : "text-gray-400 dark:text-gray-500")}>
            {canPost ? (loading ? "Hold tight…" : "Ready to publish") : "Add text or media"}
          </span>
        </div>

        {/* Mobile: full-width Post button */}
        <button
          onClick={handleCreatePost}
          disabled={loading || !canPost}
          className={cx(
            "group flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl px-4 text-[15px] font-bold shadow-lg transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:hidden",
            isPremium
              ? "bg-gradient-to-r from-[#caa03d] via-[#b8860b] to-[#8a6404] text-stone-950 shadow-[0_0_0_1px_rgba(184,134,11,0.2),0_10px_30px_-10px_rgba(184,134,11,0.5)]"
              : "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
          )}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <PlusCircle size={20} />}
          <span>{buttonLabel}</span>
        </button>

        {/* Upload progress (mobile + desktop) */}
        {loading && files.length > 0 && (
          <div className="mt-2 flex w-full items-center gap-2 px-3.5 sm:mt-2.5 sm:px-4">
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-gray-700/40">
              <div className="absolute inset-y-0 left-0 w-1/3 animate-[postprogress_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-500/70 to-cyan-400/80" />
            </div>
            <span className={cx("shrink-0 text-[11px] font-medium", isPremium ? "text-amber-200/70" : "text-gray-400 dark:text-gray-500")}>
              Uploading {files.length} file{files.length === 1 ? "" : "s"}…
            </span>
          </div>
        )}
      </div>

      {/* Hidden native pickers (opened via Photo/Video chips or the tap-to-upload zone) */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFileChange(e, 'image')} />
      <input ref={videoInputRef} type="file" accept="video/*" multiple hidden onChange={(e) => handleFileChange(e, 'video')} />
    </div>
  );
}