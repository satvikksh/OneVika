"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Briefcase,
  Home,
  BookOpen,
  Zap,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

// Define Types
interface User {
  name: string;
  avatar?: string;
  email?: string;
}

interface SearchSuggestion {
  id: number;
  text: string;
  category: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface SimpleNavbarProps {
  title?: string;
  mode?: "dark" | "light";
  toggleMode?: () => void;
  isAuthenticated?: boolean;
  user?: User;
  onLogin?: () => void;
  onLogout?: () => void;
  onSearch?: (searchValue: string) => void;
}

const SimpleNavbar: React.FC<SimpleNavbarProps> = ({
  title = "OneVika",
  mode = "dark",
  toggleMode,
  isAuthenticated = false,
  user,
  onLogin,
  onLogout,
  onSearch,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notifications] = useState([
    { id: 1, text: "New project update", read: false },
    { id: 2, text: "3 new members joined", read: false },
    { id: 3, text: "Event starting soon", read: true },
  ]);

  const searchRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Mock search suggestions
  const searchSuggestions: SearchSuggestion[] = [
    { id: 1, text: "Imaginary Projects", category: "Projects" },
    { id: 2, text: "Community Guidelines", category: "Documentation" },
    { id: 3, text: "Upcoming Events", category: "Events" },
    { id: 4, text: "Research Papers", category: "Academics" },
    { id: 5, text: "Member Directory", category: "Community" },
  ];

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Add this useEffect after your other useEffects:
  useEffect(() => {
    // Check for saved theme or system preference
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      const initialTheme =
        saved === "light"
          ? "light"
          : saved === "dark"
          ? "dark"
          : prefersDark
          ? "dark"
          : "light";

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(initialTheme);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchSuggestions(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems: NavItem[] = [
    { path: "/", label: "Home", icon: <Home size={18} /> },
    { path: "/about", label: "About", icon: <BookOpen size={18} /> },
    { path: "/projects", label: "Projects", icon: <Zap size={18} /> },
    { path: "/gallery", label: "Gallery", icon: <ImageIcon size={18} /> },
    { path: "/feed", label: "Feed", icon: <Users size={18} /> },
  ];

  const filteredSuggestions = searchSuggestions.filter(
    (suggestion) =>
      suggestion.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suggestion.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchSuggestions(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
    setShowSearchSuggestions(false);
    setIsMobileMenuOpen(false);
  };

  // Replace the entire handleThemeToggle function:
  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    if (typeof document !== "undefined") {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", newTheme);
    }
    if (toggleMode) {
      toggleMode();
    }
  }, [theme, toggleMode]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header
        className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${
          scrolled
            ? "backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 py-2"
            : "bg-transparent py-4"
        }
      `}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="shrink-0">
              <Link
                href="/"
                className="flex items-center space-x-3 group"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-linear-to-br from-purple-500 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-600 transition-all duration-300 shadow-lg">
                  {/* Replace with your logo */}
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                    <Image
                      src="/img/logo.png"
                      alt={`${title} logo`}
                      width={40}
                      height={40}
                      priority
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-linear-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                    {title}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Powerd by Satvik&#39;s Group
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`
                    flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200
                    ${
                      pathname === item.path
                        ? "bg-linear-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  <span
                    className={`transition-transform duration-200 ${
                      pathname === item.path ? "scale-110" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Right Section - Desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Search */}
              <div className="relative" ref={searchRef}>
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => {
                      setIsSearchFocused(true);
                      setShowSearchSuggestions(true);
                    }}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search imaginary realms..."
                    className="w-64 pl-10 pr-4 py-2.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                  />
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    size={18}
                  />
                </form>

                {/* Search Suggestions */}
                {showSearchSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fadeIn">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                        Suggestions
                      </div>
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-150 flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-3">
                            <Search
                              size={16}
                              className="text-gray-400 group-hover:text-purple-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                              {suggestion.text}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
                            {suggestion.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={handleThemeToggle}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
                aria-label={`Switch to ${
                  theme === "dark" ? "light" : "dark"
                } mode`}
              >
                {theme === "dark" ? (
                  <Sun className="text-yellow-500" size={20} />
                ) : (
                  <Moon className="text-gray-700" size={20} />
                )}
              </button>

              {/* Notifications */}
              <button
                onClick={() => router.push("/notifications")}
                className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
                aria-label="Notifications"
              >
                <Bell className="text-gray-700 dark:text-gray-300" size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* User Authentication */}
              {session?.user ? (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-linear-to-br from-purple-500 to-blue-500">
                      {session.user.avatar ? (
                        <Image
                          src={session.user.avatar}
                          alt={session.user.name || "User"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                          {session.user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="hidden lg:block text-left">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {session.user.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {session.user.email}
                      </div>
                    </div>

                    <ChevronDown
                      className={`transition-transform ${
                        isUserDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <User size={18} />
                        <span>Profile</span>
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Settings size={18} />
                        <span>Settings</span>
                      </Link>

                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // NOT LOGGED IN → show login/signup
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => router.push("/login")}
                    className="px-6 py-2.5 rounded-xl border-2 border-purple-500 text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => router.push("/signup")}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium hover:scale-105 transition"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="text-gray-700 dark:text-gray-300" size={24} />
              ) : (
                <Menu className="text-gray-700 dark:text-gray-300" size={24} />
              )}
            </button>
          </div>
        </div>

       {/* Mobile Menu */}
<div
  className={`
    lg:hidden fixed inset-x-0 top-16
    bg-white dark:bg-gray-900
    border-t border-gray-200 dark:border-gray-800
    transform transition-all duration-300 ease-in-out
    ${isMobileMenuOpen ? "max-h-[calc(100vh-4rem)] opacity-100" : "max-h-0 opacity-0"}
    overflow-y-auto
  `}
>
  <div className="container mx-auto px-4 py-6">

    {/* Mobile Navigation */}
    <div className="space-y-1 mb-6">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`
            flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
            ${
              pathname === item.path
                ? "bg-linear-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }
          `}
        >
          <span>{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </Link>
      ))}
    </div>

    {/* Mobile Search */}
    <div className="mb-6" ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchSuggestions(true);
          }}
          onFocus={() => setShowSearchSuggestions(true)}
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
        />
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
          size={18}
        />
      </form>

      {showSearchSuggestions && filteredSuggestions.length > 0 && (
        <div className="mt-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{suggestion.text}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{suggestion.category}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Mobile User Section (NEW) */}
    {session?.user && (
      <div className="mb-6 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">

        {/* Avatar + User Info */}
        <div className="flex items-center space-x-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-linear-to-br from-purple-500 to-blue-500">
            {session.user.avatar ? (
              <Image
                src={session.user.avatar}
                alt={session.user.name || "User"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center text-white text-xl font-bold h-full">
                {session.user.name?.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {session.user.name}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {session.user.email}
            </div>
          </div>
        </div>

        {/* Profile / Settings / Logout */}
        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              router.push("/profile");
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <User size={18} />
            <span>Profile</span>
          </button>

          <button
            onClick={() => {
              router.push("/settings");
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    )}

    {/* Mobile Auth (Only when NOT logged in) */}
    {!session?.user && (
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            router.push("/login");
            setIsMobileMenuOpen(false);
          }}
          className="px-6 py-3 rounded-xl border-2 border-purple-500 text-purple-600 dark:text-purple-400"
        >
          Login
        </button>

        <button
          onClick={() => {
            router.push("/signup");
            setIsMobileMenuOpen(false);
          }}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white"
        >
          Sign Up
        </button>
      </div>
    )}
  </div>
</div>

      </header>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-10 lg:h-10"></div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default SimpleNavbar;
