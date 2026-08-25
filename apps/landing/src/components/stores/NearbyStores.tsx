"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  Star,
  Clock,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  location: string;
  deliveryTime: string;
  rating: number;
  ordersCount: string;
  image: string;
  badge?: string;
}

const NEARBY_STORES: StoreItem[] = [
  {
    id: "store-1",
    name: "Namaste Fresh Market",
    category: "Grocery & Fresh Produce",
    location: "Kodialbail, Mangalore",
    deliveryTime: "12 mins",
    rating: 4.8,
    ordersCount: "1.2k+",
    image: "/images/indian_store_1.jpg",
    badge: "SUPERSTORE",
  },
  {
    id: "store-2",
    name: "Auro Organics & Spices",
    category: "Organic Staples & Spices",
    location: "Hampankatta, Mangalore",
    deliveryTime: "15 mins",
    rating: 4.9,
    ordersCount: "950+",
    image: "/images/indian_store_2.jpg",
    badge: "POPULAR",
  },
  {
    id: "store-3",
    name: "Grand City Supermarket",
    category: "Dairy, Bakery & Snacks",
    location: "Bejai, Mangalore",
    deliveryTime: "18 mins",
    rating: 4.7,
    ordersCount: "2.4k+",
    image: "/images/indian_store_3.jpg",
  },
  {
    id: "store-4",
    name: "Sharma Kirana Store",
    category: "Atta, Rice & Daily Staples",
    location: "Kadri, Mangalore",
    deliveryTime: "10 mins",
    rating: 4.9,
    ordersCount: "3.1k+",
    image: "/images/indian_store_4.jpg",
    badge: "TOP RATED",
  },
  {
    id: "store-5",
    name: "Shree Ganesh Sweets",
    category: "Sweets, Dry Fruits & Snacks",
    location: "Milagres, Mangalore",
    deliveryTime: "14 mins",
    rating: 4.8,
    ordersCount: "1.8k+",
    image: "/images/indian_store_5.jpg",
  },
];

export default function NearbyStores() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="w-full bg-white pb-14 pt-4">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header: Title + Scroll Arrow Controls & Explore Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Shop on stores you love
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
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
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Explore More Pill Button */}
            <button
              type="button"
              className="flex items-center gap-2 border-[1.5px] border-slate-900 hover:bg-slate-900 text-slate-900 hover:text-white px-5 py-2.5 rounded-full font-bold text-xs transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
            >
              <span>Explore more</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
              className="w-[270px] sm:w-[280px] shrink-0 snap-start bg-white border border-slate-200/80 rounded-3xl p-3 flex flex-col justify-between relative group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Store Image Box */}
              <div className="w-full h-[180px] relative rounded-2xl overflow-hidden bg-slate-100">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="280px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Top Badges (Delivery Time & Rating) */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                  <span className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {store.deliveryTime}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-slate-100">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {store.rating}
                  </span>
                </div>

                {/* VISIBLE SHOP NOW BUTTON (Positioned over bottom-left of card image as in wireframe) */}
                <div className="absolute bottom-3 left-3 z-10">
                  <button
                    type="button"
                    className="bg-white/95 hover:bg-slate-900 text-slate-900 hover:text-white px-4 py-1.5 rounded-xl font-extrabold text-xs shadow-md border border-slate-200/60 transition-all duration-200 flex items-center gap-1.5 cursor-pointer group-hover:scale-105"
                  >
                    <span>Shop now</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Store Details Section */}
              <div className="pt-3.5 px-1 pb-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-1 group-hover:text-[#0052FF] transition-colors">
                    {store.name}
                  </h3>
                </div>

                <p className="text-[11px] font-medium text-slate-500 line-clamp-1">
                  {store.category}
                </p>

                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{store.location}</span>
                </div>
              </div>
            </div>
          ))}

          {/* LAST CARD: VIEW MORE STORES CARD */}
          <div className="w-[270px] sm:w-[280px] shrink-0 snap-start bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] border-2 border-dashed border-slate-300 hover:border-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-4 group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer min-h-[310px]">
            <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-md border border-slate-200/60 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 group-hover:scale-110">
              <Store className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1.5 max-w-[190px]">
              <span className="text-lg font-bold text-slate-900 leading-tight">
                View 50+ More Stores
              </span>
              <span className="text-xs font-medium text-slate-500 leading-snug">
                Explore local kiranas, bakeries & organic markets in Mangalore
              </span>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[#0052FF] group-hover:text-slate-900 transition-colors pt-1">
              <span>View All Stores</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
