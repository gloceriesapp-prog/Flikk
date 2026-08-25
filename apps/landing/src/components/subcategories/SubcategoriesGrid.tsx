"use client";

import React from "react";
import Image from "next/image";

interface SubcategoryItem {
  id: string;
  name: string;
  image: string;
  accentBg?: string;
}

const SUBCATEGORIES: SubcategoryItem[] = [
  {
    id: "sub-1",
    name: "Cold Drinks and Juices",
    image: "/images/sub_drinks.png",
  },
  {
    id: "sub-2",
    name: "Ice Creams and Frozen Desserts",
    image: "/images/sub_icecream.png",
  },
  {
    id: "sub-3",
    name: "Chips and Namkeens",
    image: "/images/sub_chips.png",
  },
  {
    id: "sub-4",
    name: "Chocolates",
    image: "/images/sub_chocolates.png",
  },
  {
    id: "sub-5",
    name: "Biscuits and Cakes",
    image: "/images/sub_biscuits.png",
  },
  {
    id: "sub-6",
    name: "Tea, Coffee and Milk drinks",
    image: "/images/sub_teacoffee.png",
  },
  {
    id: "sub-7",
    name: "Sauces and Spreads",
    image: "/images/sub_sauces.png",
  },
  {
    id: "sub-8",
    name: "Sweet Corner",
    image: "/images/sub_sweets.png",
  },
  {
    id: "sub-9",
    name: "Noodles, Pasta, Vermicelli",
    image: "/images/sub_noodles.png",
  },
  {
    id: "sub-10",
    name: "Frozen Food",
    image: "/images/sub_frozen.png",
  },
  {
    id: "sub-11",
    name: "Dry Fruits and Seeds Mix",
    image: "/images/sub_dryfruits.png",
  },
  {
    id: "sub-12",
    name: "Paan Corner",
    image: "/images/sub_paan.png",
  },
];

export default function SubcategoriesGrid() {
  return (
    <section className="w-full bg-white pb-14 pt-2">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Snacks & Drinks
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Quick munchies, beverages, frozen treats & everyday essentials
          </p>
        </div>

        {/* Subcategories Grid: 8 columns desktop, 4 mobile */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-x-3.5 gap-y-6 w-full">
          {SUBCATEGORIES.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center group cursor-pointer"
            >
              {/* Soft Light Blue Card Image Box */}
              <div className="w-[100px] sm:w-[108px] h-[100px] sm:h-[108px] rounded-[22px] bg-[#EEF5FF] hover:bg-[#E3EFFE] flex items-center justify-center p-3.5 relative overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-1 border border-[#E0EDFF]">
                {/* Render SVG / Product Icon Graphic */}
                <SubcategoryIcon id={item.id} />
              </div>

              {/* Centered Label Text */}
              <span className="text-[12px] sm:text-[13px] font-bold text-[#0F172A] leading-snug text-center mt-2.5 max-w-[105px] group-hover:text-[#0052FF] transition-colors line-clamp-2">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

{/* Helper component for crisp vector subcategory product graphics */}
function SubcategoryIcon({ id }: { id: string }) {
  switch (id) {
    case "sub-1": // Cold Drinks and Juices
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Cola Can */}
          <rect x="14" y="20" width="22" height="44" rx="4" fill="#E53E3E" />
          <rect x="18" y="16" width="14" height="4" rx="1" fill="#CBD5E0" />
          <path d="M19 32 Q25 28 31 32" stroke="#FFF" strokeWidth="2.5" fill="none" />
          <circle cx="25" cy="45" r="5" fill="#FFF" opacity="0.3" />
          {/* Juice Pack */}
          <rect x="42" y="16" width="24" height="48" rx="3" fill="#DD6B20" />
          <polygon points="42,16 66,16 62,12 46,12" fill="#C05621" />
          <circle cx="54" cy="38" r="7" fill="#F6AD55" />
          <path d="M50 48 H58" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "sub-2": // Ice Creams and Frozen Desserts
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Tub */}
          <ellipse cx="40" cy="24" rx="22" ry="7" fill="#D53F8C" />
          <path d="M18 24 L24 60 H56 L62 24 Z" fill="#B83280" />
          <ellipse cx="40" cy="24" rx="20" ry="5" fill="#ED64A6" />
          {/* Cone */}
          <polygon points="26,52 38,74 34,52" fill="#D69E2E" />
          <circle cx="30" cy="46" r="8" fill="#4A5568" />
        </svg>
      );
    case "sub-3": // Chips and Namkeens
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Lays Bag */}
          <polygon points="12,18 38,14 34,62 16,62" fill="#3182CE" />
          <ellipse cx="25" cy="38" rx="7" ry="9" fill="#F6AD55" />
          {/* Bhujia Bag */}
          <polygon points="40,16 68,18 64,64 42,62" fill="#DD6B20" />
          <circle cx="53" cy="38" r="8" fill="#FAF089" />
        </svg>
      );
    case "sub-4": // Chocolates
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Chocolate Bar */}
          <rect x="14" y="24" width="22" height="42" rx="3" fill="#6B46C1" />
          <rect x="18" y="20" width="14" height="8" rx="1" fill="#D69E2E" />
          {/* Ferrero Box */}
          <rect x="40" y="20" width="28" height="44" rx="4" fill="#D69E2E" />
          <circle cx="48" cy="32" r="4" fill="#744210" />
          <circle cx="60" cy="32" r="4" fill="#744210" />
          <circle cx="48" cy="48" r="4" fill="#744210" />
          <circle cx="60" cy="48" r="4" fill="#744210" />
        </svg>
      );
    case "sub-5": // Biscuits and Cakes
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Biscuit Box */}
          <rect x="14" y="16" width="30" height="48" rx="3" fill="#D69E2E" />
          <rect x="18" y="22" width="22" height="14" rx="2" fill="#744210" />
          {/* Choco Pie */}
          <circle cx="56" cy="44" r="16" fill="#1A202C" />
          <circle cx="56" cy="44" r="10" fill="#E2E8F0" />
        </svg>
      );
    case "sub-6": // Tea, Coffee and Milk drinks
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Coffee Jar */}
          <rect x="16" y="22" width="20" height="40" rx="4" fill="#C53030" />
          <rect x="20" y="16" width="12" height="6" rx="1" fill="#744210" />
          <circle cx="26" cy="42" r="5" fill="#FAF089" />
          {/* Tea Pack */}
          <rect x="42" y="18" width="24" height="44" rx="3" fill="#D69E2E" />
          <path d="M46 34 L62 34 L54 48 Z" fill="#2F855A" />
        </svg>
      );
    case "sub-7": // Sauces and Spreads
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Nutella Jar */}
          <rect x="16" y="26" width="24" height="34" rx="4" fill="#FFFFFF" stroke="#CBD5E0" strokeWidth="2" />
          <rect x="18" y="20" width="20" height="6" rx="1" fill="#1A202C" />
          <rect x="20" y="34" width="16" height="16" fill="#744210" />
          {/* Ketchup Pouch */}
          <polygon points="48,16 66,16 68,60 46,60" fill="#E53E3E" />
          <circle cx="57" cy="38" r="6" fill="#FAF089" />
        </svg>
      );
    case "sub-8": // Sweet Corner
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Kaju Katli Box */}
          <polygon points="14,24 66,24 60,62 20,62" fill="#DD6B20" />
          <polygon points="30,34 40,28 50,34 40,40" fill="#EDF2F7" />
          <polygon points="30,50 40,44 50,50 40,56" fill="#EDF2F7" />
        </svg>
      );
    case "sub-9": // Noodles, Pasta, Vermicelli
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Maggi Pack */}
          <rect x="14" y="24" width="26" height="38" rx="3" fill="#D69E2E" />
          <rect x="18" y="32" width="18" height="12" fill="#C53030" />
          {/* Pasta Pack */}
          <rect x="44" y="16" width="24" height="46" rx="3" fill="#EDF2F7" stroke="#CBD5E0" strokeWidth="2" />
          <path d="M48 30 Q56 26 64 30" stroke="#DD6B20" strokeWidth="3" fill="none" />
          <path d="M48 40 Q56 36 64 40" stroke="#DD6B20" strokeWidth="3" fill="none" />
        </svg>
      );
    case "sub-10": // Frozen Food
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* McCain Bag */}
          <rect x="16" y="18" width="24" height="44" rx="3" fill="#DD6B20" />
          <circle cx="28" cy="38" r="6" fill="#FAF089" />
          {/* Frozen Snacks */}
          <rect x="44" y="24" width="22" height="38" rx="3" fill="#C53030" />
          <path d="M48 36 L62 36 L55 48 Z" fill="#D69E2E" />
        </svg>
      );
    case "sub-11": // Dry Fruits and Seeds Mix
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Almond Jar */}
          <rect x="16" y="20" width="22" height="42" rx="4" fill="#FFFFFF" stroke="#CBD5E0" strokeWidth="2" />
          <rect x="18" y="14" width="18" height="6" fill="#2F855A" />
          <circle cx="27" cy="38" r="6" fill="#744210" />
          {/* Seeds Pouch */}
          <rect x="42" y="18" width="24" height="44" rx="3" fill="#2F855A" />
          <circle cx="54" cy="40" r="7" fill="#F6AD55" />
        </svg>
      );
    case "sub-12": // Paan Corner
      return (
        <svg viewBox="0 0 80 80" className="w-full h-full object-contain">
          {/* Nicotex Box */}
          <rect x="36" y="20" width="30" height="44" rx="3" fill="#3182CE" />
          <circle cx="51" cy="36" r="6" fill="#38A169" />
          {/* Lighter */}
          <rect x="16" y="28" width="14" height="36" rx="2" fill="#E53E3E" />
          <rect x="18" y="20" width="10" height="8" rx="1" fill="#CBD5E0" />
        </svg>
      );
    default:
      return null;
  }
}
