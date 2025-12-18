"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  const searchRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

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
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
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
        !searchRef.current.contains(e.target as Node)
      ) {
        setIsUserDropdownOpen(false);
        setIsNotificationsOpen(false);
        setShowSearchSuggestions(false);
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
    setUnreadNotifications(0);
  };

  // const { data: session } = useSession();

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
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-600 group-hover:to-pink-600 transition-all overflow-hidden shadow-md">
                <Image
                  src="/img/logo.png"
                  alt="logo"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {title}
              </span>
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

          {/* Search Bar */}
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

          {/* Right Actions */}
          <div className="flex items-center gap-2">
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
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-linear-to-br from-purple-500 to-blue-500">
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
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-linear-to-br from-purple-500 to-blue-500">
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
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-16 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="p-4">
              {/* Mobile Search */}
              {showSearch && (
                <div className="mb-4">
                  <form onSubmit={handleSearch} className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
              )}

              {/* Mobile Nav Items */}
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.path
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Mobile User Actions */}
              {!session?.user && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/login");
                    }}
                    className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/register");
                    }}
                    className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
};

export default SimpleNavbar;
