"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNotifications } from "@/app/context/NotificationContext"; 
import { useUserAvatar } from "../hooks/useUserAvatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  Home,
  BookOpen,
  Zap,
  Users,
  Image as ImageIcon,
  User,
  HelpCircle,
  MessageSquare,
  BarChart,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

// Types
interface SearchSuggestion {
  id: number;
  text: string;
  category: string;
  icon?: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  read: boolean;
  icon: React.ReactNode;
}

interface SimpleNavbarProps {
  title?: string;
  toggleMode?: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
}

const SimpleNavbar: React.FC<SimpleNavbarProps> = ({
  title = "OneVika",
  toggleMode,
  showSearch = true,
  showNotifications = true,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { avatar, loading } = useUserAvatar();

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const { unreadNotifications } = useNotifications();

  // NEW: State to track if chat text area is focused
  const [isChatTextAreaFocused, setIsChatTextAreaFocused] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // NEW: Event listener for chat text area focus
  useEffect(() => {
    const handleTextAreaFocus = (e: CustomEvent) => {
      setIsChatTextAreaFocused(e.detail.isFocused);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses Escape key in chat, show bottom nav
      if (e.key === 'Escape' && pathname.startsWith('/chat')) {
        setIsChatTextAreaFocused(false);
      }
    };

    window.addEventListener('chatTextAreaFocus', handleTextAreaFocus as EventListener);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('chatTextAreaFocus', handleTextAreaFocus as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pathname]);

  // NEW: Function to dispatch focus event (to be called from chat page)
  const setChatTextAreaFocus = useCallback((isFocused: boolean) => {
    setIsChatTextAreaFocused(isFocused);
  }, []);

  const searchSuggestions: SearchSuggestion[] = [
    {
      id: 1,
      text: "Imaginary Projects",
      category: "Projects",
      icon: <Zap size={14} />,
    },
    {
      id: 2,
      text: "Community Guidelines",
      category: "Docs",
      icon: <BookOpen size={14} />,
    },
    {
      id: 3,
      text: "Upcoming Events",
      category: "Events",
      icon: <Users size={14} />,
    },
    {
      id: 4,
      text: "Analytics Dashboard",
      category: "Analytics",
      icon: <BarChart size={14} />,
    },
    {
      id: 5,
      text: "Recent Conversations",
      category: "Messages",
      icon: <MessageSquare size={14} />,
    },
  ];

  const notifications: Notification[] = [
    {
      id: 1,
      title: "Project Update",
      description: "Your project has been reviewed",
      time: "2 min ago",
      read: false,
      icon: <Zap size={16} />,
    },
    {
      id: 2,
      title: "New Message",
      description: "You have a new message from Alex",
      time: "1 hour ago",
      read: false,
      icon: <MessageSquare size={16} />,
    },
    {
      id: 3,
      title: "Trend Alert",
      description: "New trends in your industry",
      time: "3 hours ago",
      read: true,
      icon: <TrendingUp size={16} />,
    },
    {
      id: 4,
      title: "System Update",
      description: "New features available",
      time: "1 day ago",
      read: true,
      icon: <Settings size={16} />,
    },
  ];

  const navItems: NavItem[] = [
    { path: "/", label: "Home", icon: <Home size={18} /> },
    { path: "/about", label: "About", icon: <BookOpen size={18} /> },
    {
      path: "/projects",
      label: "Projects",
      icon: <Zap size={18} />,
      badge: "New",
    },
    { path: "/gallery", label: "Gallery", icon: <ImageIcon size={18} /> },
    { path: "/feed", label: "Feed", icon: <Users size={18} /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart size={18} /> },
  ];

  // Bottom navigation items for mobile
  const bottomNavItems: NavItem[] = [
    { path: "/", label: "Home", icon: <Home size={24} /> },
    { path: "/feed", label: "Feed", icon: <Users size={24} /> },
    { path: "/chat", label: "Chat", icon: <MessageSquare size={24} /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart size={24} /> },
    { 
      path: "/profile", 
      label: "Profile", 
      icon: session?.user ? (
        <div className="relative w-8 h-8">
          {!loading && avatar ? (
            <Image
              src={avatar}
              alt="User Avatar"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          )}
        </div>
      ) : <User size={24} />
    },
  ];

  // NEW: Check if we're on a chat page
  const isChatPage = pathname.startsWith('/chat');
  
  // NEW: Determine if bottom nav should be shown
  const showBottomNav = !(isChatPage && isChatTextAreaFocused);

  // Scroll blur with throttling
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Theme init
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const resolvedTheme = saved ?? (prefersDark ? "dark" : "light");

    setTheme(resolvedTheme);
    document.documentElement.classList.toggle(
      "dark",
      resolvedTheme === "dark"
    );
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node) &&
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node) &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserDropdownOpen(false);
        setIsNotificationsOpen(false);
        setShowSearchSuggestions(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleThemeToggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    toggleMode?.();
  }, [theme, toggleMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchSuggestions(false);
    }
  };

  const markAllAsRead = () => {
    // Mark all notifications as read logic
  };

  const handleChatClick = () => {
    router.push("/chat");
    setIsMobileMenuOpen(false);
  };

  const handleNotificationClick = () => {
    router.push("/notifications");
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm"
            : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Mobile Menu Button */}
<div className="flex items-center gap-4">
  <Link href="/" className="flex items-center gap-3 group">
    <div className="relative w-10 h-10">
      <Image
        src="/img/logo2.png"
        alt="OneVika"
        width={40}
        height={40}
        className="object-contain"
        priority
      />
    </div>

    {/* Title + Subtitle */}
    <div className="flex flex-col leading-tight">
      <span className="font-bold text-base sm:text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        {title}
      </span>
      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
        Powered by Satvik&#39;s Group
      </span>
    </div>
  </Link>
</div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 mx-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group ${
                  pathname === item.path
                    ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span
                  className={`transition-transform group-hover:scale-110 ${
                    pathname === item.path
                      ? "text-purple-600 dark:text-purple-400"
                      : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Hidden on mobile */}
          {showSearch && (
            <div
              className="hidden md:flex flex-1 max-w-xl mx-6"
              ref={searchRef}
            >
              <form onSubmit={handleSearch} className="relative w-full">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search projects, docs, users..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() =>
                      setShowSearchSuggestions(searchQuery.length > 0)
                    }
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                    <div className="p-2">
                      {searchSuggestions
                        .filter((suggestion) =>
                          suggestion.text
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => {
                              setSearchQuery(suggestion.text);
                              setShowSearchSuggestions(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                          >
                            <div className="text-gray-400">
                              {suggestion.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {suggestion.text}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.category}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Desktop Right Actions - Hidden on Mobile */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Chat Button/Icon */}
            {session?.user && (
              <button
                onClick={handleChatClick}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                aria-label="Chat"
              >
                <MessageSquare size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleThemeToggle}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            {showNotifications && session?.user && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            !notification.read
                              ? "bg-purple-50/50 dark:bg-purple-900/10"
                              : ""
                          }`}
                        >
                          <div className="flex gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                !notification.read
                                  ? "bg-purple-100 dark:bg-purple-900"
                                  : "bg-gray-100 dark:bg-gray-800"
                              }`}
                            >
                              {notification.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <h4 className="font-semibold">
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {notification.time}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/notifications"
                      className="block p-4 text-center text-purple-600 dark:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {session?.user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="User menu"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                    {!loading && avatar ? (
                      <Image
                        src={avatar}
                        alt="User Avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-white font-bold">
                        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </div>

                  <ChevronDown
                    className={`transition-transform ${
                      isUserDropdownOpen ? "rotate-180" : ""
                    }`}
                    size={16}
                  />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                          {!loading && avatar ? (
                            <Image
                              src={avatar}
                              alt="User Avatar"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-white font-bold">
                              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="font-bold">
                            {session.user.name || "User"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {session.user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <User size={18} /> Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Settings size={18} /> Settings
                      </Link>
                      <Link
                        href="/chat"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <MessageSquare size={18} /> Chat
                      </Link>
                      <Link
                        href="/help"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <HelpCircle size={18} /> Help & Support
                      </Link>
                      <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button - Hidden on mobile since we have bottom nav */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown - Contains Everything */}
        {isMobileMenuOpen && (
          <div 
            ref={mobileMenuRef}
            className="lg:hidden fixed top-16 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl max-h-[80vh] overflow-y-auto z-50"
          >
            <div className="p-4">
              {/* Mobile Search */}
              {showSearch && (
                <div className="mb-6">
                  <form onSubmit={handleSearch} className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search projects, docs, users..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                  Navigation
                </h3>
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                        pathname === item.path
                          ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Theme Toggle */}
                  <button
                    onClick={handleThemeToggle}
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {theme === "dark" ? (
                      <Sun size={20} className="mb-2" />
                    ) : (
                      <Moon size={20} className="mb-2" />
                    )}
                    <span className="text-sm font-medium">
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>

                  {/* Notifications */}
                  {session?.user && (
                    <button
                      onClick={handleNotificationClick}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
                    >
                      <Bell size={20} className="mb-2" />
                      <span className="text-sm font-medium">Notifications</span>
                      {unreadNotifications > 0 && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadNotifications}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* User Section */}
              {session?.user ? (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                    Account
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                        {!loading && avatar ? (
                          <Image
                            src={avatar}
                            alt="User Avatar"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-white font-bold text-lg">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{session.user.name || "User"}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {session.user.email || "No email"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Link
                        href="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Settings size={18} />
                        <span className="font-medium">Settings</span>
                      </Link>
                      <Link
                        href="/help"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <HelpCircle size={18} />
                        <span className="font-medium">Help & Support</span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          signOut({ callbackUrl: "/login" });
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <LogOut size={18} />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                    Account
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        router.push("/login");
                      }}
                      className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        router.push("/register");
                      }}
                      className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Bottom Navigation Bar for Mobile - Conditionally shown */}
      {showBottomNav && (
  <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-lg transition-transform duration-300 ease-in-out">          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {bottomNavItems.map((item) => {
                const isActive = pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex flex-col items-center justify-center flex-1 p-2 transition-all duration-200 ${
                      isActive
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <div className={`relative ${isActive ? "scale-110" : ""}`}>
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium mt-1">{item.label}</span>
                    {isActive && (
                      <div className="w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400 mt-1" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spacers for top and bottom navbars */}
      <div className="h-16" /> {/* Top navbar spacer */}
      {showBottomNav && <div className="lg:hidden h-16" />} {/* Bottom navbar spacer for mobile */}
    </>
  );
};

export default SimpleNavbar;