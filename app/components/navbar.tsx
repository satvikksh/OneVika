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
  PlaySquare,
  Image as ImageIcon,
  User,
  HelpCircle,
  MessageSquare,
  BarChart,
  TrendingUp,
  PenSquare, // Added post icon
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
  title = "OrbitByte",
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

  // State to track if chat text area is focused
  const [isChatTextAreaFocused, setIsChatTextAreaFocused] = useState(false);
  // State for auto-hide bottom nav
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event listener for chat text area focus
  useEffect(() => {
    const handleTextAreaFocus = (e: CustomEvent) => {
      setIsChatTextAreaFocused(e.detail.isFocused);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses Escape key in chat, show bottom nav
      if (e.key === "Escape" && pathname.startsWith("/chat")) {
        setIsChatTextAreaFocused(false);
      }
    };

    window.addEventListener(
      "chatTextAreaFocus",
      handleTextAreaFocus as EventListener
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "chatTextAreaFocus",
        handleTextAreaFocus as EventListener
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname]);

  // Auto-hide bottom nav on scroll for mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isAtTop = currentScrollY < 50;
      const isScrollingUp = currentScrollY < lastScrollY;

      // Always show at the top
      if (isAtTop) {
        setShowBottomNav(true);
        setIsVisible(true);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        setLastScrollY(currentScrollY);
        return;
      }

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      if (isScrollingDown && currentScrollY > 100) {
        // Hide immediately when scrolling down past 100px
        setIsVisible(false);
        // Set timeout to actually hide after 3 seconds
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          setShowBottomNav(false);
        }, 3000);
      } else if (isScrollingUp) {
        // Show immediately when scrolling up
        setIsVisible(true);
        setShowBottomNav(true);
        // Reset hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        // Set timeout to hide again after 4 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            setShowBottomNav(false);
          }, 300);
        }, 4000);
      }

      setLastScrollY(currentScrollY);
    };

    // Add passive scroll listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [lastScrollY, pathname]);

  // Reset bottom nav when route changes
  useEffect(() => {
    setShowBottomNav(true);
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, [pathname]);

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
    { path: "/feed", label: "Feed", icon: <PlaySquare size={18} /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart size={18} /> },
  ];

  // Bottom navigation items for mobile - Fixed set of items
  const bottomNavItems: NavItem[] = [
    { path: "/", label: "Home", icon: <Home size={24} /> },
    { path: "/feed", label: "Feed", icon: <PlaySquare size={24} /> },
    { path: "/chat", label: "Chat", icon: <MessageSquare size={24} /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart size={24} /> },
    {
      path: "/profile",
      label: "Profile",
      icon: session?.user ? (
        <div className="relative w-6 h-6">
          {!loading && avatar ? (
            <Image
              src={avatar}
              alt="User Avatar"
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
          )}
        </div>
      ) : (
        <User size={24} />
      ),
    },
  ];

  const isChatPage = pathname.startsWith("/chat");
  const finalShowBottomNav = showBottomNav && !(isChatPage && isChatTextAreaFocused);

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
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
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

  // Handle post creation
  const handlePostCreate = () => {
    router.push("/post");
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm"
            : "bg-white/0 dark:bg-gray-950/0 backdrop-blur-md"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16  flex items-center justify-between">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
                <Image
                  src="/img/orbitbyte1.png"
                  alt="OrbitByte"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Title + Subtitle */}
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
                  {title}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Powered by Satvik&#39;s Group
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 mx-4 p-1 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50 backdrop-blur-sm">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 group ${
                  pathname === item.path
                    ? "bg-white dark:bg-gray-800 text-blue-500 dark:text-gray-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    pathname === item.path
                      ? "text-blue-500 dark:text-gray-400"
                      : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Search Bar - Hidden on mobile */}
          {showSearch && (
            <div
              className="hidden md:flex flex-1 max-w-sm mx-6"
              ref={searchRef}
            >
              <form onSubmit={handleSearch} className="relative w-full group">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100/50 dark:bg-gray-800/50 border border-transparent dark:border-gray-700 rounded-full focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all shadow-inner"
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
                  <div className="absolute top-full mt-3 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors group/item"
                          >
                            <div className="text-gray-400 group-hover/item:text-blue-500 transition-colors">
                              {suggestion.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {suggestion.text}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
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
          <div className="hidden lg:flex items-center gap-3">
            {/* Post Creation Button - Added left of message icon */}
            {session?.user && (
              <button
                onClick={handlePostCreate}
                className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 relative text-gray-600 dark:text-gray-300 group"
                aria-label="Create Post"
                title="Create Post"
              >
                <PenSquare size={20} />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Create Post
                </span>
              </button>
            )}

            {/* Chat Button/Icon */}
            {session?.user && (
              <button
                onClick={handleChatClick}
                className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 relative text-gray-600 dark:text-gray-300"
                aria-label="Chat"
              >
                <MessageSquare size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-950">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleThemeToggle}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 text-gray-600 dark:text-gray-300"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            {showNotifications && session?.user && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-all hover:scale-105 active:scale-95 text-gray-600 dark:text-gray-300"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-950">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-4 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        <button
                          onClick={markAllAsRead}
                          className="text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 transition-colors"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            !notification.read
                              ? "bg-purple-50/40 dark:bg-purple-900/10"
                              : ""
                          }`}
                        >
                          <div className="flex gap-3">
                            <div
                              className={`p-2 h-fit rounded-xl ${
                                !notification.read
                                  ? "bg-purple-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-300"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {notification.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-sm">
                                  {notification.title}
                                </h4>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                  {notification.time}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {notification.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/notifications"
                      className="block p-3 text-center text-xs font-medium text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {session?.user ? (
              <div className="relative ml-2" ref={userDropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-1 pr-3 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:shadow-sm group"
                  aria-label="User menu"
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-white dark:ring-gray-900">
                    {!loading && avatar ? (
                      <Image
                        src={avatar}
                        alt="User Avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-white font-bold text-xs">
                        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`text-gray-400 transition-transform duration-300 ${
                      isUserDropdownOpen ? "rotate-180" : ""
                    }`}
                    size={14}
                  />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500 shadow-md">
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

                        <div className="overflow-hidden">
                          <p className="font-bold text-gray-900 dark:text-white truncate">
                            {session.user.name || "User"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {session.user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        <User size={16} /> Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        <Settings size={16} /> Settings
                      </Link>
                      <Link
                        href="/chat"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        <MessageSquare size={16} /> Chat
                      </Link>
                      <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-medium"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login")}
                  className="px-5 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-pink-600 text-white rounded-full hover:from-blue-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg text-sm font-medium transform hover:-translate-y-0.5"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button - Hidden on mobile since we have bottom nav */}
          <button
            className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown - Just for extra items not in bottom nav */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="lg:hidden fixed top-16 inset-x-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 shadow-2xl h-[calc(100vh-4rem)] overflow-y-auto z-50 animate-in slide-in-from-top-5"
          >
            <div className="p-4 pb-24">
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
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white border border-transparent dark:border-gray-800"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
              )}

              {/* Navigation Tabs - Full list */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">
                  Menu
                </h3>
                <div className="space-y-1">
                  {/* Add Create Post option in mobile menu */}
                  {session?.user && (
                    <button
                      onClick={handlePostCreate}
                      className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl transition-all hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300"
                    >
                      <div className="flex items-center gap-4">
                        <PenSquare size={18} />
                        <span className="font-medium">Create Post</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-600"
                      />
                    </button>
                  )}
                  
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                        pathname === item.path
                          ? "bg-purple-50 dark:bg-purple-900/20 text-blue-600 dark:text-blue-400"
                          : "hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-600"
                      />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">
                  Preferences
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleThemeToggle}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 active:scale-95 transition-all"
                  >
                    {theme === "dark" ? (
                      <Sun size={24} className="mb-3 text-amber-400" />
                    ) : (
                      <Moon size={24} className="mb-3 text-blue-600" />
                    )}
                    <span className="text-sm font-medium">
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>

                  {session?.user && (
                    <button
                      onClick={handleNotificationClick}
                      className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 active:scale-95 transition-all relative"
                    >
                      <div className="relative">
                        <Bell
                          size={24}
                          className="mb-3 text-gray-700 dark:text-gray-300"
                        />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-50 dark:border-gray-900" />
                        )}
                      </div>
                      <span className="text-sm font-medium">Notifications</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Auth Actions */}
              {!session?.user && (
                <div className="flex flex-col gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/login");
                    }}
                    className="w-full py-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/register");
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {session?.user && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 font-semibold mt-4"
                >
                  <LogOut size={18} /> Logout
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* FIXED FULL-WIDTH BOTTOM NAVIGATION (Mobile Only) */}
      {finalShowBottomNav && (
        <div 
          className={`lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-around h-15 px-0">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="relative flex flex-col items-center justify-center w-full h-full"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative">
                      <div
                        className={`transform transition-transform duration-200 ${
                          isActive ? "scale-110" : ""
                        }`}
                      >
                        {item.icon}
                      </div>
                      
                      {/* Active Indicator */}
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

    </>
  );
};

export default SimpleNavbar;