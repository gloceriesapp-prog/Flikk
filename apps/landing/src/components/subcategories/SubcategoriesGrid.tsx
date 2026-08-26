"use client";

import React from "react";
import Image from "next/image";

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
];

export default function SubcategoriesGrid() {
  return (
    <section className="w-full bg-white pb-14 pt-2">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Everyday Essentials & Snacks
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Browse top-searched local items and daily kitchen staples across Flikk
          </p>
        </div>

        {/* Subcategories Grid: Tight 7 columns desktop (2 balanced rows of 7) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-x-2 sm:gap-x-3.5 gap-y-5.5 w-full">
          {SUBCATEGORIES.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center cursor-pointer"
            >
              {/* Soft Light Blue Card Image Box (No Hover Lift) */}
              <div className="w-[96px] sm:w-[106px] h-[96px] sm:h-[106px] rounded-[22px] bg-[#EEF5FF] flex items-center justify-center p-2.5 relative overflow-hidden border border-[#E0EDFF] transition-colors">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain p-1"
                />
              </div>

              {/* Centered Label Text */}
              <span className="text-xs sm:text-[13px] font-extrabold text-[#0F172A] leading-tight text-center mt-2.5 max-w-[102px] line-clamp-2">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
