"use client";

import React from "react";
import Image from "next/image";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  image: string;
  distance: string;
}

const NEARBY_STORES: StoreItem[] = [
  {
    id: "store-1",
    name: "The Ocean Pearl",
    category: "Kerala • Seafood",
    image: "/images/indian_store_1.jpg",
    distance: "4.1 KM Away",
  },
  {
    id: "store-2",
    name: "Bacchus Inn",
    category: "North Indian • Chinese",
    image: "/images/indian_store_2.jpg",
    distance: "1.1 KM Away",
  },
  {
    id: "store-3",
    name: "Janatha Bazaar",
    category: "Groceries • Staples",
    image: "/images/indian_store_3.jpg",
    distance: "2.4 KM Away",
  },
  {
    id: "store-4",
    name: "Ideal Ice Cream",
    category: "Ice Cream • Desserts",
    image: "/images/indian_store_4.jpg",
    distance: "3.2 KM Away",
  },
];

export default function NearbyStores() {
  return (
    <section className="w-full bg-white pt-8 pb-14 sm:pb-16">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl sm:text-[30px] font-semibold text-[#0F172A] tracking-tight">
            Shop on stores you love
          </h2>
        </div>

        {/* Mobile: horizontal snap scroll. Desktop (lg): fixed 4-column grid. */}
        <div
          className="flex lg:grid lg:grid-cols-4 items-stretch gap-5 lg:gap-6 overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory pb-4 lg:pb-0 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {NEARBY_STORES.map((store) => (
            <a
              key={store.id}
              href="#download-android"
              className="w-[300px] sm:w-[320px] lg:w-auto shrink-0 snap-start flex flex-col rounded-3xl border border-slate-200/80 bg-white p-2.5"
            >
              {/* Image with distance pill */}
              <div className="w-full aspect-[4/3] relative bg-slate-100 overflow-hidden rounded-2xl">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 1024px) 320px, 25vw"
                  className="object-cover"
                />
                <span className="absolute top-3 right-3 bg-white/95 backdrop-blur text-[#1C1C1C] text-[12px] font-medium px-3 py-1 rounded-full shadow-sm tabular-nums">
                  {store.distance}
                </span>
              </div>

              {/* Name + category, with round arrow CTA */}
              <div className="flex items-center justify-between gap-3 px-2 pt-4 pb-1.5">
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[18px] font-medium text-[#1C1C1C] tracking-tight truncate leading-tight">
                    {store.name}
                  </h3>
                  <span className="text-[13.5px] text-[#8A8A8A] font-medium truncate mt-0.5">
                    {store.category}
                  </span>
                </div>
                <span className="shrink-0 w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-[#1C1C1C] hover:bg-black hover:text-white hover:border-black transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17L17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
