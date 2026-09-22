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
    <section className="w-full bg-white py-8">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Shop on stores you love
          </h2>
          <p className="text-xs sm:text-base font-medium text-slate-500">
            Handpicked top-rated local spots near you in Mangalore
          </p>
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
              // Reduced mobile width from 285/320px to 260/280px
              className="w-[260px] sm:w-[280px] lg:w-auto shrink-0 snap-start flex flex-col gap-2.5 group cursor-pointer"
            >
              {/* Scaled down height via aspect-[16/11] (previously 4/3) and tightened border radius */}
              <div className="w-full aspect-[16/11] relative rounded-[16px] overflow-hidden bg-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">
                <Image
                  src={store.image}
                  alt={store.name}
                  fill
                  sizes="(max-width: 1024px) 280px, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>

              {/* Text Info Block - Scaled down all typography */}
              <div className="flex flex-col gap-0.5 px-0.5">
                {/* Title & Rating */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1C1C] tracking-tight truncate leading-tight mt-0.5">
                    {store.name}
                  </h3>
                  <div className="bg-[#24963F] text-white text-[11px] sm:text-[12px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 mt-0.5">
                    {store.rating}
                    <span className="text-[9px] sm:text-[10px] leading-none mb-[1px]">★</span>
                  </div>
                </div>

                {/* Category & Price Estimate */}
                <div className="flex items-center justify-between gap-3 mt-0.5 text-[13px] sm:text-[14px]">
                  <span className="text-[#696969] truncate">
                    {store.category}
                  </span>
                  <span className="text-[#696969] shrink-0">
                    {store.priceEstimate}
                  </span>
                </div>

                {/* Location & Distance */}
                <div className="flex items-center justify-between gap-3 text-[13px] sm:text-[14px]">
                  <span className="text-[#696969] truncate">
                    {store.location}
                  </span>
                  <span className="text-[#1C1C1C] font-medium shrink-0 text-[12px] sm:text-[13px]">
                    {store.distance}
                  </span>
                </div>

                {/* Optional Closing Status */}
                {store.closingInfo && (
                  <div className="mt-0.5 text-[12px] sm:text-[13px] text-[#D9534F]">
                    {store.closingInfo}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}