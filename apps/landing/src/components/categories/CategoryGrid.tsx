"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryItem {
  id: string;
  title: string;
  bgColor: string;
  textColor: string;
  image: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: "cat-1",
    title: "Groceries & Staples",
    bgColor: "bg-[#FEF3C7]",
    textColor: "text-[#92400E]",
    image: "/images/indian_store_2.jpg",
  },
  {
    id: "cat-2",
    title: "Fruits & Vegetables",
    bgColor: "bg-[#D8F3DC]",
    textColor: "text-[#064E3B]",
    image: "/images/cat_kitchen_restock.jpg",
  },
  {
    id: "cat-3",
    title: "Meat & Seafood",
    bgColor: "bg-[#FFE4E6]",
    textColor: "text-[#9F1239]",
    image: "/images/rakhi_gifting_banner.jpg",
  },
  {
    id: "cat-4",
    title: "Bakery & Dairy",
    bgColor: "bg-[#FFF3C4]",
    textColor: "text-[#78350F]",
    image: "/images/cat_morning_needs.jpg",
  },
  {
    id: "cat-5",
    title: "Home & Kitchen",
    bgColor: "bg-[#E2D9F3]",
    textColor: "text-[#4C1D95]",
    image: "/images/cat_home_essentials.jpg",
  },
  {
    id: "cat-6",
    title: "Protein & Fitness",
    bgColor: "bg-[#CFFAFE]",
    textColor: "text-[#0E7490]",
    image: "/images/hygiene_care_banner.jpg",
  },
];

export default function CategoryGrid() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="w-full bg-white pb-12 pt-2">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header: Title + Scroll Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              What are you looking for?
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Explore everyday shopping categories for fast 10-minute delivery
            </p>
          </div>

          {/* Scroll Navigation Arrows */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll categories left"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll categories right"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Category Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-4.5 overflow-x-auto scrollbar-none snap-x snap-mandatory py-2 px-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`w-[195px] sm:w-[210px] h-[270px] sm:h-[280px] shrink-0 snap-start rounded-[26px] p-4 flex flex-col justify-between relative group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer ${cat.bgColor}`}
            >
              {/* Category Title */}
              <div className="flex flex-col gap-1 pt-1 px-1">
                <h3
                  className={`text-lg sm:text-[20px] font-bold leading-tight tracking-tight max-w-[160px] ${cat.textColor}`}
                >
                  {cat.title}
                </h3>
              </div>

              {/* Clean Inner Square Image (NO border, NO outer stroke as requested) */}
              <div className="w-full aspect-square relative rounded-2xl overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="210px"
                  className="object-cover object-center rounded-2xl group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
