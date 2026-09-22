"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  titleColor: string;
  subtitleColor: string;
  image: string;
  poweredBy?: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: "festive-sweets",
    title: "Ganesh Festival Sweets",
    subtitle: "Fresh modaks, laddoos, puja thalis & festive hampers...",
    bgGradient: "from-[#FEF3C7] via-[#FDE047]/90 to-[#F59E0B]/80",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "/images/rakhi_gifting_banner.jpg",
    poweredBy: "festive corner",
  },
  {
    id: "paan-corner",
    title: "Paan & Mints Corner",
    subtitle: "Get smoking accessories, mouth fresheners & mints delivered instantly",
    bgGradient: "from-[#EAE3D9] via-[#E2D8C9] to-[#D5C9B8]",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-700",
    image: "/images/paan_corner_banner.jpg",
  },
  {
    id: "hygiene-care",
    title: "Girls, Be Prepared Anytime",
    subtitle: "Range of feminine hygiene, skincare & hair removal products",
    bgGradient: "from-[#EE7777] via-[#E26A96] to-[#9C8ADE]",
    titleColor: "text-white",
    subtitleColor: "text-white/90",
    image: "/images/hygiene_care_banner.jpg",
  },
  {
    id: "monsoon-chai",
    title: "Chai & Rainy Munchies",
    subtitle: "Hot tea, coffee, cookies, chips & crispy instant snacks for rain",
    bgGradient: "from-[#FFEDD5] via-[#F97316]/80 to-[#EA580C]",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "/images/cat_snack_time.jpg",
  },
];

export default function CategoryGrid() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="w-full bg-white pb-12 pt-2">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header: Title + Scroll Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              What are you looking for?
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-500">
              Explore everyday shopping categories with fast local store delivery
            </p>
          </div>

          {/* Scroll Navigation Arrows */}
          <div className="hidden sm:flex lg:hidden items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll categories left"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-700 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll categories right"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-700 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 
          Horizontal Scrollable Track (Mobile/Tablet) 
          Switches to a 4-column Grid on Desktop (lg)
          Increased desktop gap (lg:gap-8) forces columns narrower
        */}
        <div
          ref={scrollContainerRef}
          className="flex lg:grid lg:grid-cols-4 items-stretch gap-4 lg:gap-8 overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory py-4 lg:py-0 px-1 lg:px-0 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              // Reduced widths and heights overall
              className={`w-[260px] sm:w-[290px] lg:w-auto shrink-0 snap-start h-[210px] sm:h-[230px] rounded-[20px] p-4 sm:p-5 flex flex-col relative overflow-hidden bg-gradient-to-br ${cat.bgGradient} select-none cursor-pointer group`}
            >
              {/* Top Right Powered By Tag if applicable */}
              {cat.poweredBy && (
                <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full flex flex-col items-end">
                  <span className="text-[7px] font-medium text-slate-400 leading-none">
                    Powered by
                  </span>
                  <span className="text-[9px] font-bold text-slate-800 tracking-tight leading-none mt-0.5">
                    {cat.poweredBy}
                  </span>
                </div>
              )}

              {/* Text Content - Scaled down fonts */}
              <div
                className={`flex flex-col gap-1 relative z-10 ${
                  cat.poweredBy ? "max-w-[140px] sm:max-w-[65%]" : "max-w-[180px] sm:max-w-[75%]"
                }`}
              >
                <span
                  className={`text-[18px] sm:text-[20px] font-bold ${cat.titleColor} leading-tight tracking-tight`}
                >
                  {cat.title}
                </span>
                <span
                  className={`text-[12px] font-medium ${cat.subtitleColor} leading-snug line-clamp-3`}
                >
                  {cat.subtitle}
                </span>
              </div>

              {/* Product Image Right Bottom - Scaled down image box */}
              <div className="absolute right-0 bottom-0 w-[140px] sm:w-[160px] lg:w-[150px] xl:w-[160px] h-[120px] sm:h-[140px] overflow-hidden pointer-events-none z-0 rounded-tl-[20px]">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="(max-width: 1024px) 160px, 20vw"
                  className="object-cover object-left-top group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}