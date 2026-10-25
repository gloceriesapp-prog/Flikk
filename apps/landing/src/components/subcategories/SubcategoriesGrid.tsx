"use client";

import React from "react";
import Image from "next/image";
import { APP_DOWNLOAD_HREF } from "@/lib/links";

interface SubcategoryItem {
  id: string;
  name: string;
  image: string;
}

const DEFAULT_SUBCATEGORY_IMAGE =
  "https://cdnfpaolzkpqetmmpyzh.supabase.co/storage/v1/object/public/website-images/amul.jpeg";

// 18 items: divides evenly into 3 / 6 / 9 columns, so every row is full at every breakpoint.
const SUBCATEGORIES: SubcategoryItem[] = [
  {
    id: "sub-0",
    name: "Fruits & Vegetables",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-1",
    name: "Fresh Milk & Dairy",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-2",
    name: "Bread, Eggs & Butter",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-3",
    name: "Cold Drinks & Juices",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-4",
    name: "Chips & Munchies",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-5",
    name: "Ice Creams & Sweets",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-6",
    name: "Tea, Coffee & Drinks",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-7",
    name: "Biscuits & Cookies",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-8",
    name: "Atta, Rice & Dals",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-9",
    name: "Cooking Oils & Ghee",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-10",
    name: "Instant Noodles & Pasta",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-11",
    name: "Chocolates & Candies",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-12",
    name: "Dry Fruits & Seeds",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-13",
    name: "Sauces & Spreads",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-14",
    name: "Paan Corner",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-15",
    name: "Meat & Seafood",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-16",
    name: "Personal Care",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
  {
    id: "sub-17",
    name: "Cleaning Essentials",
    image: DEFAULT_SUBCATEGORY_IMAGE,
  },
];

export default function SubcategoriesGrid() {
  return (
    <section className="relative w-full overflow-hidden bg-white pb-14 pt-10" aria-labelledby="categories-heading">
      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col gap-10">
        {/* Section Header: centered title, "View all" pinned right on sm+ */}
        <div className="relative text-center">
          <svg viewBox="0 0 64 64" className="pointer-events-none absolute left-[8%] top-8 hidden h-16 w-16 -rotate-12 text-[#2E9E77] opacity-80 blur-[3px] lg:block" aria-hidden="true">
            <path d="M52 8C26 8 10 22 10 42c0 6 2 11 5 14 3-14 13-26 27-33-11 9-19 20-22 34 4 2 8 3 12 3 20 0 28-22 20-52z" fill="currentColor" />
          </svg>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#155dfc]">Shop by category</p>
          <h2 id="categories-heading" className="mx-auto mt-3 max-w-[560px] text-[32px] font-semibold leading-[1.1] tracking-tight text-[#0F172A] sm:text-[44px]">
            Latest collection of everyday essentials.
          </h2>
          <a href={APP_DOWNLOAD_HREF} className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#0F172A] transition-colors hover:text-[#155DFC] sm:absolute sm:bottom-1 sm:right-0 sm:mt-0">
            View all
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
        </div>

        {/* 3 / 6 / 9 columns; tiles stretch to fill their column. */}
        <div className="grid w-full grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-6 sm:gap-x-4 lg:grid-cols-9 lg:gap-x-5 lg:gap-y-8">
          {SUBCATEGORIES.map((item) => (
            <a
              key={item.id}
              href={APP_DOWNLOAD_HREF}
              className="group flex flex-col items-center rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155DFC]"
            >
              {/* Original soft tile; hover = border/shadow tint + light sweep, no size change */}
              <div className="relative isolate flex aspect-square w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#E0EDFF] bg-[#EEF5FF] p-3 transition-[border-color,box-shadow] duration-300 group-hover:border-[#0052FF]/20 group-hover:shadow-[0_4px_20px_-8px_rgba(0,82,255,0.15)]">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={96}
                  height={96}
                  className="relative z-10 h-full w-full rounded-2xl object-contain"
                />
                <span className="pointer-events-none absolute inset-y-0 -left-full z-20 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent transition-[left] duration-700 ease-out group-hover:left-[150%]" aria-hidden="true" />
              </div>

              <span className="mt-2.5 text-center text-[14px] font-medium leading-snug tracking-tight text-[#0F172A] line-clamp-2 sm:text-[15px]">
                {item.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}