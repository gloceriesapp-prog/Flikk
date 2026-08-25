"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function PromoBanners() {
  return (
    <section className="w-full bg-white pb-12 pt-2">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col items-center gap-4">
        {/* 3-Column Promo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          {/* Card 1: Paan Corner */}
          <div className="h-[270px] sm:h-[290px] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#EAE3D9] via-[#E2D8C9] to-[#D5C9B8] border border-slate-200/60 group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            {/* Top Text Content */}
            <div className="flex flex-col gap-1.5 relative z-10 max-w-[200px]">
              <span className="text-2xl sm:text-[26px] font-bold text-slate-900 leading-tight tracking-tight">
                Paan Corner
              </span>
              <span className="text-xs font-normal text-slate-700 leading-snug">
                Get smoking accessories, mints & more delivered instantly
              </span>
            </div>

            {/* Product Image Right Bottom */}
            <div className="absolute right-0 bottom-0 w-[210px] h-[190px] overflow-hidden pointer-events-none z-0">
              <Image
                src="/images/paan_corner_banner.jpg"
                alt="Paan Corner Mints & Accessories"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-bottom rounded-tl-2xl group-hover:scale-105 transition-transform duration-300 opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#E2D8C9]/20 to-[#EAE3D9]" />
            </div>

            {/* CTA Button Bottom Left */}
            <div className="relative z-10 pt-2">
              <button
                type="button"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-wider shadow-md flex items-center gap-2 group-hover:px-6 transition-all duration-200 cursor-pointer"
              >
                <span>SHOP NOW</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Girls, Be Prepared Anytime */}
          <div className="h-[270px] sm:h-[290px] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#EE7777] via-[#E26A96] to-[#9C8ADE] border border-pink-200/30 group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            {/* Top Text Content */}
            <div className="flex flex-col gap-1.5 relative z-10 max-w-[210px]">
              <span className="text-2xl sm:text-[26px] font-bold text-white leading-tight tracking-tight drop-shadow-sm">
                Girls, Be Prepared Anytime
              </span>
              <span className="text-xs font-normal text-white/90 leading-snug">
                Range of feminine hygiene & hair removal products
              </span>
            </div>

            {/* Product Image Right Bottom */}
            <div className="absolute right-0 bottom-0 w-[210px] h-[190px] overflow-hidden pointer-events-none z-0">
              <Image
                src="/images/hygiene_care_banner.jpg"
                alt="Feminine Hygiene & Wellness Products"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-bottom rounded-tl-2xl group-hover:scale-105 transition-transform duration-300 opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#E26A96]/20 to-[#EE7777]" />
            </div>

            {/* CTA Button Bottom Left */}
            <div className="relative z-10 pt-2">
              <button
                type="button"
                className="bg-white hover:bg-slate-50 text-slate-900 px-5 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-wider shadow-md flex items-center gap-2 group-hover:px-6 transition-all duration-200 cursor-pointer"
              >
                <span>SHOP NOW</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-700 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Rakhi Gifting Finds */}
          <div className="h-[270px] sm:h-[290px] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#F6E9D7] via-[#EEDCC7] to-[#E3CEB4] border border-amber-200/60 group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
            {/* Top Right Powered By Tag */}
            <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-xs border border-amber-100/80 flex flex-col items-end">
              <span className="text-[9px] font-medium text-slate-400 leading-none">
                Powered by
              </span>
              <span className="text-[11px] font-bold text-slate-800 tracking-tight leading-none mt-0.5">
                nestasia
              </span>
            </div>

            {/* Top Text Content */}
            <div className="flex flex-col gap-1.5 relative z-10 max-w-[200px]">
              <span className="text-2xl sm:text-[26px] font-bold text-slate-900 leading-tight tracking-tight">
                Rakhi Gifting Finds
              </span>
              <span className="text-xs font-normal text-slate-700 leading-snug">
                For special sibling bonds
              </span>
            </div>

            {/* Product Image Right Bottom */}
            <div className="absolute right-0 bottom-0 w-[210px] h-[190px] overflow-hidden pointer-events-none z-0">
              <Image
                src="/images/rakhi_gifting_banner.jpg"
                alt="Rakhi Festive Gift Hampers"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-bottom rounded-tl-2xl group-hover:scale-105 transition-transform duration-300 opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#EEDCC7]/20 to-[#F6E9D7]" />
            </div>

            {/* CTA Button Bottom Left */}
            <div className="relative z-10 pt-2">
              <button
                type="button"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-wider shadow-md flex items-center gap-2 group-hover:px-6 transition-all duration-200 cursor-pointer"
              >
                <span>SHOP NOW</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Slider Indicator Line */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <div className="w-8 h-1.5 rounded-full bg-slate-800 transition-all" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        </div>
      </div>
    </section>
  );
}
