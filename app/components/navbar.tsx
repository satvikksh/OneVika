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
  PlaySquare,
  Image as ImageIcon,
  User,
  MessageSquare,
  BarChart,
  PenSquare, // Added post icon
} from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "../theme-provider";
import { PremiumAvatar, PremiumName } from "./premium-ui";
import NotificationPanel from "./NotificationPanel";

// Types
interface UserSearchResult {
  _id: string;
  id: string;
  name: string;
  avatar?: string | null;
  isPremium?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
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
  const { avatar, isPremium } = useUserAvatar();
  const { theme, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const { unreadNotifications, unreadMessages, clearMessages } =
    useNotifications();

  // State to track if chat text area is focused
  const [isChatTextAreaFocused, setIsChatTextAreaFocused] = useState(false);
  // State for auto-hide bottom nav
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const searchSelectionLockRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileDrawerHistoryRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the mobile drawer in the browser history so the Android/browser Back
  // button dismisses it before navigating away.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isPhone = window.matchMedia("(max-width: 767px)").matches;
    if (!isPhone || !isMobileMenuOpen) return;

    const historyKey = "__orbitbyteMobileDrawer";
    if (!window.history.state?.[historyKey]) {
      window.history.pushState(
        { ...window.history.state, [historyKey]: true },
        "",
        window.location.href
      );
      mobileDrawerHistoryRef.current = true;
    }

    const handlePopState = () => {
      mobileDrawerHistoryRef.current = false;
      setIsMobileMenuOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobileMenuOpen]);

  // Lock only the phone viewport while the off-canvas drawer is visible.
  useEffect(() => {
    if (typeof window === "undefined" || !isMobileMenuOpen) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches &&
      mobileDrawerHistoryRef.current &&
      window.history.state?.__orbitbyteMobileDrawer
    ) {
      window.history.back();
      return;
    }

    setIsMobileMenuOpen(false);
  }, []);

  const navigateFromMobileMenu = useCallback(
    (path: string) => {
      const shouldConsumeDrawerHistory =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches &&
        mobileDrawerHistoryRef.current &&
        window.history.state?.__orbitbyteMobileDrawer;

      setIsMobileMenuOpen(false);

      if (shouldConsumeDrawerHistory) {
        mobileDrawerHistoryRef.current = false;
        window.addEventListener("popstate", () => router.push(path), {
          once: true,
        });
        window.history.back();
        return;
      }

      router.push(path);
    },
    [router]
  );

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

  const isObjectId = (value: string) => /^[0-9a-fA-F]{24}$/.test(value);

  const selectSearchUser = (userId: string) => {
    if (searchSelectionLockRef.current) return;

    // A short lock keeps accidental double taps from triggering duplicate
    // route transitions while the suggestions are being dismissed.
    searchSelectionLockRef.current = true;
    window.setTimeout(() => {
      searchSelectionLockRef.current = false;
    }, 500);

    setShowSearchSuggestions(false);
    setIsMobileMenuOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    navigateFromMobileMenu(`/profile/${userId}`);
  };

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
        <PremiumAvatar
          src={avatar}
          alt={session.user.name || "User Avatar"}
          fallback={session.user.name || "U"}
          size={24}
          isPremium={isPremium}
        />
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

  // Close dropdowns on outside click/tap
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      const clickedOutsideUserDropdown =
        userDropdownRef.current && !userDropdownRef.current.contains(target);
      const clickedOutsideNotifications =
        notificationsRef.current && !notificationsRef.current.contains(target);
      const clickedOutsideDesktopSearch =
        !searchRef.current?.contains(target);
      const clickedOutsideMobileSearch =
        !mobileSearchRef.current?.contains(target);
      const clickedOutsideMobileMenu =
        mobileMenuRef.current && !mobileMenuRef.current.contains(target);

      if (clickedOutsideUserDropdown) {
        setIsUserDropdownOpen(false);
      }

      if (clickedOutsideNotifications) {
        setIsNotificationsOpen(false);
      }

      if (clickedOutsideDesktopSearch && clickedOutsideMobileSearch) {
        setShowSearchSuggestions(false);
      }

      if (
        clickedOutsideMobileMenu &&
        window.matchMedia("(min-width: 768px)").matches
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  const handleThemeToggle = useCallback(() => {
    toggleTheme();
    toggleMode?.();
  }, [toggleMode, toggleTheme]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (isObjectId(q)) {
      setShowSearchSuggestions(false);
      setSearchQuery("");
      setSearchResults([]);
      router.push(`/profile/${q}`);
      return;
    }

    if (searchResults.length > 0) {
      selectSearchUser(searchResults[0]._id);
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();

    if (!q || !session?.user?.id) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsSearchLoading(true);
        const res = await fetch(`/api/user/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          setSearchResults([]);
          return;
        }

        const data = await res.json();
        setSearchResults(Array.isArray(data.users) ? data.users : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery, session?.user?.id]);

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    handleSearch(e);
    if (searchQuery.trim()) {
      setShowSearchSuggestions(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleChatClick = () => {
    clearMessages();
    navigateFromMobileMenu("/chat");
  };

  const handleNotificationClick = () => {
    navigateFromMobileMenu("/notifications");
  };

  const formatBadgeCount = (count: number) => (count > 99 ? "99+" : String(count));

  // Handle post creation
  const handlePostCreate = () => {
    navigateFromMobileMenu("/post");
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 max-md:z-[70] transition-all duration-300 ${
          scrolled
            ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm"
            : "bg-white/0 dark:bg-gray-950/0 backdrop-blur-md"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between max-md:gap-2 max-md:px-3">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-4 max-md:flex-none">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-105 max-md:h-9 max-md:w-9">
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
              <div className="flex flex-col leading-tight max-md:hidden">
                <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
                  {title}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Powered by Satvik&#39;s Group
                </span>
              </div>
            </Link>
          </div>

          {/* Phone Search - remains in the navbar while the drawer is open */}
          {showSearch && (
            <div
              ref={mobileSearchRef}
              className="relative hidden min-w-0 flex-1 max-md:block"
            >
              <form onSubmit={handleMobileSearchSubmit} className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={17}
                />
                <input
                  type="search"
                  placeholder="Search users..."
                  aria-label="Search users"
                  className="h-10 w-full rounded-full border border-gray-200/80 bg-gray-100/80 pl-9 pr-3 text-sm text-gray-900 shadow-inner outline-none transition focus:border-blue-500/60 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white dark:focus:bg-gray-950"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() =>
                    setShowSearchSuggestions(searchQuery.length > 0)
                  }
                />
              </form>

              {showSearchSuggestions && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 top-full z-[80] mt-2 max-h-[min(55vh,24rem)] w-[min(82vw,22rem)] touch-pan-y overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
                  {isSearchLoading && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Searching users...
                    </div>
                  )}

                  {!isSearchLoading && searchResults.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </div>
                  )}

                  {!isSearchLoading &&
                    searchResults.slice(0, 6).map((user) => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => selectSearchUser(user._id)}
                        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-900 dark:active:bg-gray-800"
                        aria-label={`Open profile for ${user.name || "user"}`}
                      >
                        <PremiumAvatar
                          src={user.avatar}
                          alt={user.name}
                          fallback={user.name}
                          size={32}
                          isPremium={Boolean(user.isPremium)}
                        />
                        <PremiumName
                          name={user.name || "Unknown user"}
                          isPremium={Boolean(user.isPremium)}
                          badgeLabel="Premium"
                          badgeClassName="px-1.5 py-0.5 text-[9px]"
                          textClassName="truncate text-sm font-medium text-gray-900 dark:text-white"
                        />
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

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
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100/50 dark:bg-gray-800/50 border border-transparent dark:border-gray-700 rounded-full focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-inner"
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
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setShowSearchSuggestions(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {showSearchSuggestions && searchQuery.trim().length > 0 && (
                  <div className="absolute top-full mt-3 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2">
                      {isSearchLoading && (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          Searching users...
                        </div>
                      )}

                      {!isSearchLoading && searchResults.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No users found
                        </div>
                      )}

                      {!isSearchLoading &&
                        searchResults.map((user) => (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => selectSearchUser(user._id)}
                            className="flex min-h-12 w-full touch-manipulation select-none items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:bg-gray-800 dark:active:bg-gray-700 group/item"
                            aria-label={`Open profile for ${user.name}`}
                          >
                            <PremiumAvatar
                              src={user.avatar}
                              alt={user.name}
                              fallback={user.name}
                              size={32}
                              isPremium={Boolean(user.isPremium)}
                            />
                            <div className="flex-1 min-w-0">
                              <PremiumName
                                name={user.name}
                                isPremium={Boolean(user.isPremium)}
                                badgeLabel="Premium"
                                badgeClassName="px-1.5 py-0.5 text-[9px]"
                                textClassName="font-medium text-sm text-gray-900 dark:text-white"
                              />
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                ID: {user.id}
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
                {unreadMessages > 0 && (
                  <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-950">
                    {unreadMessages}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleThemeToggle}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 text-gray-600 dark:text-gray-300"
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            {showNotifications && session?.user && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen((open) => !open)}
                  className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-all hover:scale-105 active:scale-95 text-gray-600 dark:text-gray-300"
                  aria-label="Notifications"
                  aria-expanded={isNotificationsOpen}
                  aria-haspopup="dialog"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm dark:border-gray-950">
                      {formatBadgeCount(unreadNotifications)}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <NotificationPanel
                    compact
                    onNavigate={() => setIsNotificationsOpen(false)}
                    className="absolute right-0 mt-4 w-[min(92vw,26rem)] animate-in fade-in slide-in-from-top-2"
                  />
                )}
              </div>
            )}

            {/* User Menu */}
            {session?.user ? (
              <div className="relative ml-2" ref={userDropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className={`flex items-center gap-2 rounded-full border p-1 pl-1 pr-3 transition-all hover:shadow-sm group ${
                    isPremium
                      ? "border-amber-200/40 bg-gradient-to-r from-amber-50/70 via-white to-slate-50/70 hover:bg-amber-50 dark:border-amber-300/20 dark:bg-stone-950/70 dark:hover:bg-stone-900"
                      : "border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  aria-label="User menu"
                >
                  <PremiumAvatar
                    src={avatar}
                    alt={session?.user?.name || "User Avatar"}
                    fallback={session?.user?.name || "U"}
                    size={32}
                    isPremium={isPremium}
                  />
                  <ChevronDown
                    className={`text-gray-400 transition-transform duration-300 ${
                      isUserDropdownOpen ? "rotate-180" : ""
                    }`}
                    size={14}
                  />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div
                      className={`border-b p-5 ${
                        isPremium
                          ? "border-amber-200/20 bg-gradient-to-br from-amber-100/60 via-slate-50 to-stone-100/60 dark:from-amber-950/25 dark:via-slate-900/60 dark:to-stone-950/40"
                          : "border-gray-100 bg-gradient-to-br from-blue-500/5 to-pink-500/5 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <PremiumAvatar
                          src={avatar}
                          alt={session?.user?.name || "User Avatar"}
                          fallback={session?.user?.name || "U"}
                          size={48}
                          isPremium={isPremium}
                          className="shadow-md"
                        />

                        <div className="overflow-hidden">
                          <PremiumName
                            name={session.user.name || "User"}
                            isPremium={isPremium}
                            badgeLabel="Premium"
                            badgeClassName="px-1.5 py-0.5 text-[9px]"
                            textClassName="font-bold text-gray-900 dark:text-white"
                          />
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
            className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors max-md:flex-none"
            onClick={() =>
              isMobileMenuOpen
                ? closeMobileMenu()
                : setIsMobileMenuOpen(true)
            }
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span className="md:hidden">
              <Menu size={24} />
            </span>
            <span className="hidden md:block">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </span>
          </button>
        </div>

        {/* Phone overlay. Tablet keeps its existing full-width dropdown. */}
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          className={`absolute inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] bg-black/55 backdrop-blur-[2px] transition-opacity duration-[350ms] md:hidden ${
            isMobileMenuOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />

        <div
          ref={mobileMenuRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={`absolute left-0 top-16 z-50 h-[calc(100dvh-4rem)] w-[82vw] max-w-sm overflow-y-auto rounded-r-3xl border-r border-blue-100/70 bg-white/[0.98] shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-[350ms] ease-out dark:border-blue-950/70 dark:bg-gray-950/[0.98] lg:hidden md:fixed md:inset-x-0 md:h-[calc(100vh-4rem)] md:w-auto md:max-w-none md:rounded-none md:border-r-0 md:border-t md:border-gray-100 md:bg-white/95 md:shadow-2xl md:dark:border-gray-800 md:dark:bg-gray-950/95 ${
            isMobileMenuOpen
              ? "translate-x-0 md:block md:animate-in md:slide-in-from-top-5"
              : "pointer-events-none -translate-x-full md:hidden"
          }`}
        >
          <div className="p-4 pb-24">
              <div className="mb-5 flex items-center justify-between border-b border-gray-200/80 pb-4 md:hidden dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                    OrbitByte
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    Explore
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="rounded-full border border-gray-200 bg-gray-50 p-2.5 text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  aria-label="Close navigation menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Existing tablet search; phone search stays in the top navbar. */}
              {showSearch && (
                <div className="relative z-[61] mb-6 hidden md:block">
                  <form onSubmit={handleMobileSearchSubmit} className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white border border-transparent dark:border-gray-800"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchSuggestions(e.target.value.length > 0);
                      }}
                    />
                  </form>
                  {showSearchSuggestions && searchQuery.trim().length > 0 && (
                    <div className="pointer-events-auto relative z-[62] mt-3 max-h-[min(50vh,24rem)] touch-pan-y overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-white shadow-lg [-webkit-overflow-scrolling:touch] dark:border-gray-800 dark:bg-gray-900">
                      {isSearchLoading && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          Searching users...
                        </div>
                      )}

                      {!isSearchLoading && searchResults.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          No users found
                        </div>
                      )}

                      {!isSearchLoading &&
                        searchResults.slice(0, 6).map((user) => (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => selectSearchUser(user._id)}
                            className="flex min-h-14 w-full touch-manipulation select-none items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                            aria-label={`Open profile for ${user.name || "user"}`}
                          >
                            <PremiumAvatar
                              src={user.avatar}
                              alt={user.name}
                              fallback={user.name}
                              size={32}
                              isPremium={Boolean(user.isPremium)}
                            />
                            <div className="min-w-0">
                              <PremiumName
                                name={user.name || "Unknown user"}
                                isPremium={Boolean(user.isPremium)}
                                badgeLabel="Premium"
                                badgeClassName="px-1.5 py-0.5 text-[9px]"
                                textClassName="text-sm font-medium text-gray-900 dark:text-white"
                              />
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
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

                  {session?.user && (
                    <Link
                      href="/settings"
                      onClick={(event) => {
                        if (window.matchMedia("(max-width: 767px)").matches) {
                          event.preventDefault();
                          navigateFromMobileMenu("/settings");
                        } else {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                        pathname === "/settings"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Settings size={18} />
                        <span className="font-medium">Settings</span>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 dark:text-gray-600"
                      />
                    </Link>
                  )}
                  
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={(event) => {
                        if (window.matchMedia("(max-width: 767px)").matches) {
                          event.preventDefault();
                          navigateFromMobileMenu(item.path);
                        } else {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                        pathname === item.path
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
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
                    {mounted && theme === "dark" ? (
                      <Sun size={24} className="mb-3 text-amber-400" />
                    ) : (
                      <Moon size={24} className="mb-3 text-blue-600" />
                    )}
                    <span className="text-sm font-medium">
                      {mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}
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
                          <span className="absolute -right-2 -top-2 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-gray-50 bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm dark:border-gray-900">
                            {formatBadgeCount(unreadNotifications)}
                          </span>
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
                    onClick={() => navigateFromMobileMenu("/login")}
                    className="w-full py-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigateFromMobileMenu("/register")}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 text-white font-semibold shadow-lg shadow-blue-500/30"
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
      </header>

      {/* FIXED FULL-WIDTH BOTTOM NAVIGATION (Mobile Only) */}
      {finalShowBottomNav && (
        <div 
          className={`lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-around h-14 px-0">
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
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-700 dark:bg-green-700 rounded-full"></div>
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
