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
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/amul.jpeg";

const SUBCATEGORIES: SubcategoryItem[] = [
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
];

export default function SubcategoriesGrid() {
  return (
    <section className="w-full bg-white pb-14 pt-2">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-5 lg:gap-6">
        {/* Section Header */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl sm:text-[30px] font-semibold text-[#0F172A] tracking-tight">
           Shop by Category
          </h2>
        </div>

        {/* Subcategories Grid: Updated to 8 columns on large screens */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-2 sm:gap-x-4 lg:gap-x-6 gap-y-5 lg:gap-y-8 w-full">
          {SUBCATEGORIES.map((item) => (
            <a
              key={item.id}
              href={APP_DOWNLOAD_HREF}
              className="flex flex-col items-center cursor-pointer group"
            >
              {/* Soft Light Blue Card Image Box */}
              <div className="w-[90px] sm:w-[105px] lg:w-[115px] h-[90px] sm:h-[105px] lg:h-[115px] rounded-[20px] bg-[#EEF5FF] flex items-center justify-center p-2 sm:p-3 relative overflow-hidden border border-[#E0EDFF] transition-colors group-hover:border-[#0052FF]/20 group-hover:shadow-[0_4px_20px_-8px_rgba(0,82,255,0.15)]">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Centered Label Text */}
              <span className="text-[14px] sm:text-[16px] font-medium text-[#0F172A] leading-snug tracking-tight line-clamp-2 transition-colors text-center mt-2 lg:mt-3 max-w-[100px] lg:max-w-[120px]">
                {item.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}