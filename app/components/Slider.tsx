"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "../components/SafeImage";

interface SlideData {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  description: string;
  button: { text: string; link: string; variant: string };
}

export default function Slider({ slides }: { slides: SlideData[] }) {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const length = slides.length;

  useEffect(() => {
    if (!autoplay) return;
    autoplayRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % length);
    }, 4000);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoplay, length]);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + length) % length);
    autoplayRef.current && clearInterval(autoplayRef.current);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % length);
    autoplayRef.current && clearInterval(autoplayRef.current);
  };

  return (
    <div className="relative h-[85vh] md:h-[90vh] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          onMouseEnter={() => setAutoplay(false)}
          onMouseLeave={() => setAutoplay(true)}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <SafeImage
              src={slide.image}   // <-- FIXED: USE EXACT IMAGE PATH
              alt={slide.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>

          {/* Text Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container mx-auto px-6 text-center text-white">
              <Sparkles className="w-4 h-4 mx-auto opacity-80" />
              <h1 className="text-4xl md:text-6xl font-bold mb-4">{slide.title}</h1>
              <h2 className="text-xl md:text-2xl opacity-90 mb-6">{slide.subtitle}</h2>
              <p className="max-w-2xl mx-auto text-lg md:text-xl opacity-80 mb-8">
                {slide.description}
              </p>

              <Link
                href={slide.button.link}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
              >
                {slide.button.text}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
