'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Heart,
  Download,
  Share2,
  ZoomIn,
  Grid,
  List,
  ChevronDown
} from "lucide-react";


// Define image type
interface GalleryImage {
  id: number;
  src: string;
  alt: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  likes: number;
  featured?: boolean;
}

// Mock data - replace with your actual images
const galleryImages: GalleryImage[] = [
  { 
    id: 1, 
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", 
    alt: "Mountain Landscape", 
    title: "Golden Peaks",
    description: "Beautiful mountain landscape at sunset",
    category: "nature",
    tags: ["mountains", "sunset", "landscape"],
    likes: 245,
    featured: true
  },
  { 
    id: 2, 
    src: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w-800&q=80", 
    alt: "City Skyline", 
    title: "Urban Dreams",
    description: "Modern city skyline at twilight",
    category: "urban",
    tags: ["city", "architecture", "night"],
    likes: 189
  },
  { 
    id: 3, 
    src: "https://images.unsplash.com/photo-1540206395-68808572332f?w=800&q=80", 
    alt: "Beach Sunset", 
    title: "Ocean Breeze",
    description: "Peaceful beach sunset scene",
    category: "nature",
    tags: ["beach", "sunset", "ocean"],
    likes: 312,
    featured: true
  },
  { 
    id: 4, 
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", 
    alt: "Abstract Art", 
    title: "Color Waves",
    description: "Abstract colorful art composition",
    category: "art",
    tags: ["abstract", "colorful", "art"],
    likes: 156
  },
  { 
    id: 5, 
    src: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80", 
    alt: "Minimal Design", 
    title: "Minimal Lines",
    description: "Clean minimalist architectural design",
    category: "architecture",
    tags: ["minimal", "design", "architecture"],
    likes: 201
  },
  { 
    id: 6, 
    src: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80", 
    alt: "Forest Path", 
    title: "Enchanted Forest",
    description: "Magical forest path covered in fog",
    category: "nature",
    tags: ["forest", "fog", "path"],
    likes: 278
  },
  { 
    id: 7, 
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", 
    alt: "Portrait", 
    title: "Portrait Session",
    description: "Professional portrait photography",
    category: "portrait",
    tags: ["portrait", "people", "photography"],
    likes: 134
  },
  { 
    id: 8, 
    src: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", 
    alt: "Wildlife", 
    title: "Wild Kingdom",
    description: "Wildlife in natural habitat",
    category: "wildlife",
    tags: ["animals", "wildlife", "nature"],
    likes: 289
  },
  { 
    id: 9, 
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", 
    alt: "Macro Photography", 
    title: "Tiny Worlds",
    description: "Macro photography details",
    category: "macro",
    tags: ["macro", "details", "closeup"],
    likes: 167
  },
];

const categories = ["All", "Nature", "Urban", "Art", "Architecture", "Portrait", "Wildlife", "Macro"];
const tags = ["mountains", "city", "sunset", "abstract", "minimal", "forest", "portrait", "animals", "macro"];

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedImages, setLikedImages] = useState<number[]>([]);

  // Filter images based on search, category, and tags
  const filteredImages = galleryImages.filter(image => {
    // Category filter
    if (filter !== "All" && image.category.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    
    // Search filter
    if (search && !image.title.toLowerCase().includes(search.toLowerCase()) && 
        !image.description.toLowerCase().includes(search.toLowerCase()) &&
        !image.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    
    // Tags filter
    if (selectedTags.length > 0 && !selectedTags.some(tag => image.tags.includes(tag))) {
      return false;
    }
    
    return true;
  });

  const openLightbox = (image: GalleryImage, index: number) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImage(null);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    let newIndex = currentImageIndex;
    if (direction === "next" && currentImageIndex < filteredImages.length - 1) {
      newIndex = currentImageIndex + 1;
    } else if (direction === "prev" && currentImageIndex > 0) {
      newIndex = currentImageIndex - 1;
    }
    setCurrentImageIndex(newIndex);
    setSelectedImage(filteredImages[newIndex]);
  };

  const toggleLike = (imageId: number) => {
    setLikedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const downloadImage = (image: GalleryImage) => {
    const link = document.createElement('a');
    link.href = image.src;
    link.download = `${image.title}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-transparent to-pink-600/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Gallery
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              A visual collection of creativity, memories, and moments captured by our community.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search images by title, description, or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-xl font-bold mb-2 flex items-center">
                <Filter className="mr-2" />
                Filters
              </h2>
              <p className="text-gray-400 text-sm">
                {filteredImages.length} of {galleryImages.length} images
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid" ? "bg-purple-500" : "hover:bg-white/10"
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list" ? "bg-purple-500" : "hover:bg-white/10"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">CATEGORIES</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    filter === category
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">POPULAR TAGS</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((image, index) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => openLightbox(image, index)}
              >
                {/* Featured Badge */}
                {/* {image.featured && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                      Featured
                    </span>
                  </div>
                )} */}

                {/* Image Container */}
                <div className="aspect-square overflow-hidden">
                  <div className="relative w-full h-full">
                    {/* <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    /> */}
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{image.title}</h3>
                  <p className="text-gray-200 text-sm mb-3">{image.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {image.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-white/20 text-white text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(image.id);
                      }}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <Heart 
                        className={`w-5 h-5 ${
                          likedImages.includes(image.id) 
                            ? "fill-red-500 text-red-500" 
                            : "text-white"
                        }`} 
                      />
                    </button>
                  </div>
                </div>

                {/* Zoom Icon */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-6">
            {filteredImages.map((image, index) => (
              <div
                key={image.id}
                className="group bg-white/5 border border-white/10 backdrop-blur-lg rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer"
                onClick={() => openLightbox(image, index)}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-64 h-64 relative flex-shrink-0">
                    {/* <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 256px"
                    />
                    {image.featured && (
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                          Featured
                        </span>
                      </div>
                    )} */}
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{image.title}</h3>
                        <p className="text-gray-300 mb-4">{image.description}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            {image.category}
                          </span>
                          {image.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-white/10 text-gray-300 text-sm rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(image.id);
                          }}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                          <Heart 
                            className={`w-5 h-5 ${
                              likedImages.includes(image.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-gray-300"
                            }`} 
                          />
                        </button>
                        <span className="text-gray-400 text-sm">{image.likes + (likedImages.includes(image.id) ? 1 : 0)} likes</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button className="text-sm text-gray-400 hover:text-white flex items-center">
                        <ZoomIn className="w-4 h-4 mr-1" />
                        View full size
                      </button>
                      <span className="text-xs text-gray-500">Click to expand</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredImages.length === 0 && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No images found</h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setFilter("All");
                  setSearch("");
                  setSelectedTags([]);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation Buttons */}
          <button
            onClick={() => navigateLightbox("prev")}
            disabled={currentImageIndex === 0}
            className="absolute left-6 top-1/2 transform -translate-y-1/2 z-50 p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={() => navigateLightbox("next")}
            disabled={currentImageIndex === filteredImages.length - 1}
            className="absolute right-6 top-1/2 transform -translate-y-1/2 z-50 p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          {/* Lightbox Content */}
          <div className="max-w-6xl w-full max-h-[90vh] flex flex-col lg:flex-row gap-8">
            {/* Image */}
            <div className="flex-1 relative min-h-[60vh] lg:min-h-[80vh] rounded-2xl overflow-hidden bg-white/5">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                fill
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 800px"
              />
            </div>

            {/* Image Info */}
            <div className="lg:w-96 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedImage.title}</h2>
                  <p className="text-gray-300 mb-4">{selectedImage.description}</p>
                </div>
                {selectedImage.featured && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    Featured
                  </span>
                )}
              </div>

              {/* Category & Tags */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-400">Category:</span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                    {selectedImage.category}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedImage.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-white/10 text-gray-300 text-sm rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold mb-1">
                    {selectedImage.likes + (likedImages.includes(selectedImage.id) ? 1 : 0)}
                  </div>
                  <div className="text-sm text-gray-400">Likes</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold mb-1">{selectedImage.id}</div>
                  <div className="text-sm text-gray-400">Image ID</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLike(selectedImage.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Heart 
                    className={`w-5 h-5 ${
                      likedImages.includes(selectedImage.id) 
                        ? "fill-red-500 text-red-500" 
                        : "text-white"
                    }`} 
                  />
                  {likedImages.includes(selectedImage.id) ? "Liked" : "Like"}
                </button>
                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 rounded-lg transition-opacity"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-sm text-white">
              {currentImageIndex + 1} / {filteredImages.length}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Skimagination. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              All images are used for demonstration purposes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}