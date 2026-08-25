"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { Plus, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  deliveryTime: string;
  image: string;
  badgeBg?: string;
}

const ICE_CREAM_PRODUCTS: ProductItem[] = [
  {
    id: "p-1",
    name: "Amul Tru Berry Dazzle Ice Cream Tub",
    quantity: "1 ltr",
    price: 208,
    originalPrice: 300,
    discount: "30% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
    badgeBg: "bg-pink-500",
  },
  {
    id: "p-2",
    name: "Go Zero Mad Over Mango Guilt Free Tub",
    quantity: "500 ml",
    price: 266,
    originalPrice: 380,
    discount: "30% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
    badgeBg: "bg-amber-500",
  },
  {
    id: "p-3",
    name: "The Brooklyn Creamery Choco Fudge",
    quantity: "450 ml",
    price: 332,
    originalPrice: 349,
    discount: "4% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
  },
  {
    id: "p-4",
    name: "Go Zero Only Vanilla Guilt Free Tub",
    quantity: "1 ltr",
    price: 219,
    originalPrice: 249,
    discount: "12% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
  },
  {
    id: "p-5",
    name: "Go Zero Simply Sitaphal Guilt Free",
    quantity: "500 ml",
    price: 266,
    originalPrice: 380,
    discount: "30% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
  },
  {
    id: "p-6",
    name: "The Brooklyn Creamery Holy Moly Mango",
    quantity: "450 ml",
    price: 332,
    originalPrice: 349,
    discount: "4% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
  },
  {
    id: "p-7",
    name: "Kwality Wall's Alphonso Mango Tub",
    quantity: "700 ml",
    price: 160,
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
  },
  {
    id: "p-8",
    name: "NIC Ice Creams Tender Coconut Tub",
    quantity: "500 ml",
    price: 322,
    originalPrice: 350,
    discount: "8% OFF",
    deliveryTime: "4 mins",
    image: "/images/sub_icecream.png",
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
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Discover Your Favorite Scoop
          </h2>

          <div className="flex items-center gap-3 shrink-0">
            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Scroll left"
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
                className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <a
              href="#see-all-icecreams"
              className="text-sm font-bold text-[#0052FF] hover:underline flex items-center gap-1"
            >
              <span>See All</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Product Cards Horizontal Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory py-2 px-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {ICE_CREAM_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="w-[140px] sm:w-[152px] shrink-0 snap-start flex flex-col group cursor-pointer"
            >
              {/* Product Image Container with Floating (+) Button */}
              <div className="w-full h-[140px] sm:h-[152px] rounded-2xl bg-[#F8FAFC] group-hover:bg-[#F1F5F9] border border-slate-200/70 p-3 relative flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-1">
                {/* SVG Product Graphic / Tub Image */}
                <IceCreamTubGraphic id={prod.id} />

                {/* Floating (+) ADD Button */}
                <button
                  type="button"
                  aria-label={`Add ${prod.name}`}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-xl bg-white hover:bg-[#0052FF] text-[#0052FF] hover:text-white border border-[#0052FF] flex items-center justify-center shadow-xs transition-all duration-200 cursor-pointer group-hover:scale-105 active:scale-95 z-10"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Product Info */}
              <div className="flex flex-col pt-2.5 px-0.5">
                {/* Delivery Time */}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {prod.deliveryTime}
                </span>

                {/* Product Name */}
                <h3 className="text-xs sm:text-[13px] font-bold text-[#0F172A] leading-snug tracking-tight line-clamp-2 mt-1 min-h-[34px] group-hover:text-[#0052FF] transition-colors">
                  {prod.name}
                </h3>

                {/* Quantity */}
                <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {prod.quantity}
                </span>

                {/* Discount Tag */}
                {prod.discount ? (
                  <span className="text-[11px] font-extrabold text-emerald-600 tracking-tight mt-1">
                    {prod.discount}
                  </span>
                ) : (
                  <div className="h-[17px] mt-1" />
                )}

                {/* Price Row */}
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-sm font-black text-slate-900">
                    ₹{prod.price}
                  </span>
                  {prod.originalPrice && (
                    <span className="text-xs font-semibold text-slate-400 line-through">
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

{/* Crisp Vector Graphic Component for Ice Cream Tubs */}
function IceCreamTubGraphic({ id }: { id: string }) {
  switch (id) {
    case "p-1": // Berry Dazzle
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full object-contain">
          <ellipse cx="50" cy="30" rx="36" ry="10" fill="#9B2C2C" />
          <path d="M14 30 L22 80 H78 L86 30 Z" fill="#D53F8C" />
          <ellipse cx="50" cy="30" rx="33" ry="8" fill="#E53E3E" />
          <circle cx="50" cy="55" r="14" fill="#FFF" opacity="0.9" />
          <text x="50" y="58" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#9B2C2C">BERRY</text>
        </svg>
      );
    case "p-2": // Mango Tub
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full object-contain">
          <ellipse cx="50" cy="30" rx="36" ry="10" fill="#D69E2E" />
          <path d="M14 30 L22 80 H78 L86 30 Z" fill="#DD6B20" />
          <ellipse cx="50" cy="30" rx="33" ry="8" fill="#F6AD55" />
          <circle cx="50" cy="55" r="14" fill="#FFF" opacity="0.9" />
          <text x="50" y="58" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#DD6B20">MANGO</text>
        </svg>
      );
    case "p-3": // Choco Fudge
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full object-contain">
          <ellipse cx="50" cy="30" rx="36" ry="10" fill="#4A5568" />
          <path d="M14 30 L22 80 H78 L86 30 Z" fill="#2D3748" />
          <ellipse cx="50" cy="30" rx="33" ry="8" fill="#744210" />
          <circle cx="50" cy="55" r="14" fill="#3182CE" />
          <text x="50" y="58" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#FFF">BROOKLYN</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full object-contain">
          <ellipse cx="50" cy="30" rx="36" ry="10" fill="#319795" />
          <path d="M14 30 L22 80 H78 L86 30 Z" fill="#319795" />
          <ellipse cx="50" cy="30" rx="33" ry="8" fill="#4FD1C5" />
          <circle cx="50" cy="55" r="14" fill="#FFF" />
          <text x="50" y="58" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#234E52">SCOOP</text>
        </svg>
      );
  }
}
