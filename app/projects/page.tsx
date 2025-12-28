'use client';

import { useState } from 'react';
import { 
  Code, 
  Globe, 
  Github, 
  ExternalLink, 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp,
  Sparkles,
  Shield,
  Database,
  Cpu,
  Palette,
  Filter,
  ChevronRight,
  Star,
  Link as LinkIcon,
  CheckCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

// export const metadata = {
//   title: "Projects | Skimagination",
//   description:
//     "Explore our featured projects including system design, analytics platforms, AI-based solutions, and full-stack web applications.",
// };

interface Project {
  id: number;
  title: string;
  tagline: string;
  category: string;
  categoryIcon: React.ReactNode;
  description: string;
  longDescription: string;
  features: string[];
  tech: { name: string; icon: React.ReactNode }[];
  status: 'active' | 'completed' | 'research' | 'paused';
  progress: number;
  githubUrl?: string;
  liveUrl?: string;
  teamSize: number;
  duration: string;
  stars?: number;
  forks?: number;
  contributors?: number;
  highlights: string[];
  color: string;
}

const projects: Project[] = [
  {
    id: 1,
    title: "SMART – Smart Monitoring & Response System",
    tagline: "AI-Powered Safety Platform for Tourists",
    category: "AI + Safety Platform",
    categoryIcon: <Shield className="w-4 h-4" />,
    description:
      "SMART is an intelligent monitoring and response system designed to enhance tourist safety using real-time tracking, AI-based risk detection, and verified service providers.",
    longDescription:
      "A comprehensive safety platform leveraging artificial intelligence and real-time monitoring to ensure tourist safety. The system uses predictive analytics to identify potential risks and connects users with verified local guides and emergency services. Features include live location tracking, AI-powered anomaly detection, and instant SOS response mechanisms.",
    features: [
      "Real-time location monitoring with geofencing",
      "AI-based emergency prediction algorithms",
      "Identity-verified guides and agents network",
      "End-to-end encrypted data handling",
      "Instant SOS and rapid response mechanism",
      "Multi-language support for international users",
      "Offline emergency protocols"
    ],
    tech: [
      { name: "Next.js", icon: <Code className="w-4 h-4" /> },
      { name: "MongoDB", icon: <Database className="w-4 h-4" /> },
      { name: "NextAuth", icon: <Shield className="w-4 h-4" /> },
      { name: "TensorFlow", icon: <Cpu className="w-4 h-4" /> },
      { name: "WebSocket", icon: <Globe className="w-4 h-4" /> },
      { name: "Mapbox", icon: <Globe className="w-4 h-4" /> }
    ],
    status: 'active',
    progress: 75,
    githubUrl: "https://github.com/skimagination/smart-system",
    liveUrl: "https://smart.skimagination.com",
    teamSize: 8,
    duration: "6 months",
    stars: 234,
    forks: 45,
    contributors: 12,
    highlights: ["Featured in TechCrunch", "500+ Early Users", "Govt. Partnership"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: 2,
    title: "Analytics Dashboard Platform",
    tagline: "Real-Time Data Visualization & Insights",
    category: "Data Analytics",
    categoryIcon: <TrendingUp className="w-4 h-4" />,
    description:
      "A comprehensive analytics platform that visualizes system performance, user engagement, and growth metrics to support data-driven decisions.",
    longDescription:
      "An enterprise-grade analytics dashboard providing real-time insights into business metrics. Features interactive visualizations, predictive analytics, and automated reporting. The platform processes millions of data points daily to deliver actionable insights through an intuitive interface.",
    features: [
      "Real-time user growth tracking",
      "Engagement and retention metrics dashboards",
      "Performance monitoring and alerting",
      "Security and risk insights visualization",
      "Predictive analytics forecasting",
      "Custom report generation",
      "Team collaboration tools"
    ],
    tech: [
      { name: "React", icon: <Code className="w-4 h-4" /> },
      { name: "Next.js", icon: <Code className="w-4 h-4" /> },
      { name: "Tailwind CSS", icon: <Palette className="w-4 h-4" /> },
      { name: "Recharts", icon: <TrendingUp className="w-4 h-4" /> },
      { name: "Supabase", icon: <Database className="w-4 h-4" /> },
      { name: "Vercel", icon: <Globe className="w-4 h-4" /> }
    ],
    status: 'completed',
    progress: 100,
    githubUrl: "https://github.com/skimagination/analytics-dashboard",
    liveUrl: "https://analytics.skimagination.com",
    teamSize: 5,
    duration: "4 months",
    stars: 189,
    forks: 32,
    contributors: 6,
    highlights: ["100% Uptime", "10K+ Users", "Featured on Product Hunt"],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: 3,
    title: "User Profile & Content System",
    tagline: "Modern User Management Platform",
    category: "Full Stack Web App",
    categoryIcon: <Users className="w-4 h-4" />,
    description:
      "A modular user management and content platform with authentication, profile customization, and media upload capabilities.",
    longDescription:
      "A scalable user management system featuring secure authentication, profile customization, and content management. Built with modular architecture to support future integrations. The platform handles user authentication, media storage, and role-based access control with enterprise-grade security.",
    features: [
      "Secure authentication with JWT & OAuth",
      "Profile editing and privacy controls",
      "Advanced image upload and optimization",
      "Role-based access control system",
      "Social media integration",
      "Activity feed and notifications",
      "API-first architecture"
    ],
    tech: [
      { name: "Next.js", icon: <Code className="w-4 h-4" /> },
      { name: "MongoDB", icon: <Database className="w-4 h-4" /> },
      { name: "Cloudinary", icon: <Globe className="w-4 h-4" /> },
      { name: "Redis", icon: <Database className="w-4 h-4" /> },
      { name: "AWS S3", icon: <Globe className="w-4 h-4" /> },
      { name: "Docker", icon: <Cpu className="w-4 h-4" /> }
    ],
    status: 'active',
    progress: 90,
    githubUrl: "https://github.com/skimagination/user-platform",
    liveUrl: "https://users.skimagination.com",
    teamSize: 6,
    duration: "5 months",
    stars: 156,
    forks: 28,
    contributors: 8,
    highlights: ["10K+ Registered Users", "99.9% Uptime", "Enterprise Ready"],
    color: "from-green-500 to-emerald-500"
  },
  {
    id: 4,
    title: "AI Behavior Analysis Engine",
    tagline: "Predictive Analytics for User Behavior",
    category: "Artificial Intelligence",
    categoryIcon: <Cpu className="w-4 h-4" />,
    description:
      "An experimental AI engine designed to analyze user behavior patterns and predict potential risks or anomalies in real-time.",
    longDescription:
      "Cutting-edge AI system using machine learning algorithms to analyze user behavior patterns and predict anomalies. The engine processes behavioral data in real-time to identify potential risks, optimize user experiences, and provide predictive insights for business decisions.",
    features: [
      "Behavior pattern analysis using deep learning",
      "Real-time anomaly detection",
      "Predictive risk alerts system",
      "Scalable model architecture",
      "Automated model retraining",
      "Privacy-preserving analytics",
      "Multi-platform data ingestion"
    ],
    tech: [
      { name: "Python", icon: <Code className="w-4 h-4" /> },
      { name: "TensorFlow", icon: <Cpu className="w-4 h-4" /> },
      { name: "PyTorch", icon: <Cpu className="w-4 h-4" /> },
      { name: "FastAPI", icon: <Code className="w-4 h-4" /> },
      { name: "PostgreSQL", icon: <Database className="w-4 h-4" /> },
      { name: "Docker", icon: <Cpu className="w-4 h-4" /> }
    ],
    status: 'research',
    progress: 40,
    githubUrl: "https://github.com/skimagination/ai-engine",
    teamSize: 4,
    duration: "Ongoing",
    stars: 87,
    forks: 19,
    contributors: 5,
    highlights: ["Research Paper Published", "Patent Pending", "University Collaboration"],
    color: "from-orange-500 to-red-500"
  },
  {
    id: 5,
    title: "E-Commerce Microservices Platform",
    tagline: "Scalable Online Shopping Solution",
    category: "Microservices",
    categoryIcon: <Globe className="w-4 h-4" />,
    description:
      "A microservices-based e-commerce platform with inventory management, payment processing, and order fulfillment systems.",
    longDescription:
      "Modern e-commerce platform built with microservices architecture for scalability and reliability. Each service handles specific business capabilities including inventory, payments, orders, and user management, communicating through event-driven architecture.",
    features: [
      "Microservices architecture",
      "Real-time inventory management",
      "Multiple payment gateway integration",
      "Order tracking and fulfillment",
      "Recommendation engine",
      "Customer support chatbot",
      "Analytics and reporting"
    ],
    tech: [
      { name: "Node.js", icon: <Code className="w-4 h-4" /> },
      { name: "React", icon: <Code className="w-4 h-4" /> },
      { name: "Kubernetes", icon: <Cpu className="w-4 h-4" /> },
      { name: "Redis", icon: <Database className="w-4 h-4" /> },
      { name: "Stripe", icon: <Globe className="w-4 h-4" /> },
      { name: "Kafka", icon: <Cpu className="w-4 h-4" /> }
    ],
    status: 'paused',
    progress: 60,
    githubUrl: "https://github.com/skimagination/ecommerce-platform",
    teamSize: 7,
    duration: "8 months",
    stars: 112,
    forks: 23,
    contributors: 9,
    highlights: ["Microservices Architecture", "High Availability", "Load Tested"],
    color: "from-indigo-500 to-purple-500"
  }
];

const categories = ["All", "AI + Safety", "Data Analytics", "Full Stack", "Artificial Intelligence", "Microservices"];
const statuses = ["All", "Active", "Completed", "Research", "Paused"];

export default function ProjectsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProjects = projects.filter(project => {
    const categoryMatch = selectedCategory === "All" || 
      project.category.toLowerCase().includes(selectedCategory.toLowerCase());
    
    const statusMatch = selectedStatus === "All" || 
      project.status === selectedStatus.toLowerCase();
    
    return categoryMatch && statusMatch;
  });

  const getStatusIcon = (status: Project['status']) => {
    switch(status) {
      case 'active': return <PlayCircle className="w-4 h-4 text-green-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'research': return <Sparkles className="w-4 h-4 text-yellow-500" />;
      case 'paused': return <PauseCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch(status) {
      case 'active': return "bg-green-500/20 text-green-400 border-green-500/30";
      case 'completed': return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case 'research': return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case 'paused': return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-transparent to-pink-600/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Our Projects
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Explore our portfolio of innovative projects, from AI-powered platforms 
              to full-stack applications and research initiatives.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{projects.length}</div>
                <div className="text-sm text-gray-400">Total Projects</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {projects.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {projects.reduce((acc, p) => acc + (p.contributors || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Contributors</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {projects.reduce((acc, p) => acc + (p.stars || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">GitHub Stars</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-xl font-bold mb-2 flex items-center">
                <Filter className="mr-2" />
                Filter Projects
              </h2>
              <p className="text-gray-400 text-sm">
                {filteredProjects.length} of {projects.length} projects
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
                  <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-current rounded-sm" />
                    ))}
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list" ? "bg-purple-500" : "hover:bg-white/10"
                  }`}
                >
                  <div className="w-5 h-5 flex flex-col gap-0.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-current h-1 rounded-full" />
                    ))}
                  </div>
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
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">STATUS</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 ${
                    selectedStatus === status
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  }`}
                >
                  {status !== "All" && getStatusIcon(status.toLowerCase() as Project['status'])}
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                {/* Project Header */}
                <div className={`p-6 bg-gradient-to-r ${project.color}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {project.categoryIcon}
                      <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                        {project.category}
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="capitalize">{project.status}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
                  <p className="text-white/90">{project.tagline}</p>
                </div>

                {/* Project Body */}
                <div className="p-6">
                  <p className="text-gray-300 mb-4">{project.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">TECH STACK</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.slice(0, 4).map((tech, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm"
                        >
                          {tech.icon}
                          <span>{tech.name}</span>
                        </div>
                      ))}
                      {project.tech.length > 4 && (
                        <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm">
                          +{project.tech.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span>Team</span>
                      </div>
                      <div className="text-lg font-bold">{project.teamSize}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span>Duration</span>
                      </div>
                      <div className="text-lg font-bold">{project.duration}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-400 mb-1">
                        <Star className="w-4 h-4" />
                        <span>Stars</span>
                      </div>
                      <div className="text-lg font-bold">{project.stars || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-6">
                  <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity">
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-6">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${project.color} flex items-center justify-center`}>
                        {project.categoryIcon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{project.title}</h3>
                        <p className="text-gray-400 text-sm">{project.tagline}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-4">{project.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="text-sm capitalize">{project.status}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{project.teamSize} members</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{project.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="lg:w-64">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white mb-1">{project.progress}%</div>
                        <div className="text-xs text-gray-400">Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white mb-1">{project.stars || '0'}</div>
                        <div className="text-xs text-gray-400">Stars</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Github className="w-4 h-4" />
                          <span className="text-sm">GitHub</span>
                        </a>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 rounded-lg transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-sm">Live Demo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <Filter className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No projects found</h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your filters to see more projects.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedStatus("All");
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full my-auto">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl overflow-hidden">
              {/* Modal Header */}
              <div className={`p-8 bg-gradient-to-r ${selectedProject.color}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                        {selectedProject.category}
                      </span>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(selectedProject.status)}`}>
                        {getStatusIcon(selectedProject.status)}
                        <span className="capitalize">{selectedProject.status}</span>
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedProject.title}</h2>
                    <p className="text-xl text-white/90">{selectedProject.tagline}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column */}
                  <div className="lg:col-span-2">
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4">Description</h3>
                      <p className="text-gray-300 leading-relaxed">{selectedProject.longDescription}</p>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4">Key Features</h3>
                      <ul className="space-y-3">
                        {selectedProject.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3 text-gray-300">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4">Technology Stack</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {selectedProject.tech.map((tech, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <div className="p-2 bg-white/10 rounded-lg">
                              {tech.icon}
                            </div>
                            <span className="font-medium">{tech.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Project Stats */}
                    <div className="bg-white/5 rounded-xl p-6">
                      <h3 className="text-lg font-bold mb-4">Project Stats</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>Progress</span>
                            <span>{selectedProject.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                              style={{ width: `${selectedProject.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <div className="text-2xl font-bold">{selectedProject.teamSize}</div>
                            <div className="text-sm text-gray-400">Team Size</div>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <div className="text-2xl font-bold">{selectedProject.duration}</div>
                            <div className="text-sm text-gray-400">Duration</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-white/5 rounded-lg">
                            <div className="font-bold">{selectedProject.stars || '0'}</div>
                            <div className="text-xs text-gray-400">Stars</div>
                          </div>
                          <div className="text-center p-2 bg-white/5 rounded-lg">
                            <div className="font-bold">{selectedProject.forks || '0'}</div>
                            <div className="text-xs text-gray-400">Forks</div>
                          </div>
                          <div className="text-center p-2 bg-white/5 rounded-lg">
                            <div className="font-bold">{selectedProject.contributors || '0'}</div>
                            <div className="text-xs text-gray-400">Contributors</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="bg-white/5 rounded-xl p-6">
                      <h3 className="text-lg font-bold mb-4">Project Links</h3>
                      <div className="space-y-3">
                        {selectedProject.githubUrl && (
                          <a
                            href={selectedProject.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <Github className="w-5 h-5" />
                              <div>
                                <div className="font-medium">GitHub Repository</div>
                                <div className="text-sm text-gray-400">View source code</div>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        )}
                        {selectedProject.liveUrl && (
                          <a
                            href={selectedProject.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 rounded-lg transition-opacity group"
                          >
                            <div className="flex items-center gap-3">
                              <Globe className="w-5 h-5" />
                              <div>
                                <div className="font-medium">Live Demo</div>
                                <div className="text-sm opacity-90">Try it out</div>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Highlights */}
                    {selectedProject.highlights.length > 0 && (
                      <div className="bg-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-bold mb-4">Highlights</h3>
                        <div className="space-y-2">
                          {selectedProject.highlights.map((highlight, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <Sparkles className="w-4 h-4 text-yellow-400" />
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Skimagination. Projects Overview.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              All projects are developed with passion and commitment to excellence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}