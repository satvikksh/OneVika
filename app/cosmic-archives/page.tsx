"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Globe2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Search,
  Zap,
  Brain,
  Lock,
  Unlock,
  ChevronRight,
  Star,
  Layers,
  Shield,
  Database,
  Filter,
  Eye,
  Download,
  Share2,
  Bookmark,
  X,
  Menu,
} from "lucide-react";

/* ================= TYPES (ONLY ADDITION) ================= */

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
};

type Archive = {
  id: string;
  title: string;
  category: string;
  era: string;
  description: string;
  detailedDescription: string;
  level: string;
  accessLevel: number;
  users: number;
  lastAccessed: string;
  tags: string[];
  color: string;
};

/* ================= DATA (UNCHANGED) ================= */

const archives: Archive[] = [
  {
    id: "void-codex",
    title: "The Void Codex",
    category: "Forbidden Knowledge",
    era: "Pre-Reality",
    description: "Scripts written before time existed. Said to describe the rules that reality forgot.",
    detailedDescription: "Contains quantum equations that predate universal constants. Reading these texts has been known to cause temporal paradoxes in unshielded observers.",
    level: "Omega",
    accessLevel: 5,
    users: 42,
    lastAccessed: "2 hours ago",
    tags: ["anomalous", "temporal", "paradox"],
    color: "from-violet-600 to-indigo-600"
  },
  {
    id: "chrono-scrolls",
    title: "Chrono Scrolls",
    category: "Time Records",
    era: "All Timelines",
    description: "A living record of alternate timelines that collapsed or never formed.",
    detailedDescription: "Dynamic manuscripts that rewrite themselves based on temporal fluctuations. Each viewing reveals a different branching reality.",
    level: "Sigma",
    accessLevel: 4,
    users: 128,
    lastAccessed: "5 minutes ago",
    tags: ["temporal", "multiverse", "dynamic"],
    color: "from-cyan-600 to-blue-600"
  },
  {
    id: "astral-atlas",
    title: "Astral Atlas",
    category: "Cosmic Maps",
    era: "Eternal",
    description: "Star systems that exist only in imagination yet influence real thought.",
    detailedDescription: "Interactive star charts of conceptual constellations. Each celestial body represents an idea or archetype, with gravitational relationships showing conceptual connections.",
    level: "Alpha",
    accessLevel: 1,
    users: 2456,
    lastAccessed: "Now",
    tags: ["conceptual", "interactive", "archetypal"],
    color: "from-purple-600 to-pink-600"
  },
  {
    id: "echoes-ancients",
    title: "Echoes of the Ancients",
    category: "Lost Civilizations",
    era: "Unknown",
    description: "Fragments of civilizations erased from causality itself.",
    detailedDescription: "Archaeological records of societies that existed in probability spaces. Their technology operated on principles of quantum archaeology.",
    level: "Delta",
    accessLevel: 3,
    users: 78,
    lastAccessed: "1 day ago",
    tags: ["lost", "quantum", "archaeology"],
    color: "from-amber-600 to-orange-600"
  },
  {
    id: "quantum-memories",
    title: "Quantum Memories",
    category: "Consciousness Archive",
    era: "Trans-temporal",
    description: "Preserved consciousness patterns from ascended beings.",
    detailedDescription: "Neural imprint data from post-physical entities. Each memory packet contains experiential data from non-linear timeframes.",
    level: "Gamma",
    accessLevel: 4,
    users: 512,
    lastAccessed: "30 minutes ago",
    tags: ["consciousness", "neural", "ascended"],
    color: "from-emerald-600 to-teal-600"
  },
  {
    id: "harmonic-matrices",
    title: "Harmonic Matrices",
    category: "Reality Code",
    era: "Foundation",
    description: "The mathematical underpinnings of subjective reality.",
    detailedDescription: "Frequency-based reality templates that describe how consciousness interacts with probability fields to manifest experience.",
    level: "Beta",
    accessLevel: 2,
    users: 892,
    lastAccessed: "12 hours ago",
    tags: ["mathematical", "frequency", "template"],
    color: "from-rose-600 to-red-600"
  },
  {
    id: "dream-logosphere",
    title: "Dream Logosphere",
    category: "Collective Unconscious",
    era: "Ongoing",
    description: "Recorded dreams from parallel dreamscapes.",
    detailedDescription: "A collaborative dream database where dreamers contribute and analyze archetypal patterns across the collective unconscious.",
    level: "Alpha",
    accessLevel: 1,
    users: 3100,
    lastAccessed: "Now",
    tags: ["dreams", "collective", "archetypes"],
    color: "from-blue-600 to-cyan-600"
  },
  {
    id: "codex-simulacra",
    title: "Codex Simulacra",
    category: "Simulation Theory",
    era: "Metaphysical",
    description: "Evidence of nested reality layers and simulation parameters.",
    detailedDescription: "Technical documentation suggesting our reality operates within a computational framework, with debug logs and system parameters.",
    level: "Sigma",
    accessLevel: 5,
    users: 64,
    lastAccessed: "6 hours ago",
    tags: ["simulation", "computational", "metaphysical"],
    color: "from-green-600 to-emerald-600"
  }
];

const categories = ["All", "Forbidden Knowledge", "Time Records", "Cosmic Maps", "Lost Civilizations", "Consciousness Archive", "Reality Code", "Collective Unconscious", "Simulation Theory"];
const eras = ["All", "Pre-Reality", "All Timelines", "Eternal", "Unknown", "Trans-temporal", "Foundation", "Ongoing", "Metaphysical"];
const levels = ["All", "Alpha", "Beta", "Gamma", "Delta", "Sigma", "Omega"];

/* ================= PAGE ================= */

export default function CosmicArchivesPage() {
  const [query, setQuery] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedEra, setSelectedEra] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [notification, setNotification] = useState("");
  const [userAccessLevel, setUserAccessLevel] = useState(3);
  const [showFilters, setShowFilters] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ===== EFFECT ===== */

  useEffect(() => {
    const particlesArray: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      particlesArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(particlesArray);
  }, []);

  /* ===== FILTER ===== */

  const filteredArchives = archives.filter((archive) => {
    const matchesQuery =
      archive.title.toLowerCase().includes(query.toLowerCase()) ||
      archive.description.toLowerCase().includes(query.toLowerCase()) ||
      archive.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || archive.category === selectedCategory;
    const matchesEra = selectedEra === "All" || archive.era === selectedEra;
    const matchesLevel = selectedLevel === "All" || archive.level === selectedLevel;
    const hasAccess = userAccessLevel >= archive.accessLevel;

    return matchesQuery && matchesCategory && matchesEra && matchesLevel && hasAccess;
  });

  /* ===== ACTIONS ===== */

  const handleAccessArchive = (archive: Archive) => {
    if (userAccessLevel >= archive.accessLevel) {
      setSelectedArchive(archive);
      setNotification(`Accessing ${archive.title}...`);
    } else {
      setNotification(`Access Denied: Required clearance level ${archive.accessLevel}`);
    }
    setTimeout(() => setNotification(""), 3000);
  };

  const handleUpgradeAccess = () => {
    setUserAccessLevel((prev) => Math.min(prev + 1, 5));
    setNotification("Access level upgraded!");
    setTimeout(() => setNotification(""), 3000);
  };

  const closeModal = () => setSelectedArchive(null);

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("All");
    setSelectedEra("All");
    setSelectedLevel("All");
  };


  return (
    <div className="min-h-screen bg-linear-to-br from-black via-indigo-950/50 to-purple-950/30 text-white overflow-hidden" ref={containerRef}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-linear-to-r from-indigo-500/20 to-purple-500/20"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animation: `float ${10 / particle.speed}s infinite ease-in-out`,
              animationDelay: `${particle.id * 0.2}s`
            }}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-16 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-purple-500/5" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6 animate-pulse">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold tracking-wider">
                INTERDIMENSIONAL KNOWLEDGE VAULT
              </span>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cosmic Archives
              </span>
              <div className="text-2xl sm:text-3xl mt-4 font-light text-white/70">
                Where Imagination Meets Infinity
              </div>
            </h1>

            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              A living archive of knowledge from lost timelines, forbidden dimensions, 
              and realities that never stabilized. Explore concepts that bend reality itself.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-400">8,192+</div>
                <div className="text-sm text-white/60">Archives</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">42.7k</div>
                <div className="text-sm text-white/60">Active Researchers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">∞</div>
                <div className="text-sm text-white/60">Dimensions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">24/7</div>
                <div className="text-sm text-white/60">Temporal Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Controls */}
      <div className="sticky top-20 z-40 mb-12">
        <div className="container mx-auto px-6">
          {/* Main Search */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative flex items-center bg-black/60 border border-white/15 rounded-2xl px-6 py-4 backdrop-blur-xl">
                <Search className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search across realities... (Try 'quantum', 'dream', or 'simulation')"
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/40 px-4 text-lg"
                />
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all font-medium">
                  Neural Search
                  <Brain className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
              >
                <Filter className="w-5 h-5" />
                Filters
                <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Layers className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              <div className="text-sm text-white/60">
                {filteredArchives.length} of {archives.length} archives
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={handleUpgradeAccess}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg transition-all"
              >
                <Shield className="w-4 h-4" />
                Upgrade Access
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-slideDown">
              <div className="space-y-2">
                <label className="text-sm text-white/70 flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${selectedCategory === category ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Era
                </label>
                <div className="flex flex-wrap gap-2">
                  {eras.map(era => (
                    <button
                      key={era}
                      onClick={() => setSelectedEra(era)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${selectedEra === era ? 'bg-purple-600' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {era}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {levels.map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1 ${selectedLevel === level ? 'bg-rose-600' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {level === "Omega" && <Lock className="w-3 h-3" />}
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archives Grid */}
      <div className="container mx-auto px-6 pb-24">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredArchives.map((archive) => (
              <div
                key={archive.id}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative h-full p-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-500 hover:border-indigo-500/30">
                  {/* Access Badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${archive.accessLevel > 3 ? 'bg-rose-900/30 text-rose-400 border border-rose-500/30' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'}`}>
                      {archive.accessLevel > 3 ? (
                        <>
                          <Lock className="w-3 h-3 inline mr-1" />
                          {archive.level}
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 inline mr-1" />
                          {archive.level}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${archive.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <BookOpen className="w-7 h-7" />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {archive.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white/5 rounded text-xs text-white/70">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">
                    {archive.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-white/70 mb-4 line-clamp-2">
                    {archive.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-white/50 mb-6">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {archive.users}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {archive.lastAccessed}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {archive.accessLevel}.0
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccessArchive(archive)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r ${archive.color} hover:shadow-lg hover:scale-[1.02] transition-all font-medium group/btn`}
                      disabled={userAccessLevel < archive.accessLevel}
                    >
                      {userAccessLevel >= archive.accessLevel ? (
                        <>
                          Access Now
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Level {archive.accessLevel} Required
                        </>
                      )}
                    </button>
                    
                    <button className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                      <Bookmark className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-4">
            {filteredArchives.map(archive => (
              <div
                key={archive.id}
                className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${archive.color} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-xl font-bold">{archive.title}</h3>
                      <div className={`px-3 py-1 rounded-full text-xs ${archive.accessLevel > 3 ? 'bg-rose-900/30 text-rose-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                        {archive.level}
                      </div>
                    </div>
                    
                    <p className="text-white/70 mb-3">{archive.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <Globe2 className="w-4 h-4" />
                        {archive.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {archive.era}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {archive.users} active
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccessArchive(archive)}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all font-medium"
                    >
                      Access
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredArchives.length === 0 && (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-12 h-12 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No Archives Found</h3>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Try adjusting your filters or search terms. Some archives may require higher access levels.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all font-medium"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Archive Detail Modal */}
      {selectedArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900 to-black">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content */}
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedArchive.color} flex items-center justify-center`}>
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold">{selectedArchive.title}</h2>
                        <div className={`px-4 py-1 rounded-full text-sm ${selectedArchive.accessLevel > 3 ? 'bg-rose-900/50 text-rose-300 border border-rose-500/50' : 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/50'}`}>
                          {selectedArchive.level} LEVEL
                        </div>
                      </div>
                      <p className="text-white/60">{selectedArchive.category} • {selectedArchive.era}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold mb-4">Description</h3>
                  <p className="text-white/80 leading-relaxed">{selectedArchive.detailedDescription}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-white/60 mb-1">Access Level</div>
                    <div className="text-2xl font-bold">{selectedArchive.accessLevel}.0</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-white/60 mb-1">Active Users</div>
                    <div className="text-2xl font-bold">{selectedArchive.users}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-white/60 mb-1">Last Accessed</div>
                    <div className="text-xl font-bold">{selectedArchive.lastAccessed}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-white/60 mb-1">Temporal Stability</div>
                    <div className="text-xl font-bold text-emerald-400">94.7%</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedArchive.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-white/10 rounded-lg text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4">Warnings</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-amber-300">Reality Distortion</div>
                        <p className="text-sm text-amber-400/80">Excessive exposure may cause temporal disorientation</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                      <Brain className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-purple-300">Cognitive Load</div>
                        <p className="text-sm text-purple-400/80">Contains information that exceeds normal processing capacity</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8 pt-8 border-t border-white/10">
                <button
                  onClick={() => handleAccessArchive(selectedArchive)}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all font-bold text-lg"
                >
                  <Database className="w-5 h-5" />
                  Initialize Neural Interface
                </button>
                <button className="px-6 py-4 hover:bg-white/10 rounded-xl transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="px-6 py-4 hover:bg-white/10 rounded-xl transition-colors">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-slideInUp">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <span>{notification}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">Cosmic Archives</div>
                  <div className="text-sm text-white/60">v3.7.2</div>
                </div>
              </div>
              <p className="text-sm text-white/60">
                Where imagination meets the infinite. Exploring concepts beyond conventional reality.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Quick Access</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Recent Archives</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Popular Searches</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Temporal Index</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Reality Glossary</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Security</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Access Control</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Temporal Safeguards</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Reality Anchors</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Emergency Protocols</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Neural Network</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Researcher Forum</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Temporal Chat</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Emergency Breach</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/50">
            <p>Cosmic Archives • Satvik&apos;s Imaginary Collective</p>
            <p className="mt-2">Knowledge shown here may not obey physical laws. Use temporal safeguards.</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                System Status: Nominal
              </span>
              <span>•</span>
              <span>Reality Stability: 99.8%</span>
              <span>•</span>
              <span>Temporal Integrity: Secure</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}