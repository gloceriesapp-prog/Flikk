"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

interface ProductItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  image: string;
  badgeBg?: string;
}

const DEFAULT_PRODUCT_IMAGE =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/amul.jpeg";

const POPULAR_PRODUCTS: ProductItem[] = [
  {
    id: "p-1",
    name: "Amul Taaza Toned Fresh Milk",
    quantity: "500 ml",
    price: 27,
    originalPrice: 28,
    discount: "4% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-2",
    name: "Amul Pasteurised Salted Butter",
    quantity: "100 g",
    price: 56,
    originalPrice: 60,
    discount: "6% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-3",
    name: "Fresh Tender Coconut (Elaneer)",
    quantity: "1 pc",
    price: 49,
    originalPrice: 65,
    discount: "24% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-4",
    name: "English Oven Premium Brown Bread",
    quantity: "400 g",
    price: 45,
    originalPrice: 50,
    discount: "10% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-5",
    name: "Amul Tru Berry Dazzle Ice Cream",
    quantity: "1 ltr",
    price: 208,
    originalPrice: 300,
    discount: "30% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-6",
    name: "Thums Up Charged Soft Drink Can",
    quantity: "300 ml",
    price: 38,
    originalPrice: 40,
    discount: "5% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-7",
    name: "Lay's India's Magic Masala Chips",
    quantity: "50 g",
    price: 20,
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: "p-8",
    name: "Ferrero Rocher Hazelnut Box",
    quantity: "4 pcs (50g)",
    price: 149,
    originalPrice: 169,
    discount: "12% OFF",
    image: DEFAULT_PRODUCT_IMAGE,
  },
];

export default function ProductCarousel() {
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
    <section className="w-full bg-white pb-16 pt-2">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-5">
        {/* Section Header: Title & Controls */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Most Ordered Right Now
          </h2>

          <div className="flex items-center gap-3 shrink-0">
            {/* Scroll Navigation Arrows */}
            {/* <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Scroll left"
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
              </button>
            </div> */}

            <a
              href="#see-all-products"
              className="text-sm font-bold text-[#0052FF] hover:underline flex items-center gap-1"
            >
              <span>See All</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Product Cards Horizontal Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory py-2 px-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {POPULAR_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="w-[140px] sm:w-[152px] shrink-0 snap-start flex flex-col group cursor-pointer"
            >
              {/* Product Image Container with Floating (+) Button (No Hover Lift) */}
              <div className="w-full h-[140px] sm:h-[152px] rounded-2xl bg-[#F8FAFC] border border-slate-200/70 p-3 relative flex items-center justify-center overflow-hidden transition-colors duration-200">
                {/* Real Product Image */}
                <Image
                  src={prod.image}
                  alt={prod.name}
                  width={120}
                  height={120}
                  className="w-full h-full object-contain p-1"
                />

                {/* Floating (+) ADD Button */}
                <button
                  type="button"
                  aria-label={`Add ${prod.name}`}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-xl bg-white hover:bg-[#0052FF] text-[#0052FF] hover:text-white border border-[#0052FF] flex items-center justify-center shadow-xs transition-all duration-200 cursor-pointer active:scale-95 z-10"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" />
                </button>
              </div>

              {/* Product Info */}
              <div className="flex flex-col pt-2.5 px-0.5">
                {/* Product Name */}
                <h3 className="text-xs sm:text-[14px] font-extrabold text-[#0F172A] leading-snug tracking-tight line-clamp-2 min-h-[36px] transition-colors">
                  {prod.name}
                </h3>

                {/* Quantity */}
                <span className="text-xs font-medium text-slate-400 mt-0.5">
                  {prod.quantity}
                </span>

                {/* Discount Tag */}
                {prod.discount ? (
                  <span className="text-xs font-extrabold text-emerald-600 tracking-tight mt-1">
                    {prod.discount}
                  </span>
                ) : (
                  <div className="h-[17px] mt-1" />
                )}

                {/* Price Row */}
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-base font-extrabold text-slate-900">
                    ₹{prod.price}
                  </span>
                  {prod.originalPrice && (
                    <span className="text-sm font-semibold text-slate-400 line-through">
                      ₹{prod.originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
