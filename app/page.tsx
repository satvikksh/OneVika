"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles,Globe, Infinity, Rocket, ChevronLeft, ChevronRight, BookOpen,} from "lucide-react";
// import Image from "next/image";
import { useTheme } from './theme-provider';
import SimpleNavbar from './components/navbar';


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

// Remove the HomePageProps interface and useState for isDarkMode
// We'll use the theme directly from useTheme

export default function Home() {
  // Get theme from useTheme hook
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  
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
        variant: "purple",
        category: "Interdimensional",
        tag: "✨ Exclusive"
      },
      {
        title: "Neural Nexus",
        text: "Connect with collective consciousness through mind-link technology",
        image: "/img/neural.png",
        link: "/neural-nexus",
        variant: "emerald",
        category: "Psychic Tech",
        tag: "🧠 Advanced"
      },
      {
        title: "Quantum Constructs",
        text: "Build reality-altering structures with quantum manipulation",
        image: "/img/quantum.png",
        link: "/quantum-constructs",
        variant: "amber",
        category: "Reality Engineering",
        tag: "⚡ Experimental"
      },
      {
        title: "Chrono Visions",
        text: "Access temporal streams and view alternate timelines",
        image: "/img/chrono.png",
        link: "/chrono-visions",
        variant: "rose",
        category: "Temporal Studies",
        tag: "⏳ Restricted"
      },
      {
        title: "Aether Gardens",
        text: "Cultivate exotic plants from ethereal dimensions",
        image: "/img/aether.png",
        link: "/aether-gardens",
        variant: "sky",
        category: "Botanical Wonders",
        tag: "🌿 Living"
      },
      {
        title: "Stellar Forge",
        text: "Create celestial bodies and miniature star systems",
        image: "/img/stellar.png",
        link: "/stellar-forge",
        variant: "gray",
        category: "Astro-Creation",
        tag: "⭐ Epic"
      },
    ],
    []
  );

  // Slide data
  const slidesData: SlideData[] = useMemo(
    () => [
      {
        id: 1,
        image: "/img/cosmic-gate12.jpg",
        title: "Welcome to Satvik's Group",
        subtitle: "Imaginary Technology of Infinite Possibilities",
        description: "Where imagination becomes reality and dreams take shape",
        button: { text: "Begin Your Journey", link: "/explore", variant: "outline-light" }
      },
      {
        id: 2,
        image: "/img/neural-network.jpg",
        title: "Beyond Reality",
        subtitle: "Exploring Impossible Concepts",
        description: "Join us in creating what hasn't been imagined yet",
        button: { text: "View Projects", link: "/projects", variant: "outline-info" }
      },
      {
        id: 3,
        image: "/img/quantum-realm.jpg",
        title: "Collective Creation",
        subtitle: "Satvik's Visionary Collective",
        description: "A space where creative minds converge to build new worlds",
        button: { text: "Join The Collective", link: "/join", variant: "outline-success" }
      }
    ],
    []
  );

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
    setCurrentSlide((prev) => (prev - 1 + slidesData.length) % slidesData.length);
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
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
      emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      amber: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      rose: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
      sky: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
      gray: "bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400",
    };
    return variants[variant] || variants.purple;
  };

  const getVariantlinear = (variant: string) => {
    const linears: Record<string, string> = {
      purple: "from-purple-600 to-blue-500",
      emerald: "from-emerald-600 to-green-500",
      amber: "from-amber-600 to-yellow-500",
      rose: "from-rose-600 to-pink-500",
      sky: "from-sky-600 to-cyan-500",
      gray: "from-gray-600 to-gray-500",
    };
    return linears[variant] || linears.purple;
  };

  return (
    <>
      {/* Add SimpleNavbar here */}
      <SimpleNavbar 
        mode={theme}
        toggleMode={toggleTheme}
        isAuthenticated={false}
      />
      
      <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        {/* Carousel Section */}
        <div className="relative h-[85vh] md:h-[90vh] overflow-hidden" ref={carouselRef}>
          {/* Slides */}
          {slidesData.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
              onMouseEnter={() => setAutoplay(false)}
              onMouseLeave={() => setAutoplay(true)}
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out scale-100 hover:scale-105"
                style={{
                  backgroundImage: `linear-linear(rgba(0,0,0,0.7), rgba(0,0,0,0.5)), url(${slide.image})`,
                }}
              />

              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-semibold text-white">IMAGINARY INITIATIVE</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight">
                      <span className="bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                        {slide.title}
                      </span>
                    </h1>

                    {/* Subtitle */}
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white/90 mb-6">
                      {slide.subtitle}
                    </h2>

                    {/* Description */}
                    <p className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                      {slide.description}
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-4 justify-center">
                      <Link
                        href={slide.button.link}
                        className="group px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 flex items-center gap-3"
                      >
                        <span className="font-semibold text-white">{slide.button.text}</span>
                        <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <Link
                        href="/discover"
                        className="group px-8 py-4 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/25 flex items-center gap-3"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span className="font-semibold text-white">Discover Wonders</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 hover:bg-black/50 transition-all duration-300 group"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 hover:bg-black/50 transition-all duration-300 group"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
            {slidesData.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-white'
                    : 'bg-white/50 hover:bg-white/80'
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-purple-500 to-blue-500 mb-6">
              <Rocket className="w-4 h-4" />
              <span className="text-sm font-semibold text-white">🚀 IMAGINARY INITIATIVE</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              Satvik's Imaginary Collective
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
              Building <span className="font-bold text-purple-600 dark:text-purple-400">impossible things</span> in a world that doesn't exist
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <Link
                href="/manifesto"
                className="group px-6 py-3 rounded-xl border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Read Our Manifesto
              </Link>
              <Link
                href="/projects"
                className="group px-6 py-3 rounded-xl border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Explore Projects
              </Link>
              <Link
                href="/create"
                className="group px-6 py-3 rounded-xl border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Create With Us
              </Link>
            </div>

            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Imaginary Technology is a conceptual space where boundaries don't exist.
              Founded by {"Satvik's Group"} as a thought experiment turned creative engine.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: <Globe className="w-8 h-8" />,
                title: "No Limits",
                description: "Physics, logic, and reality are optional here",
                color: "purple"
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Pure Creation",
                description: "Bringing impossible ideas to conceptual life",
                color: "pink"
              },
              {
                icon: <Infinity className="w-8 h-8" />,
                title: "Infinite Scale",
                description: "From micro-realms to entire imaginary universes",
                color: "blue"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10"
              >
                <div className={`w-14 h-14 rounded-xl bg-linear-to-br from-${feature.color}-500 to-${feature.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Projects Section */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                <span className="relative">
                  Imaginary Initiatives
                  <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-linear-to-r from-purple-500 to-blue-500 rounded-full" />
                </span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-600 max-w-2xl mx-auto">
                Explore our ongoing conceptual projects. Each represents an exploration into
                what could exist if reality were more... flexible.
              </p>
            </div>

            {/* Project Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cardsData.map((card, index) => (
                <Link
                  key={index}
                  href={card.link}
                  className="group block"
                >
                  <div className="h-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
                    {/* Card Header with Image */}
                    <div className="relative h-48 overflow-hidden">
                      {/* Tag */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getVariantClasses(card.variant)}`}>
                          {card.tag}
                        </span>
                      </div>
                      
                      {/* Category */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/50 backdrop-blur-sm text-white">
                          {card.category}
                        </span>
                      </div>

                      {/* Image */}
                      <div className="absolute inset-0 bg-linear-to-br from-gray-900/50 to-transparent">
                        <div 
                          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${card.image})` }}
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 bg-white dark:bg-gray-900">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {card.text}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Imaginary Technology</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Satvik's Group</span>
                        </div>
                        <div className={`px-4 py-2 rounded-lg bg-linear-to-r ${getVariantlinear(card.variant)} text-white font-semibold flex items-center gap-2 group-hover:gap-3 transition-all`}>
                          Enter Portal
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="relative py-20 md:py-32 overflow-hidden">
          {/* Background linear */}
          <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20" />
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/10 dark:bg-gray-900/10 backdrop-blur-xl border border-white/20 dark:border-gray-800/20 rounded-3xl p-8 md:p-12 lg:p-16">
                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                  {/* Left Column */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-purple-500 to-blue-500 mb-6">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-semibold text-white">JOIN THE REVOLUTION</span>
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                      Ready to Imagine With Us?
                    </h2>
                    
                    <p className="text-lg text-white/80 mb-8 leading-relaxed">
                      Join {"Satvik's Group"} at Imaginary Technology. No experience required—just bring your imagination.
                      We're building concepts that have never been thought of before.
                    </p>
                    
                    <Link
                      href="/join"
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                    >
                      <Rocket className="w-5 h-5" />
                      Launch Your Imagination
                    </Link>
                  </div>

                  {/* Right Column */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-linear-to-r from-purple-500/20 to-blue-500/20 border border-white/20 mb-6">
                      <div className="text-4xl">⚡✨🌌</div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-2xl font-semibold text-white/90">The Only Rule:</h3>
                      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                        No Rules
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className={`py-12 ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8 md:gap-12 mb-12">
              {/* Column 1 */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold">Satvik's Group</h3>
                </div>
                <p className={`mb-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  A conceptual collective exploring the boundaries of imagination.
                  We create, imagine, and build things that don't exist—yet.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/about"
                    className={`px-4 py-2 rounded-lg border ${
                      isDarkMode 
                        ? "border-gray-700 hover:border-purple-500 text-gray-300 hover:text-purple-400" 
                        : "border-gray-300 hover:border-purple-500 text-gray-700 hover:text-purple-600"
                    } transition-colors`}
                  >
                    Our Origin Story
                  </Link>
                  <Link
                    href="/philosophy"
                    className={`px-4 py-2 rounded-lg border ${
                      isDarkMode 
                        ? "border-gray-700 hover:border-gray-500 text-gray-300 hover:text-gray-400" 
                        : "border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Philosophy
                  </Link>
                </div>
              </div>

              {/* Column 2 */}
              <div>
                <h5 className="text-lg font-bold mb-6">Imaginary Realms</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Link href="/realms/cosmic" className={`block hover:text-purple-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Cosmic Archives
                    </Link>
                    <Link href="/realms/neural" className={`block hover:text-emerald-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Neural Nexus
                    </Link>
                    <Link href="/realms/quantum" className={`block hover:text-amber-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Quantum Constructs
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <Link href="/realms/chrono" className={`block hover:text-rose-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Chrono Visions
                    </Link>
                    <Link href="/realms/aether" className={`block hover:text-sky-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Aether Gardens
                    </Link>
                    <Link href="/realms/stellar" className={`block hover:text-gray-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Stellar Forge
                    </Link>
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div>
                <h5 className="text-lg font-bold mb-6">Join The Imagination</h5>
                <div className="space-y-4">
                  <Link
                    href="/apply"
                    className="block w-full py-3 rounded-lg bg-linear-to-r from-purple-600 to-blue-500 text-white font-semibold text-center hover:from-purple-700 hover:to-blue-600 transition-all duration-300 hover:scale-105"
                  >
                    Submit Concept Proposal
                  </Link>
                  <Link
                    href="/collaborate"
                    className={`block w-full py-3 rounded-lg border text-center font-semibold ${
                      isDarkMode 
                        ? "border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white" 
                        : "border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900"
                    } transition-colors`}
                  >
                    Request Collaboration
                  </Link>
                  <div className={`mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    <p>Email: imagination@satviksgroup.tech</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className={`mb-8 ${isDarkMode ? "border-gray-800" : "border-gray-200"}`} />

            {/* Footer Bottom */}
            <div className="text-center">
              <p className={`mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                © {new Date().getFullYear()} {"Satvik's Group"} • Imaginary Technology
              </p>
              <p className={`text-sm mb-6 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                This institution exists purely in imagination. All concepts, projects, and realms are fictional.
              </p>
              <div className="flex gap-2 justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"}`}>
                  Conceptual
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"}`}>
                  Imaginary
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"}`}>
                  Unreal
                </span>
              </div>
            </div>
          </div>
        </footer>

        {/* Custom animations */}
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          
          .animate-glow {
            animation: glow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </>
  );
}