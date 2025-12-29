"use client";

import { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  Search,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Video,
  BookOpen,
  Users,
  Globe,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Download,
  Copy,
  Bell,
  Settings,
  Zap,
  Cpu,
  Database,
  Wifi,
  Cloud,
  Server,
  Code,
  Terminal,
  Bug,
  RefreshCw,
  Award,
  Star,
  Heart,
  TrendingUp,
  Rocket,
  Coffee,
  Sparkles,
  Target,
  Palette,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Keyboard,
  Mouse,
  WifiOff,
  Battery,
  Thermometer,
  Cctv,
  Map,
  Navigation,
  Compass,
  Layers,
  Grid,
  Command,
  Power,
  Activity
} from "lucide-react";

export default function HelpSupportPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    priority: "normal",
    message: "",
    attachments: [] as File[]
  });
  
  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Live chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "support", time: "10:00 AM" },
    { id: 2, text: "I'm having trouble with neural connections.", sender: "user", time: "10:02 AM" }
  ]);
  const [newMessage, setNewMessage] = useState("");
  
  // System status
  const [systemStatus, setSystemStatus] = useState({
    neuralNetwork: "operational",
    quantumDatabase: "operational",
    realityEngine: "degraded",
    apiServices: "operational",
    aiAssistants: "maintenance",
    lastUpdated: "2 minutes ago"
  });
  
  // Active tab
  const [activeTab, setActiveTab] = useState("overview");
  
  // Ticket state
  const [supportTickets, setSupportTickets] = useState([
    { id: 1, subject: "Neural sync issues", status: "open", priority: "high", date: "2024-03-15", agent: "Alex Quantum" },
    { id: 2, subject: "Quantum database access", status: "in-progress", priority: "medium", date: "2024-03-14", agent: "Morgan Reality" },
    { id: 3, subject: "API rate limits", status: "resolved", priority: "low", date: "2024-03-13", agent: "Sam Synapse" }
  ]);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  // Video tutorials
  const videoTutorials = [
    { id: 1, title: "Getting Started", duration: "5:30", category: "basics", thumbnail: "🎯" },
    { id: 2, title: "Neural Network Setup", duration: "12:45", category: "neural", thumbnail: "🧠" },
    { id: 3, title: "Quantum Database", duration: "8:20", category: "database", thumbnail: "🌀" },
    { id: 4, title: "API Integration", duration: "15:10", category: "development", thumbnail: "🔌" },
    { id: 5, title: "Troubleshooting Guide", duration: "22:30", category: "troubleshooting", thumbnail: "🔧" },
    { id: 6, title: "Advanced Features", duration: "18:45", category: "advanced", thumbnail: "🚀" }
  ];
  
  // Help categories
  const helpCategories = [
    { icon: BookOpen, title: "Documentation", count: 142, color: "from-blue-500 to-cyan-500" },
    { icon: Video, title: "Video Tutorials", count: 36, color: "from-purple-500 to-pink-500" },
    { icon: FileText, title: "API Reference", count: 89, color: "from-green-500 to-emerald-500" },
    { icon: Users, title: "Community", count: 2456, color: "from-amber-500 to-orange-500" },
    { icon: Code, title: "Developer Tools", count: 24, color: "from-red-500 to-rose-500" },
    { icon: Terminal, title: "CLI Guide", count: 18, color: "from-indigo-500 to-violet-500" }
  ];
  
  // FAQ data
  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          id: 1,
          question: "How do I create my first neural network?",
          answer: "To create your first neural network, navigate to the Neural Nexus dashboard, click 'Create Network' in the top right, and follow the setup wizard. You'll need to define input layers, hidden layers, and output layers. The system will guide you through activation functions and optimization algorithms.",
          tags: ["basics", "neural", "setup"]
        },
        {
          id: 2,
          question: "What are the system requirements?",
          answer: "Minimum requirements: 8GB RAM, 4-core processor, 10GB free storage. Recommended: 16GB RAM, 8-core processor, 50GB SSD, NVIDIA GPU with CUDA support for accelerated neural processing. Browser support: Chrome 90+, Firefox 88+, Safari 14+.",
          tags: ["system", "requirements"]
        },
        {
          id: 3,
          question: "How do I import existing data?",
          answer: "You can import data via CSV, JSON, or through our API. Navigate to Data > Import, select your file format, and map columns to neural inputs. The system supports batch processing for large datasets up to 10GB.",
          tags: ["data", "import"]
        }
      ]
    },
    {
      category: "Neural Networks",
      questions: [
        {
          id: 4,
          question: "How do I optimize network performance?",
          answer: "Use our Auto-Optimize feature or manually adjust: 1) Increase/decrease layers 2) Adjust learning rate 3) Add dropout layers 4) Experiment with activation functions 5) Use batch normalization. Monitor performance in real-time using the analytics dashboard.",
          tags: ["optimization", "performance"]
        },
        {
          id: 5,
          question: "What's the difference between CNN and RNN?",
          answer: "CNN (Convolutional Neural Networks) are best for spatial data like images. RNN (Recurrent Neural Networks) excel at sequential data like time series or text. Our platform supports both with specialized templates for each use case.",
          tags: ["cnn", "rnn", "types"]
        },
        {
          id: 6,
          question: "How do I handle overfitting?",
          answer: "1) Use more training data 2) Apply regularization techniques 3) Add dropout layers 4) Implement early stopping 5) Use data augmentation. Our platform includes automatic overfitting detection and suggests fixes in real-time.",
          tags: ["overfitting", "training"]
        }
      ]
    },
    {
      category: "Account & Billing",
      questions: [
        {
          id: 7,
          question: "How do I upgrade my plan?",
          answer: "Navigate to Settings > Billing > Upgrade Plan. You can instantly upgrade to any plan. All upgrades are prorated, and you'll only pay for the remaining period. Enterprise plans require contacting our sales team.",
          tags: ["billing", "upgrade"]
        },
        {
          id: 8,
          question: "Can I cancel my subscription?",
          answer: "Yes, you can cancel anytime from Settings > Billing > Cancel Subscription. Your account will remain active until the end of your billing period. No refunds are provided for partial months.",
          tags: ["billing", "cancel"]
        },
        {
          id: 9,
          question: "How do I add team members?",
          answer: "Go to Settings > Team Management > Add Member. Enter their email and assign roles (Admin, Editor, Viewer). They'll receive an invitation email to join your organization.",
          tags: ["team", "collaboration"]
        }
      ]
    },
    {
      category: "Troubleshooting",
      questions: [
        {
          id: 10,
          question: "Network training is too slow",
          answer: "Try: 1) Enable GPU acceleration in Settings 2) Reduce batch size 3) Use smaller network architecture 4) Check for background processes 5) Clear training cache. Contact support if issue persists.",
          tags: ["performance", "training"]
        },
        {
          id: 11,
          question: "API rate limit exceeded",
          answer: "Free tier: 100 requests/hour. Pro: 1000/hour. Enterprise: Unlimited. You can monitor usage in Analytics > API Usage. Consider implementing request queuing or upgrading your plan.",
          tags: ["api", "limits"]
        },
        {
          id: 12,
          question: "Data import errors",
          answer: "Common issues: 1) File encoding mismatch 2) Invalid CSV format 3) Column count inconsistency 4) Memory limits. Use our Data Validator tool before import. Maximum file size: 10GB.",
          tags: ["data", "import", "errors"]
        }
      ]
    }
  ];
  
  // Quick solutions
  const quickSolutions = [
    { icon: RefreshCw, title: "Reset Neural Connections", description: "Fix synchronization issues", action: "Run Diagnostic" },
    { icon: Database, title: "Clear Cache", description: "Free up memory space", action: "Clear Now" },
    { icon: Wifi, title: "Network Diagnostics", description: "Check connectivity issues", action: "Test Connection" },
    { icon: Bug, title: "Bug Report", description: "Report technical issues", action: "Submit Report" }
  ];
  
  // Search functionality
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search API call
    setTimeout(() => {
      const results = [
        { id: 1, title: "Neural Network Setup Guide", category: "Documentation", relevance: 95 },
        { id: 2, title: "Troubleshooting Slow Training", category: "Tutorial", relevance: 88 },
        { id: 3, title: "API Integration Examples", category: "Code Samples", relevance: 82 },
        { id: 4, title: "Data Import Best Practices", category: "Documentation", relevance: 76 },
        { id: 5, title: "Account Security Settings", category: "Guide", relevance: 70 }
      ];
      
      setSearchResults(results);
      setIsSearching(false);
    }, 800);
  };
  
  // Handle FAQ toggle
  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };
  
  // Handle contact form submission
  const handleSubmitContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionSuccess(true);
      setContactForm({
        name: "",
        email: "",
        subject: "",
        category: "general",
        priority: "normal",
        message: "",
        attachments: []
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setSubmissionSuccess(false), 5000);
    }, 1500);
  };
  
  // Handle file attachment
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setContactForm({
        ...contactForm,
        attachments: [...contactForm.attachments, ...Array.from(files)]
      });
    }
  };
  
  // Send chat message
  const sendChatMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMsg = {
      id: chatMessages.length + 1,
      text: newMessage,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages([...chatMessages, newMsg]);
    setNewMessage("");
    
    // Simulate bot response
    setTimeout(() => {
      const responses = [
        "I understand. Let me look that up for you.",
        "Thanks for sharing that. Here's what I recommend:",
        "That's a common issue. Try this solution:",
        "I need more details to help you better. Can you elaborate?"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const botMsg = {
        id: chatMessages.length + 2,
        text: randomResponse,
        sender: "support",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, botMsg]);
    }, 1000);
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "degraded": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "maintenance": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "down": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational": return <CheckCircle className="w-5 h-5" />;
      case "degraded": return <AlertCircle className="w-5 h-5" />;
      case "maintenance": return <Settings className="w-5 h-5" />;
      case "down": return <XCircle className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };
  
  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Solutions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickSolutions.map((solution, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
                        <solution.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{solution.title}</h4>
                        <p className="text-sm text-white/60 mb-3">{solution.description}</p>
                        <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                          {solution.action} →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* System Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(systemStatus).map(([key, value]) => {
                  if (key === "lastUpdated") return null;
                  
                  return (
                    <div key={key} className={`p-4 rounded-xl border ${getStatusColor(value)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        {getStatusIcon(value)}
                      </div>
                      <div className="text-sm opacity-80 capitalize">{value}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-white/60 mt-2">
                Last updated: {systemStatus.lastUpdated}
              </div>
            </div>
            
            {/* Video Tutorials */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Video Tutorials</h3>
                <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoTutorials.map((video) => (
                  <div key={video.id} className="group cursor-pointer">
                    <div className="aspect-video bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-4xl mb-3 group-hover:scale-[1.02] transition-transform">
                      {video.thumbnail}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium mb-1">{video.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                          <span className="capitalize">{video.category}</span>
                          <span>•</span>
                          <span>{video.duration}</span>
                        </div>
                      </div>
                      <Video className="w-5 h-5 opacity-40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case "documentation":
        return (
          <div className="space-y-8">
            {/* Documentation Categories */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Documentation Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {helpCategories.map((category, index) => {
                  const Icon = category.icon;
                  return (
                    <div key={index} className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-indigo-500/30 transition-all group">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h4 className="text-xl font-bold mb-2">{category.title}</h4>
                      <p className="text-white/60 mb-4">
                        {category.count} articles, guides, and resources
                      </p>
                      <button className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium">
                        Explore <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Popular Articles */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Popular Articles</h3>
              <div className="space-y-3">
                {[
                  { title: "Getting Started with Neural Networks", views: 12456 },
                  { title: "API Authentication Guide", views: 8921 },
                  { title: "Data Import Best Practices", views: 7453 },
                  { title: "Troubleshooting Common Issues", views: 6210 },
                  { title: "Security Best Practices", views: 5342 }
                ].map((article, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl opacity-40">{index + 1}</div>
                      <div>
                        <h4 className="font-medium">{article.title}</h4>
                        <div className="text-sm text-white/60 flex items-center gap-2">
                          <EyeIcon className="w-4 h-4" />
                          {article.views.toLocaleString()} views
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case "contact":
        return (
          <div className="space-y-8">
            {/* Contact Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-xl font-bold mb-2">Email Support</h4>
                <p className="text-white/60 mb-4">Get help via email within 24 hours</p>
                <a href="mailto:support@neuralnexus.com" className="text-blue-400 hover:text-blue-300 font-medium">
                  support@neuralnexus.com
                </a>
              </div>
              
              <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                </div>
                <h4 className="text-xl font-bold mb-2">Live Chat</h4>
                <p className="text-white/60 mb-4">Instant help from our support team</p>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="text-green-400 hover:text-green-300 font-medium"
                >
                  Start Chat →
                </button>
              </div>
              
              <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="text-xl font-bold mb-2">Phone Support</h4>
                <p className="text-white/60 mb-4">24/7 emergency support line</p>
                <div className="text-purple-400 font-medium">+1 (555) 123-4567</div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Send us a message</h3>
              <form onSubmit={handleSubmitContactForm} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Category *
                    </label>
                    <select
                      value={contactForm.category}
                      onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing Issue</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Priority
                    </label>
                    <select
                      value={contactForm.priority}
                      onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Attachments
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileAttach}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30"
                      />
                    </div>
                    {contactForm.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {contactForm.attachments.map((file, index) => (
                          <div key={index} className="text-sm text-white/60 flex items-center justify-between">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newAttachments = [...contactForm.attachments];
                                newAttachments.splice(index, 1);
                                setContactForm({ ...contactForm, attachments: newAttachments });
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Describe your issue in detail..."
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactForm({
                      name: "",
                      email: "",
                      subject: "",
                      category: "general",
                      priority: "normal",
                      message: "",
                      attachments: []
                    })}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      
      case "faq":
        return (
          <div className="space-y-8">
            {/* FAQ Search */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                <Search className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search FAQ..."
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/40 px-4 text-lg"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div key={result.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium mb-1">{result.title}</h4>
                          <div className="text-sm text-white/60">{result.category} • {result.relevance}% match</div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* FAQ Categories */}
            <div className="space-y-8">
              {faqs.map((category) => (
                <div key={category.category}>
                  <h3 className="text-xl font-bold mb-4">{category.category}</h3>
                  <div className="space-y-3">
                    {category.questions.map((faq) => (
                      <div key={faq.id} className="border border-white/10 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full text-left p-6 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between"
                        >
                          <h4 className="font-medium pr-8">{faq.question}</h4>
                          {expandedFaq === faq.id ? (
                            <ChevronDown className="w-5 h-5 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 flex-shrink-0" />
                          )}
                        </button>
                        
                        {expandedFaq === faq.id && (
                          <div className="p-6 border-t border-white/10">
                            <p className="text-white/70 mb-4">{faq.answer}</p>
                            <div className="flex flex-wrap gap-2">
                              {faq.tags.map((tag, index) => (
                                <span key={index} className="px-3 py-1 bg-white/5 rounded-lg text-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "community":
        return (
          <div className="space-y-8">
            {/* Community Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl border border-white/10">
                <div className="text-3xl font-bold mb-2">2,456</div>
                <div className="text-sm text-white/60">Active Members</div>
              </div>
              <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl border border-white/10">
                <div className="text-3xl font-bold mb-2">1,892</div>
                <div className="text-sm text-white/60">Forum Posts</div>
              </div>
              <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-white/10">
                <div className="text-3xl font-bold mb-2">342</div>
                <div className="text-sm text-white/60">Code Samples</div>
              </div>
              <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-white/10">
                <div className="text-3xl font-bold mb-2">89</div>
                <div className="text-sm text-white/60">Tutorials</div>
              </div>
            </div>
            
            {/* Community Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Join Our Community</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    platform: "Discord",
                    description: "Real-time chat with developers",
                    members: "1,200+ online",
                    icon: "💬",
                    color: "from-indigo-500 to-purple-500",
                    link: "https://discord.gg/neuralnexus"
                  },
                  {
                    platform: "GitHub",
                    description: "Open source repositories",
                    members: "450+ contributors",
                    icon: "💻",
                    color: "from-gray-500 to-slate-500",
                    link: "https://github.com/neuralnexus"
                  },
                  {
                    platform: "Stack Overflow",
                    description: "Technical Q&A platform",
                    members: "2,100+ questions",
                    icon: "🔍",
                    color: "from-orange-500 to-amber-500",
                    link: "https://stackoverflow.com/questions/tagged/neuralnexus"
                  },
                  {
                    platform: "Twitter",
                    description: "Latest updates & announcements",
                    members: "12,500+ followers",
                    icon: "🐦",
                    color: "from-blue-400 to-cyan-400",
                    link: "https://twitter.com/neuralnexus"
                  },
                  {
                    platform: "Reddit",
                    description: "Community discussions",
                    members: "5,800+ members",
                    icon: "📱",
                    color: "from-orange-600 to-red-500",
                    link: "https://reddit.com/r/neuralnexus"
                  },
                  {
                    platform: "YouTube",
                    description: "Video tutorials & demos",
                    members: "45,000+ subscribers",
                    icon: "🎥",
                    color: "from-red-500 to-rose-500",
                    link: "https://youtube.com/neuralnexus"
                  }
                ].map((platform, index) => (
                  <a
                    key={index}
                    href={platform.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-indigo-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-3xl">{platform.icon}</div>
                      <ExternalLink className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">{platform.platform}</h4>
                    <p className="text-white/60 mb-3">{platform.description}</p>
                    <div className="text-sm text-white/40">{platform.members}</div>
                  </a>
                ))}
              </div>
            </div>
            
            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Community Activity</h3>
              <div className="space-y-3">
                {[
                  { user: "@quantum_dev", action: "shared a neural network template", time: "2 hours ago" },
                  { user: "@ai_researcher", action: "answered a question about CNN optimization", time: "4 hours ago" },
                  { user: "@neural_novice", action: "published their first project", time: "6 hours ago" },
                  { user: "@data_scientist", action: "contributed to the API documentation", time: "1 day ago" },
                  { user: "@ml_engineer", action: "released a new dataset", time: "2 days ago" }
                ].map((activity, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{activity.user} <span className="font-normal text-white/70">{activity.action}</span></div>
                        <div className="text-sm text-white/60">{activity.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case "tickets":
        return (
          <div className="space-y-8">
            {/* Ticket Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setActiveTab("contact")}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium"
              >
                + Create New Ticket
              </button>
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                View All Tickets
              </button>
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                Export History
              </button>
            </div>
            
            {/* Support Tickets */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Support Tickets</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Subject</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Priority</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4">#{ticket.id}</td>
                        <td className="py-3 px-4 font-medium">{ticket.subject}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            ticket.status === 'open' ? 'bg-amber-500/20 text-amber-400' :
                            ticket.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            ticket.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            ticket.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/60">{ticket.date}</td>
                        <td className="py-3 px-4">{ticket.agent}</td>
                        <td className="py-3 px-4">
                          <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                            View Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Support History */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Support History</h3>
              <div className="space-y-4">
                {[
                  { date: "Today", description: "Chat session with Alex Q.", duration: "15 minutes", resolved: true },
                  { date: "Yesterday", description: "Email ticket #4567", duration: "2 hours", resolved: true },
                  { date: "Mar 12", description: "Phone call emergency", duration: "45 minutes", resolved: true },
                  { date: "Mar 10", description: "Feature request discussion", duration: "30 minutes", resolved: false }
                ].map((session, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{session.description}</div>
                      <div className="flex items-center gap-2">
                        {session.resolved ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span>{session.date}</span>
                      <span>•</span>
                      <span>{session.duration}</span>
                      <span>•</span>
                      <span className={session.resolved ? "text-green-400" : "text-amber-400"}>
                        {session.resolved ? "Resolved" : "In Progress"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Live Chat Component
 const LiveChat = () => {
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendChatMessage = () => {
    if (!newMessage.trim()) return;
    
    const userMsg = {
      id: chatMessages.length + 1,
      text: newMessage,
      sender: 'user' as const,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setNewMessage("");
    setIsTyping(true);
    
    // Simulate typing delay
    setTimeout(() => {
      const responses = [
        "I understand. Let me check that for you.",
        "Thanks for sharing the details. Let me provide you with a solution.",
        "That's a common issue. Here's what you can try:",
        "I need a bit more information to help you better. Could you elaborate?",
        "Let me connect you with the right specialist for this issue.",
        "I found a solution in our knowledge base. Here are the steps:"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const botMsg = {
        id: chatMessages.length + 2,
        text: randomResponse,
        sender: 'support' as const,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000); // Random delay 1.5-2.5 seconds
  };

  const quickResponses = [
    "How do I reset my neural network?",
    "I need help with API integration",
    "Account access issue",
    "Billing question"
  ];

  if (!isChatOpen) return null;
  
  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-gradient-to-b from-slate-900 to-black rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
            </div>
            <div>
              <div className="font-bold">Neural Support</div>
              <div className="text-sm opacity-80">Online • Typically replies in 2 minutes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Minimize chat
                const chatWindow = document.querySelector('.chat-window');
                if (chatWindow) {
                  chatWindow.classList.toggle('minimized');
                }
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {/* <MinimizeIcon className="w-5 h-5" /> */}
            </button>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: '400px' }}
      >
        {/* Welcome message */}
        <div className="text-center mb-4">
          <div className="inline-block px-4 py-2 bg-white/5 rounded-full text-sm">
            Today {new Date().toLocaleDateString()}
          </div>
        </div>
        
        {/* Initial message */}
        <div className="flex justify-start">
          <div className="max-w-[80%] p-3 rounded-2xl bg-white/10">
            <div className="text-sm">Hello! I'm your Neural Support assistant. How can I help you today?</div>
            <div className="text-xs opacity-60 mt-1">10:00 AM</div>
          </div>
        </div>
        
        {/* Chat messages */}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  : 'bg-white/10'
              }`}
            >
              <div className="text-sm">{msg.text}</div>
              <div className="text-xs opacity-60 mt-1 text-right">{msg.time}</div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-2xl bg-white/10">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-white/60">Typing...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Quick responses */}
        {chatMessages.length <= 2 && (
          <div className="space-y-2 mt-4">
            <div className="text-xs text-white/40">Quick responses:</div>
            <div className="flex flex-wrap gap-2">
              {quickResponses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setNewMessage(response);
                    // Auto focus input
                    setTimeout(() => {
                      const input = document.querySelector('.chat-input') as HTMLInputElement;
                      if (input) input.focus();
                    }, 100);
                  }}
                  className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                >
                  {response}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendChatMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="chat-input flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500 transition-colors placeholder:text-white/40"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isTyping}
            className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isTyping ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </>
            ) : (
              <>
                {/* <SendIcon className="w-5 h-5" /> */}
                Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-950/40 to-purple-950/30 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">Help & Support</h1>
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Support Settings
            </button>
          </div>
          <p className="text-white/60">Find answers, get help, and connect with our community</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
              <nav className="space-y-2">
                {[
                  { id: "overview", label: "Overview", icon: HelpCircle },
                  { id: "documentation", label: "Documentation", icon: BookOpen },
                  { id: "faq", label: "FAQ", icon: FileText },
                  { id: "contact", label: "Contact Support", icon: MessageSquare },
                  { id: "community", label: "Community", icon: Users },
                  { id: "tickets", label: "My Tickets", icon: Shield }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                        activeTab === item.id
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30"
                          : "hover:bg-white/10 text-white/80"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Emergency Contact */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="space-y-3">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <div className="font-medium text-rose-300">Emergency Support</div>
                    </div>
                    <div className="text-sm text-white/60">24/7 critical issue response</div>
                    <a href="tel:+15551234567" className="text-sm font-medium text-rose-400 hover:text-rose-300 block mt-2">
                      +1 (555) 123-4567
                    </a>
                  </div>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <div className="font-medium text-amber-300">System Status</div>
                    </div>
                    <div className="text-sm text-white/60">
                      {Object.values(systemStatus).filter(s => s === "operational").length} of {Object.values(systemStatus).length - 1} systems operational
                    </div>
                    <button className="text-sm font-medium text-amber-400 hover:text-amber-300 mt-2">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              {/* Tab Content */}
              <div className="min-h-[600px]">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat */}
        <LiveChat />
        
        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-2xl transition-all"
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        {/* Success Message */}
        {submissionSuccess && (
          <div className="fixed bottom-4 right-4 z-50 animate-slideInUp">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <span>Support ticket submitted successfully!</span>
            </div>
          </div>
        )}
      </div>

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #4f46e5, #7c3aed);
        }
      `}</style>
    </div>
  );
}

// Eye Icon Component
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}