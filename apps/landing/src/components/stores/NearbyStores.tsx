"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Location01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  location: string;
  image: string;
}

const NEARBY_STORES: StoreItem[] = [
  {
    id: "store-1",
    name: "Janatha Bazaar Supermarket",
    category: "Groceries, Staples & Daily Needs",
    location: "Kodialbail, Mangalore",
    image: "/images/indian_store_1.jpg",
  },
  {
    id: "store-2",
    name: "Ideal Ice Cream Parlour",
    category: "Ice Creams, Sundaes & Desserts",
    location: "Hampankatta, Mangalore",
    image: "/images/indian_store_2.jpg",
  },
  {
    id: "store-3",
    name: "Mangalore Fresh Fish & Meat",
    category: "Fresh Seafood, Chicken & Mutton",
    location: "Bunder, Mangalore",
    image: "/images/indian_store_3.jpg",
  },
  {
    id: "store-4",
    name: "Sharma Kirana Store",
    category: "Atta, Rice & Daily Staples",
    location: "Kadri, Mangalore",
    image: "/images/indian_store_4.jpg",
  },
  {
    id: "store-5",
    name: "Shree Ganesh Sweets",
    category: "Sweets, Dry Fruits & Snacks",
    location: "Milagres, Mangalore",
    image: "/images/indian_store_5.jpg",
  },
];

export default function NearbyStores() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -310 : 310;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="w-full bg-white py-8">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Shop on stores you love
            </h2>
            <p className="text-xs sm:text-base font-medium text-slate-500">
              Handpicked top-rated local kirana & supermarkets near you in Mangalore
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Scroll left"
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
              </button>
            </div>

            {/* Explore More Pill Button */}
           
          </div>
        </div>

        {/* Horizontal Scrollable Track Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-5 overflow-x-auto scrollbar-none snap-x snap-mandatory py-2 px-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {NEARBY_STORES.map((store) => (
            <div
              key={store.id}
              className="w-[285px] sm:w-[300px] shrink-0 snap-start bg-white border border-slate-200/80 rounded-3xl p-3 flex flex-col justify-between relative cursor-pointer overflow-hidden"
            >
              {/* Clean Store Image Box (No image overlay badges) */}
              <div className="w-full h-[180px] relative rounded-2xl overflow-hidden bg-slate-100">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>

              {/* Bottom Info & Action Section */}
              <div className="pt-3 px-1 pb-1 flex items-center justify-between gap-3">
                {/* Left Side: Shop Name, Category & Location */}
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug truncate">
                    {store.name}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 truncate">
                    {store.category}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-0.5">
                    <HugeiconsIcon icon={Location01Icon} className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{store.location}</span>
                  </div>
                </div>

                {/* Right Side: Clean 'Shop now' Button */}
                <button
                  type="button"
                  className="bg-[#0052FF] hover:bg-[#0040E0] active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  <span>Shop now</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}

          {/* LAST CARD: VIEW MORE STORES CARD */}
          <div className="w-[285px] sm:w-[300px] shrink-0 snap-start bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-4 cursor-pointer min-h-[260px]">
            <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-xs border border-slate-200/60">
              <HugeiconsIcon icon={Store01Icon} className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1.5 max-w-[190px]">
              <span className="text-lg font-bold text-slate-900 leading-tight">
                View 50+ More Stores
              </span>
              <span className="text-xs font-medium text-slate-500 leading-snug">
                Explore local kiranas, bakeries & organic markets in Mangalore
              </span>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[#0052FF] pt-1">
              <span>View All Stores</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
