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
          Horizontal scroll on mobile/tablet, 3-column grid on desktop.
          Only the first 3 categories render — wide banner cards.
        */}
        <div
          ref={scrollContainerRef}
          className="flex lg:grid lg:grid-cols-3 items-stretch gap-4 lg:gap-6 overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory py-4 lg:py-0 px-1 lg:px-0 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {CATEGORIES.slice(0, 3).map((cat) => (
            <div
              key={cat.id}
              className={`w-[300px] sm:w-[380px] lg:w-auto shrink-0 snap-start h-[240px] sm:h-[260px] rounded-[24px] p-6 flex flex-col relative overflow-hidden bg-gradient-to-br ${cat.bgGradient} select-none cursor-pointer group`}
            >
              {/* Title + CTA */}
              <div className="flex flex-col relative z-10 max-w-[58%] h-full">
                <span
                  className={`text-[22px] sm:text-[26px] font-bold ${cat.titleColor} leading-tight tracking-tight`}
                >
                  {cat.title}
                </span>
                <button
                  type="button"
                  className="mt-auto w-fit rounded-lg bg-white px-5 py-2 text-[14px] font-semibold text-slate-900 shadow-sm hover:bg-white/90 active:scale-95 transition-all"
                >
                  Order Now
                </button>
              </div>

              {/* Product image, right side */}
              <div className="absolute right-0 bottom-0 w-[150px] sm:w-[190px] h-[180px] sm:h-[210px] overflow-hidden pointer-events-none z-0 rounded-tl-[24px]">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="(max-width: 1024px) 190px, 15vw"
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