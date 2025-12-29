"use client";

import { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Layers,
  Zap,
  Shield,
  Eye,
  Lock,
  Unlock,
  ArrowRight,
  Atom,
  Radar,
  Sparkles,
  X,
  Brain,
  Target,
  Wifi,
  BatteryCharging,
  Globe,
  Database,
  Code,
  ShieldAlert,
  Activity,
  ChevronRight,
  Gauge,
  CircuitBoard,
  CloudLightning,
  Satellite,
  Rocket
} from "lucide-react";

/* =======================
   TYPES
======================= */
type QuantumConstruct = {
  id: string;
  title: string;
  domain: string;
  stability: number;
  accessLevel: number;
  description: string;
  details: string;
  energy: string;
  color: string;
  icon: React.ReactNode;
  users: number;
  online: boolean;
  capacity: string;
  protocols: string[];
  warning?: string;
};

/* =======================
   DATA
======================= */
const constructs: QuantumConstruct[] = [
  {
    id: "reality-weaver",
    title: "Reality Weaver",
    domain: "Spacetime Manipulation",
    stability: 87,
    accessLevel: 4,
    energy: "Quantum Flux",
    description: "A lattice capable of bending local reality rules.",
    details: "Reality Weaver alters spacetime constants at a micro scale, enabling localized law rewrites without collapsing adjacent dimensions. Capable of creating temporary pockets of customized physics for experimental purposes.",
    color: "from-purple-600 to-indigo-600",
    icon: <Globe className="w-6 h-6" />,
    users: 42,
    online: true,
    capacity: "7.2 Teraqubits",
    protocols: ["Temporal Shielding", "Quantum Coherence", "Reality Anchoring"],
    warning: "Temporal distortions may occur"
  },
  {
    id: "probability-engine",
    title: "Probability Engine",
    domain: "Outcome Engineering",
    stability: 92,
    accessLevel: 3,
    energy: "Causal Fields",
    description: "Rewrites probability distributions in real-time.",
    details: "This construct shifts likelihood gradients, allowing improbable outcomes to become dominant within a controlled quantum shell. Used for predictive modeling and risk elimination in complex systems.",
    color: "from-cyan-600 to-blue-600",
    icon: <Target className="w-6 h-6" />,
    users: 128,
    online: true,
    capacity: "12.8 Teraqubits",
    protocols: ["Causality Buffer", "Outcome Stacking", "Probability Lens"]
  },
  {
    id: "void-architecture",
    title: "Void Architecture",
    domain: "Non-Existence Design",
    stability: 61,
    accessLevel: 5,
    energy: "Negative Matter",
    description: "Structures built from absence itself.",
    details: "Void Architecture exists partially outside spacetime, anchoring conceptual mass to stabilize nothingness into usable form. Requires quantum entanglement with non-existence matrices.",
    color: "from-rose-600 to-red-600",
    icon: <Database className="w-6 h-6" />,
    users: 8,
    online: false,
    capacity: "∞ Qubits",
    protocols: ["Null Field", "Existence Buffer", "Void Shielding"],
    warning: "Extreme cognitive hazard"
  },
  {
    id: "entanglement-core",
    title: "Entanglement Core",
    domain: "Instant Connectivity",
    stability: 96,
    accessLevel: 2,
    energy: "Quantum Entanglement",
    description: "Links distant constructs instantly.",
    details: "This core synchronizes multiple constructs across dimensions with zero latency using paired quantum states. Enables real-time communication across any distance or dimension.",
    color: "from-emerald-600 to-teal-600",
    icon: <Wifi className="w-6 h-6" />,
    users: 245,
    online: true,
    capacity: "3.4 Teraqubits",
    protocols: ["Quantum Sync", "Dimension Bridge", "Zero Latency"]
  },
  {
    id: "neural-matrix",
    title: "Neural Matrix",
    domain: "Cognitive Engineering",
    stability: 78,
    accessLevel: 3,
    energy: "Neuro-Quantum",
    description: "Collective consciousness interface.",
    details: "A quantum-enhanced neural network that interfaces directly with collective consciousness streams. Allows for shared cognition and distributed problem solving.",
    color: "from-violet-600 to-pink-600",
    icon: <Brain className="w-6 h-6" />,
    users: 89,
    online: true,
    capacity: "9.1 Teraqubits",
    protocols: ["Cognitive Link", "Neural Sync", "Consciousness Pool"]
  },
  {
    id: "chronos-cascade",
    title: "Chronos Cascade",
    domain: "Temporal Dynamics",
    stability: 84,
    accessLevel: 4,
    energy: "Chroniton Particles",
    description: "Manipulates temporal flow locally.",
    details: "Generates localized time fields where temporal flow can be accelerated, decelerated, or reversed within quantum-approved safety parameters.",
    color: "from-amber-600 to-orange-600",
    icon: <Activity className="w-6 h-6" />,
    users: 31,
    online: true,
    capacity: "5.6 Teraqubits",
    protocols: ["Time Dilation", "Chronal Shielding", "Temporal Buffer"],
    warning: "Causality violation risk"
  },
];

/* =======================
   PAGE
======================= */
export default function QuantumConstructsPage() {
  const [selected, setSelected] = useState<QuantumConstruct | null>(null);
  const [userAccessLevel, setUserAccessLevel] = useState(4);
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterStability, setFilterStability] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializedConstruct, setInitializedConstruct] = useState<string | null>(null);
  const [particles, setParticles] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate floating particles
  useEffect(() => {
    const particlesArray = [];
    for (let i = 0; i < 20; i++) {
      particlesArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
    setParticles(particlesArray);
  }, []);

  // Filter domains
  const domains = ["All", "Spacetime Manipulation", "Outcome Engineering", "Non-Existence Design", "Instant Connectivity", "Cognitive Engineering", "Temporal Dynamics"];

  // Filter constructs
  const filteredConstructs = constructs.filter(construct => {
    const matchesSearch = 
      construct.title.toLowerCase().includes(search.toLowerCase()) ||
      construct.domain.toLowerCase().includes(search.toLowerCase()) ||
      construct.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesDomain = filterDomain === "All" || construct.domain === filterDomain;
    const matchesStability = filterStability === null || construct.stability >= filterStability;
    const matchesAccess = userAccessLevel >= construct.accessLevel;

    return matchesSearch && matchesDomain && matchesStability && matchesAccess;
  });

  const handleInitialize = async (constructId: string) => {
    setIsInitializing(true);
    setInitializedConstruct(constructId);
    
    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsInitializing(false);
    setInitializedConstruct(null);
    setSelected(null);
  };

  const handleUpgradeAccess = () => {
    if (userAccessLevel < 5) {
      setUserAccessLevel(prev => prev + 1);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterDomain("All");
    setFilterStability(null);
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-black via-indigo-950/40 to-purple-950/30 text-white px-4 sm:px-6 py-8 sm:py-16 relative overflow-hidden"
    >
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10"
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
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* HERO */}
        <div className="max-w-6xl mx-auto text-center mb-12 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6 animate-pulse">
            <Atom className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold tracking-wider">QUANTUM REALITY ENGINEERING LAB</span>
            <CloudLightning className="w-4 h-4 text-purple-400" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Quantum Constructs
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-3xl mx-auto mb-8">
            Build structures that manipulate probability, spacetime, and existence itself.
            These constructs redefine what reality can become.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl">
              <CircuitBoard className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-lg font-bold">{constructs.length}</div>
                <div className="text-xs text-white/60">Constructs</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl">
              <BatteryCharging className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-lg font-bold">{constructs.filter(c => c.online).length}</div>
                <div className="text-xs text-white/60">Online</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl">
              <Shield className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-lg font-bold">Level {userAccessLevel}</div>
                <div className="text-xs text-white/60">Your Access</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl">
              <Satellite className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-lg font-bold">∞</div>
                <div className="text-xs text-white/60">Dimensions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                <div className="relative flex items-center bg-black/60 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur-xl">
                  <SearchIcon className="w-5 h-5 text-indigo-400 ml-2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search quantum constructs..."
                    className="w-full bg-transparent outline-none text-white placeholder:text-white/40 px-3 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            {/* Domain Filter */}
            <div className="flex gap-2">
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl outline-none text-sm"
              >
                {domains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
              
              <button
                onClick={clearFilters}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-xl transition-colors text-sm"
              >
                Clear
              </button>
              
              <button
                onClick={handleUpgradeAccess}
                className="px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all text-sm font-medium"
              >
                Upgrade
              </button>
            </div>
          </div>

          {/* Stability Filter */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/70">Minimum Stability</label>
              <span className="text-sm font-medium">
                {filterStability !== null ? `${filterStability}%` : "Any"}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={filterStability || 50}
              onChange={(e) => setFilterStability(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-indigo-500 [&::-webkit-slider-thumb]:to-purple-500"
            />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredConstructs.map((construct) => {
            const locked = userAccessLevel < construct.accessLevel;

            return (
              <div
                key={construct.id}
                className="group relative"
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${construct.color} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />
                
                {/* Card */}
                <div className="relative h-full p-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${construct.color} flex items-center justify-center`}>
                      {construct.icon}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${construct.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs text-white/60">
                          {construct.online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                      
                      {/* Access Level */}
                      <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
                        locked
                          ? "bg-rose-900/40 text-rose-300 border border-rose-500/40"
                          : "bg-emerald-900/40 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        Level {construct.accessLevel}
                      </div>
                    </div>
                  </div>

                  {/* Title & Domain */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-300 transition-colors">
                    {construct.title}
                  </h3>
                  <div className="text-sm text-white/60 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    {construct.domain}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-white/70 mb-6 line-clamp-2">
                    {construct.description}
                  </p>

                  {/* Stats */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Stability
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${construct.color}`}
                            style={{ width: `${construct.stability}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{construct.stability}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Energy
                      </span>
                      <span className="text-sm">{construct.energy}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Active Users
                      </span>
                      <span className="text-sm">{construct.users}</span>
                    </div>
                  </div>

                  {/* Warning */}
                  {construct.warning && (
                    <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-400 text-xs">
                        <ShieldAlert className="w-4 h-4" />
                        {construct.warning}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    disabled={locked}
                    onClick={() => setSelected(construct)}
                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      locked
                        ? "bg-white/5 cursor-not-allowed text-white/40"
                        : `bg-gradient-to-r ${construct.color} hover:shadow-lg hover:scale-[1.02]`
                    }`}
                  >
                    {locked ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Access Restricted
                      </>
                    ) : (
                      <>
                        Inspect Construct
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredConstructs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <CircuitBoard className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">No Constructs Found</h3>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Try adjusting your filters or search terms. Some constructs may require higher access levels.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* MODAL */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
            <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900 to-black">
              {/* Close Button */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Modal Content */}
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selected.color} flex items-center justify-center`}>
                    {selected.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-2xl sm:text-3xl font-bold">{selected.title}</h2>
                      <div className={`px-4 py-1 rounded-full text-sm ${userAccessLevel < selected.accessLevel ? 'bg-rose-900/50 text-rose-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                        Level {selected.accessLevel}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {selected.domain}
                      </span>
                      <span className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selected.online ? 'bg-green-500' : 'bg-red-500'}`} />
                        {selected.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="w-5 h-5 text-indigo-400" />
                      <div className="text-sm text-white/60">Stability</div>
                    </div>
                    <div className="text-2xl font-bold">{selected.stability}%</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <div className="text-sm text-white/60">Energy</div>
                    </div>
                    <div className="text-sm font-medium">{selected.energy}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-5 h-5 text-green-400" />
                      <div className="text-sm text-white/60">Users</div>
                    </div>
                    <div className="text-2xl font-bold">{selected.users}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-cyan-400" />
                      <div className="text-sm text-white/60">Capacity</div>
                    </div>
                    <div className="text-sm font-medium">{selected.capacity}</div>
                  </div>
                </div>

                {/* Details */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Description</h3>
                  <p className="text-white/70 leading-relaxed">{selected.details}</p>
                </div>

                {/* Protocols */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4">Active Protocols</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.protocols.map((protocol, index) => (
                      <div key={index} className="px-3 py-2 bg-white/5 rounded-lg text-sm flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-400" />
                        {protocol}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                {selected.warning && (
                  <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-amber-300 mb-1">Warning</div>
                        <p className="text-sm text-amber-400/80">{selected.warning}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => handleInitialize(selected.id)}
                    disabled={userAccessLevel < selected.accessLevel || isInitializing}
                    className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${
                      userAccessLevel < selected.accessLevel
                        ? 'bg-white/5 text-white/40 cursor-not-allowed'
                        : `bg-gradient-to-r ${selected.color} hover:shadow-xl`
                    }`}
                  >
                    {isInitializing && initializedConstruct === selected.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Initialize Construct
                      </>
                    )}
                  </button>
                  
                  <button className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Rocket className="w-5 h-5" />
                    Quick Deploy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
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

// Search Icon Component
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}