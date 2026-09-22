"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { LandingProduct } from "@/lib/products";

interface Props {
  // Real products (fetchRandomProducts, src/lib/products.ts) — fetched
  // server-side in page.tsx (a Server Component) and passed down, since
  // this component itself is 'use client' for the scroll-drag interaction
  // below. Card UI/markup is unchanged from the old POPULAR_PRODUCTS mock
  // version — only the data source moved.
  products: LandingProduct[];
}

export default function ProductCarousel({ products }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // No placeholder row pretending to be real data — same "no real data =
  // section off" convention the rest of this monorepo already follows.
  if (products.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      // Reduced scroll amount to match the smaller card sizes
      const scrollAmount = direction === "left" ? -310 : 310;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="w-full bg-white pb-16 pt-2">
      {/* Container max-width increased to 1280px to align with Hero & Navbar grids */}
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-5">
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
          {products.map((prod) => (
            <div
              key={prod.id}
              // Card width scaled down for a tighter, denser carousel layout
              className="w-[140px] sm:w-[155px] shrink-0 snap-start flex flex-col group cursor-pointer"
            >
              {/* Product Image Container with Floating (+) Button (No Hover Lift) */}
              <div className="w-full h-[140px] sm:h-[155px] rounded-[16px] bg-[#F8FAFC] border border-slate-200/70 p-3 relative flex items-center justify-center overflow-hidden transition-colors duration-200 group-hover:border-slate-300">
                {/* Real Product Image — fill (not fixed width/height) is
                    what actually makes this work for real product photos:
                    the old mock data was one fixed-size placeholder image
                    reused for every card, so a hardcoded 120x120 box never
                    revealed the problem. Real photos come in whatever
                    dimensions a store owner uploaded, and fixed width/
                    height fights object-contain's own aspect-ratio-
                    preserving scale-to-fit — fill (sized against the
                    parent's own relative, fixed-size box above) is what
                    correctly fits any real image inside that box without
                    stretching or clipping it. */}
                <Image
                  src={prod.image}
                  alt={prod.name}
                  fill
                  sizes="(max-width: 640px) 140px, 155px"
                  className="object-contain p-2"
                />

                {/* Floating (+) ADD Button - slightly scaled down */}
                <button
                  type="button"
                  aria-label={`Add ${prod.name}`}
                  className="absolute top-2 right-2 w-7 h-7 bg-white hover:bg-[#0052FF] text-[#0052FF] hover:text-white border border-[#0052FF] rounded-lg flex items-center justify-center shadow-xs transition-all duration-200 cursor-pointer active:scale-95 z-10"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" />
                </button>
              </div>

              {/* Product Info - Typography scaled down to match smaller card */}
              <div className="flex flex-col pt-3 px-1">
                {/* Product Name */}
                <h3 className="text-[12px] sm:text-[14px] font-extrabold text-[#0F172A] leading-snug tracking-tight line-clamp-2 min-h-[36px] transition-colors">
                  {prod.name}
                </h3>

                {/* Quantity */}
                <span className="text-[11px] sm:text-[12px] font-medium text-slate-400 mt-1">
                  {prod.quantity}
                </span>

                {/* Discount Tag */}
                {prod.discount ? (
                  <span className="text-[11px] sm:text-[12px] font-extrabold text-emerald-600 tracking-tight mt-1">
                    {prod.discount}
                  </span>
                ) : (
                  <div className="h-[16px] sm:h-[18px] mt-1" />
                )}

                {/* Price Row */}
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-[15px] sm:text-[17px] font-extrabold text-slate-900 tracking-tight">
                    ₹{prod.price}
                  </span>
                  {prod.originalPrice && (
                    <span className="text-[12px] sm:text-[13px] font-semibold text-slate-400 line-through">
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