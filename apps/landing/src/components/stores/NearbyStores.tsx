"use client";

import React from "react";
import Image from "next/image";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  location: string;
  image: string;
  rating: string;
  priceEstimate: string;
  distance: string;
  closingInfo?: string;
}

const NEARBY_STORES: StoreItem[] = [
  {
    id: "store-1",
    name: "The Ocean Pearl - Times Squa...",
    category: "Kerala, North Indian, Birya...",
    location: "Maruthi Veethika, Udupi",
    image: "/images/indian_store_1.jpg", 
    rating: "4.6",
    priceEstimate: "₹2,000 for two",
    distance: "4.1 km",
    closingInfo: "Closes in 1 hour 49 minutes",
  },
  {
    id: "store-2",
    name: "Bacchus Inn",
    category: "North Indian, Chinese, Ma...",
    location: "Vidyaratna Nagar, Manipal",
    image: "/images/indian_store_2.jpg",
    rating: "4.2",
    priceEstimate: "₹1,000 for two",
    distance: "1.1 km",
  },
  {
    id: "store-3",
    name: "Janatha Bazaar Supermarket",
    category: "Groceries, Staples & Daily Needs",
    location: "Kodialbail, Mangalore",
    image: "/images/indian_store_3.jpg",
    rating: "4.5",
    priceEstimate: "₹500 for two",
    distance: "2.4 km",
  },
  {
    id: "store-4",
    name: "Ideal Ice Cream Parlour",
    category: "Ice Creams, Sundaes & Desserts",
    location: "Hampankatta, Mangalore",
    image: "/images/indian_store_4.jpg",
    rating: "4.8",
    priceEstimate: "₹300 for two",
    distance: "3.2 km",
  },
];

export default function NearbyStores() {
  return (
    <section className="w-full bg-white pt-8 pb-14 sm:pb-16">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl sm:text-[30px] font-semibold text-[#0F172A] tracking-tight">
            Shop on stores you love
          </h2>
        </div>

        {/* 
          Logic: Mobile uses horizontal snap scrolling. 
          Desktop (lg breakpoint) switches to a fixed 4-column grid.
          Increased gap (lg:gap-8) forces the 4 columns to be slightly narrower.
        */}
        <div 
          className="flex lg:grid lg:grid-cols-4 items-stretch gap-5 lg:gap-8 overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory pb-4 lg:pb-0 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {NEARBY_STORES.map((store) => (
            <div
              key={store.id}
              className="w-[260px] sm:w-[280px] lg:w-auto shrink-0 snap-start flex flex-col rounded-2xl border border-slate-200/70 bg-white overflow-hidden group cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Image with rating + distance overlays */}
              <div className="w-full aspect-[16/10] relative bg-slate-100 overflow-hidden">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 1024px) 280px, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 bg-[#24963F] text-white text-[12px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                  {store.rating}
                  <span className="text-[10px] leading-none mb-[1px]">★</span>
                </div>
                <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur text-[#1C1C1C] text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                  {store.distance}
                </div>
              </div>

              {/* Info block — footer pinned to bottom for equal-height cards */}
              <div className="flex flex-col flex-1 p-3.5">
                <h3 className="text-[16px] font-semibold text-[#1C1C1C] tracking-tight truncate leading-tight">
                  {store.name}
                </h3>
                <p className="text-[13px] text-[#696969] truncate mt-0.5">
                  {store.category}
                </p>

                <div className="mt-auto pt-2.5 flex flex-col gap-1 border-t border-dashed border-slate-200">
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-[#696969] truncate">{store.location}</span>
                    <span className="text-[#1C1C1C] font-semibold shrink-0">
                      {store.priceEstimate}
                    </span>
                  </div>
                  {store.closingInfo && (
                    <p className="text-[12px] font-medium text-[#D9534F] truncate">
                      {store.closingInfo}
                    </p>
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