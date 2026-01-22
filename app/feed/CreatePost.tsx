"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, PlusCircle, Video, X, Loader2, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { useSession } from "next-auth/react";

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
  type: 'image' | 'video';
}

export default function CreatePost({
  onPostCreated,
}: {
  onPostCreated: (post: any) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dragDropRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  /* ============================
      UPLOAD & POST LOGIC
  ============================ */
  async function uploadMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    
    // Check constraints locally first
    if (file.size > 50 * 1024 * 1024) throw new Error("File too large (>50MB)");

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  }

  async function handleCreatePost() {
    if (!session) return router.push("/login");
    if (!content.trim() && files.length === 0) return setError("Post cannot be empty");

    setLoading(true);
    setError(null);

    try {
      const mediaUrls: string[] = [];
      
      // Upload files sequentially
      for (const f of files) {
        try {
          const url = await uploadMedia(f.file);
          mediaUrls.push(url);
        } catch (e) {
          throw new Error(`Failed to upload ${f.file.name}`);
        }
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, images: mediaUrls }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      const newPost = await res.json();
      onPostCreated(newPost);
      
      // Reset
      setContent("");
      setFiles([]);
      setCurrentPreviewIndex(0);
      setSuccess("Posted successfully!");
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message);
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

  return (
    <div className="flex flex-col h-full max-h-[80vh] w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
      
      {/* 1. SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="User" width={40} height={40} className="object-cover" />
            ) : (
              <span className="text-white font-bold">{session?.user?.name?.[0] || "U"}</span>
            )}
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{session?.user?.name}</span>
        </div>

        {/* Text Area */}
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          className="w-full min-h-[100px] p-0 bg-transparent outline-none resize-none text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 border-none focus:ring-0"
        />

        {/* Preview Carousel (Only shows if files exist) */}
        {files.length > 0 && (
          <div className="relative mt-4 aspect-video bg-black rounded-xl overflow-hidden group">
            {files.map((file, idx) => (
              <div 
                key={file.id} 
                className={`absolute inset-0 transition-opacity duration-300 ${idx === currentPreviewIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                {file.type === 'video' ? (
                  <video src={file.preview} className="w-full h-full object-contain" controls />
                ) : (
                  <Image src={file.preview} alt="Preview" fill className="object-contain" />
                )}
                
                {/* Remove Button */}
                <button 
                  onClick={() => removeFile(file.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors z-20"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            
            {/* Navigation Arrows */}
            {files.length > 1 && (
              <>
                <button 
                  onClick={() => scrollToIndex((currentPreviewIndex - 1 + files.length) % files.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => scrollToIndex((currentPreviewIndex + 1) % files.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <ChevronRight size={20} />
                </button>
                
                {/* Dots Indicator */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {files.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentPreviewIndex ? 'bg-white' : 'bg-white/40'}`} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Compact Drag & Drop Zone */}
        <div
          ref={dragDropRef}
          onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
          className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            isDragging 
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
              : 'border-gray-200 dark:border-gray-700 hover:border-purple-400'
          }`}
        >
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Upload size={20} className="text-gray-500" />
            </div>
            <p className="text-sm text-gray-500">
              Drag & drop media here, or use the buttons below
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-500 text-center">{success}</p>}
      </div>

      {/* 2. STICKY FOOTER (Always Visible) */}
      <div className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
              title="Add Image"
            >
              <ImageIcon size={24} />
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFileChange(e, 'image')} />
            </button>
            <button 
              onClick={() => videoInputRef.current?.click()}
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Add Video"
            >
              <Video size={24} />
              <input ref={videoInputRef} type="file" accept="video/*" multiple hidden onChange={(e) => handleFileChange(e, 'video')} />
            </button>
          </div>

          <button
            onClick={handleCreatePost}
            disabled={loading || (!content.trim() && files.length === 0)}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
        
        {/* Character Count */}
        <div className="text-right mt-1">
          <span className={`text-xs ${content.length > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
            {content.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
}