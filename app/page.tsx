"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Globe,
  Infinity,
  Rocket,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import SimpleNavbar from "./components/navbar";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";

// Type definitions
interface CardData {
  title: string;
  text: string;
  image: string;
  link: string;
  variant: string;
  category: string;
  tag: string;
}

interface SlideData {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  description: string;
  button: {
    text: string;
    link: string;
    variant: string;
  };
}

export default function Home() {
  // Get theme from useTheme hook
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Use resolvedTheme for accurate theme detection
  const isDarkMode = resolvedTheme === "dark";

  const { data: session, status } = useSession();
  const isLoggedIn = !!session?.user;

  // State
  const [windowWidth, setWindowWidth] = useState<number>(1024);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [autoplay, setAutoplay] = useState<boolean>(true);

  // Refs
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Card data
  const cardsData: CardData[] = useMemo(
    () => [
      {
        title: "Cosmic Archives",
        text: "Explore interdimensional knowledge from across the multiverse",
        image: "/img/cosmic.png",
        link: "/cosmic-archives",
        variant: "blue",
        category: "Interdimensional",
        tag: "✨ Exclusive",
      },
      {
        title: "Neural Nexus",
        text: "Connect with collective consciousness through mind-link technology",
        image: "/img/neural.png",
        link: "/neural-nexus",
        variant: "emerald",
        category: "Psychic Tech",
        tag: "🧠 Advanced",
      },
      {
        title: "Quantum Constructs",
        text: "Build reality-altering structures with quantum manipulation",
        image: "/img/quantum.png",
        link: "/quantum-constructs",
        variant: "amber",
        category: "Reality Engineering",
        tag: "⚡ Experimental",
      },
      {
        title: "Chrono Visions",
        text: "Access temporal streams and view alternate timelines",
        image: "/img/chrono.png",
        link: "/chrono-visions",
        variant: "rose",
        category: "Temporal Studies",
        tag: "⏳ Restricted",
      },
      {
        title: "Aether Gardens",
        text: "Cultivate exotic plants from ethereal dimensions",
        image: "/img/aether.png",
        link: "/aether-gardens",
        variant: "sky",
        category: "Botanical Wonders",
        tag: "🌿 Living",
      },
      {
        title: "Stellar Forge",
        text: "Create celestial bodies and miniature star systems",
        image: "/img/stellar.png",
        link: "/stellar-forge",
        variant: "gray",
        category: "Astro-Creation",
        tag: "⭐ Epic",
      },
    ],
    []
  );

  // Slide data
  const slidesData = useMemo(
    () => [
      {
        id: 1,
        image: "/img/cosmic-gate12.jpg",
        title: "Welcome to Satvik's Group",
        subtitle: "Imaginary Technology of Infinite Possibilities",
        description: "Where imagination becomes reality and dreams take shape",
        button: {
          text: "Begin Your Journey",
          link: "/explore",
          variant: "light",
        },
      },
      {
        id: 2,
        image: "/img/neural-network.jpg",
        title: "Beyond Reality",
        subtitle: "Exploring Impossible Concepts",
        description: "Join us in creating what hasn't been imagined yet",
        button: { text: "View Projects", link: "/projects", variant: "info" },
      },
      {
        id: 3,
        image: "/img/quantum-realm.jpg",
        title: "Collective Creation",
        subtitle: "Satvik's Visionary Collective",
        description: "A space where creative minds build new worlds",
        button: {
          text: "Join The Collective",
          link: "/join",
          variant: "success",
        },
      },
    ],
    []
  );

  // Handle mount to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carousel autoplay
  useEffect(() => {
    if (!autoplay) return;

    autoplayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    }, 4000);

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [autoplay, slidesData.length]);

  // Carousel navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + slidesData.length) % slidesData.length
    );
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
  };

  // Get variant color classes
  const getVariantClasses = (variant: string) => {
    const variants: Record<string, string> = {
      blue:
        "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
      emerald:
        "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      amber:
        "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      rose: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
      sky: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
      gray: "bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400",
    };
    return variants[variant] || variants.blue;
  };

  const getVariantgradient = (variant: string) => {
    const gradients: Record<string, string> = {
      blue: "from-blue-600 to-blue-500",
      emerald: "from-emerald-600 to-green-500",
      amber: "from-amber-600 to-yellow-500",
      rose: "from-rose-600 to-pink-500",
      sky: "from-sky-600 to-cyan-500",
      gray: "from-gray-600 to-gray-500",
    };
    return gradients[variant] || gradients.blue;
  };

  // Don't render theme-dependent content until mounted
  if (!mounted) {
    return (
      <>
        <SimpleNavbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-16">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-8"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SimpleNavbar />
      <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
        {/* Carousel Section */}
        {/* FIXED: -mt-16 to pull image behind navbar, and 100dvh for proper mobile full screen */}
        <div
          className="relative h-[100dvh] w-full overflow-hidden -mt-16"
          ref={carouselRef}
        >
          {/* Slides */}
          {slidesData.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              onMouseEnter={() => setAutoplay(false)}
              onMouseLeave={() => setAutoplay(true)}
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out scale-100 hover:scale-105"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${slide.image})`,
                }}
              />

              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                      <span className="text-xs md:text-sm font-bold tracking-widest text-white uppercase">
                        Imaginary Initiative
                      </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-4 leading-[1.1] tracking-tight drop-shadow-sm">
                      <span className="bg-gradient-to-r from-blue-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
                        {slide.title}
                      </span>
                    </h1>

                    {/* Subtitle */}
                    <h2 className="text-lg sm:text-2xl md:text-3xl font-medium text-gray-200 mb-6 max-w-3xl mx-auto">
                      {slide.subtitle}
                    </h2>

                    {/* Description */}
                    <p className="hidden sm:block text-base sm:text-lg md:text-xl text-gray-300/90 mb-8 max-w-2xl mx-auto leading-relaxed">
                      {slide.description}
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                      <Link
                        href={slide.button.link}
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-gray-900 font-bold text-sm sm:text-base hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
                      >
                        <span>{slide.button.text}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href="/discover"
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm sm:text-base hover:bg-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Discover Worlds</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows - Hidden on very small mobile to save space */}
          <button
            onClick={prevSlide}
            className="hidden sm:flex absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 z-20 p-4 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all duration-300 group"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <button
            onClick={nextSlide}
            className="hidden sm:flex absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-20 p-4 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all duration-300 group"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
            {slidesData.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "w-8 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Main Content Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-500 mb-6 shadow-lg shadow-blue-500/25">
              <Rocket className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white tracking-wide">
                IMAGINARY INITIATIVE
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">
              Satvik&#39;s{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-pink-600 to-blue-600">
                Imaginary Collective
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Building{" "}
              <span className="font-bold text-gray-900 dark:text-white underline decoration-blue-500 decoration-2 underline-offset-4">
                impossible things
              </span>{" "}
              in a world that doesn&#39;t exist.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <Link
                href="/manifesto"
                className="px-6 py-3 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-300 font-medium flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Read Manifesto
              </Link>
              <Link
                href="/projects"
                className="px-6 py-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all duration-300 font-medium flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Explore Projects
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: <Globe className="w-6 h-6" />,
                title: "No Limits",
                description: "Physics, logic, and reality are optional here.",
                color: "blue",
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Pure Creation",
                description: "Bringing impossible ideas to conceptual life.",
                color: "pink",
              },
              {
                icon: <Infinity className="w-6 h-6" />,
                title: "Infinite Scale",
                description: "From micro-realms to entire universes.",
                color: "blue",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-3xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${
                    feature.color === "blue"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : feature.color === "pink"
                      ? "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  } flex items-center justify-center mb-6 transition-transform group-hover:scale-110 rotate-3 group-hover:rotate-0`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Projects Section */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Imaginary Initiatives
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Explore our ongoing conceptual projects. Each represents an
                  exploration into flexible reality.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 hover:gap-3 transition-all"
              >
                View all projects <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Project Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {cardsData.map((card, index) => (
                <div key={index} className="group relative">
                  <div className="h-full rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
                    {/* Card Header with Image */}
                    <div className="relative h-56 overflow-hidden">
                      <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getVariantClasses(
                            card.variant
                          )} bg-white/90 dark:bg-black/80 backdrop-blur-md`}
                        >
                          {card.tag}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 z-10" />

                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${card.image})` }}
                      />
                    </div>

                    {/* Card Body */}
                    <div className="p-6 md:p-8">
                      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider">
                        {card.category}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                        {card.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-2">
                        {card.text}
                      </p>

                      {/* Footer */}
                      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                        {isLoggedIn ? (
                          <Link
                            href={card.link}
                            className={`w-full py-3 rounded-xl bg-gradient-to-r ${getVariantgradient(
                              card.variant
                            )} text-white font-bold flex items-center justify-center gap-2 opacity-90 hover:opacity-100 hover:shadow-lg transition-all`}
                          >
                            Enter Portal
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        ) : (
                          <Link
                            href="/login"
                            className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                          >
                            <Lock className="w-4 h-4" />
                            Login Required
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="relative py-24 md:py-32 overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-black" />

          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-700" />
          </div>

          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-16 overflow-hidden relative shadow-2xl">
                {/* Decorative Grid */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />

                <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left Column */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm font-semibold text-white">
                        Access Granted
                      </span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">
                      Ready to Imagine With Us?
                    </h2>

                    <p className="text-lg text-gray-300 mb-10 leading-relaxed">
                      Join {"Satvik's Group"} at Imaginary Technology. No
                      experience required—just bring your imagination.
                    </p>

                    <Link
                      href="/join"
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-blue-50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                      <Rocket className="w-5 h-5" />
                      Launch Concept
                    </Link>
                  </div>

                  {/* Right Column */}
                  <div className="text-center lg:text-right">
                    <div className="inline-block relative">
                      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse" />
                      <div className="relative w-40 h-40 rounded-full bg-black/50 border-2 border-white/20 flex items-center justify-center backdrop-blur-md">
                        <span className="text-6xl">🌌</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className={`py-16 border-t ${
            isDarkMode
              ? "bg-black border-gray-800 text-white"
              : "bg-gray-50 border-gray-200 text-gray-900"
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
              {/* Brand */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Satvik&#39;s Group
                  </h3>
                </div>
                <p
                  className={`mb-6 text-sm leading-relaxed ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  A conceptual collective exploring the boundaries of
                  imagination. We create, imagine, and build things that
                  don&#39;t exist—yet.
                </p>
                <div className="flex gap-4">
                  {["twitter", "github", "discord"].map((social) => (
                    <Link
                      key={social}
                      href={`#${social}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isDarkMode
                          ? "bg-gray-900 hover:bg-gray-800 text-gray-400"
                          : "bg-white hover:bg-gray-100 text-gray-500 shadow-sm"
                      }`}
                    >
                      <span className="capitalize text-xs">{social[0]}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Links Column */}
              <div>
                <h4 className="font-bold mb-6">Explore</h4>
                <ul className="space-y-4 text-sm">
                  {["About Us", "Manifesto", "Timeline", "Careers"].map(
                    (item) => (
                      <li key={item}>
                        <Link
                          href="#"
                          className={`hover:text-blue-500 transition-colors ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {item}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Links Column */}
              <div>
                <h4 className="font-bold mb-6">Realms</h4>
                <ul className="space-y-4 text-sm">
                  {[
                    "Cosmic Archives",
                    "Neural Nexus",
                    "Quantum Constructs",
                    "Aether Gardens",
                  ].map((item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className={`hover:text-blue-500 transition-colors ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-bold mb-6">Contact</h4>
                <div
                  className={`text-sm space-y-4 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <p>imagination@satviksgroup.tech</p>
                  <p>New Delhi, India</p>
                  <Link
                    href="/contact"
                    className="inline-block px-4 py-2 rounded-lg border border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold"
                  >
                    Send Signal
                  </Link>
                </div>
              </div>
            </div>

            <div
              className={`pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${
                isDarkMode ? "border-gray-900" : "border-gray-200"
              }`}
            >
              <p
                className={`text-xs ${
                  isDarkMode ? "text-gray-600" : "text-gray-400"
                }`}
              >
                © {new Date().getFullYear()} Satvik&#39;s Group. All rights
                reserved.
              </p>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500">
                  CONCEPTUAL
                </span>
                <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500">
                  IMAGINARY
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}