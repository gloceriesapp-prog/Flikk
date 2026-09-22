"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, FlashIcon, Search01Icon } from "@hugeicons/core-free-icons";

export default function AppDownloadBanner() {
  return (
    <section id="app-download-banner" className="w-full bg-white pb-0 overflow-hidden">
      {/* Increased max-width to 1280px to align with hero, promo, and category sections */}
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Banner Card Container - Added extra padding (lg:px-20) for the expanded width */}
        <div className="w-full bg-[#F2F4F8] rounded-t-3xl pt-8 sm:pt-10 px-8 sm:px-12 md:px-16 lg:px-20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          
          {/* Left Text & Download Buttons Content */}
          {/* Increased max-width (lg:max-w-[640px]) to balance the wider container */}
          <div className="flex flex-col gap-6 max-w-[520px] lg:max-w-[640px] z-10 py-2">
            {/* Headline */}
            <div className="flex flex-col gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0052FF] bg-blue-50 w-fit px-3 py-1 rounded-full uppercase tracking-wider">
                <HugeiconsIcon icon={SparklesIcon} className="w-3 h-3" /> Get Fast Local Delivery
              </span>
              {/* Scaled up the headline text for larger screens */}
              <h2 className="text-2xl sm:text-3xl md:text-[36px] lg:text-[44px] font-extrabold text-[#0F172A] leading-[1.15] tracking-tight">
                For better experience, download the Flikk app now
              </h2>
            </div>

            {/* Store Download Buttons Row */}
            <div className="flex items-center gap-3.5 pt-1">
              {/* Google Play Button */}
              <a
                href="#download-android"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer shadow-sm hover:shadow-md"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 group-hover:scale-105 transition-transform"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#4285F4"
                    d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z"
                  />
                  <path
                    fill="#34A853"
                    d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z"
                  />
                  <path
                    fill="#FBBC04"
                    d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z"
                  />
                  <path
                    fill="#EA4335"
                    d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z"
                  />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] sm:text-[10px] font-medium tracking-wider uppercase text-white/70">
                    GET IT ON
                  </span>
                  <span className="text-sm sm:text-base font-bold tracking-tight -mt-0.5">
                    Google Play
                  </span>
                </div>
              </a>

              {/* App Store Button */}
              <a
                href="#download-ios"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer shadow-sm hover:shadow-md"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 sm:w-7 sm:h-7 fill-current shrink-0 group-hover:scale-105 transition-transform"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] sm:text-[10px] font-medium tracking-tight text-white/70">
                    Download on the
                  </span>
                  <span className="text-sm sm:text-base font-bold tracking-tight -mt-0.5">
                    App Store
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* Right Smartphone Screen Mockup Visual */}
          <div className="relative z-10 flex items-end justify-center md:justify-end mb-0 pt-4 md:pt-0 self-end">
            {/* Phone Outer Chassis Frame */}
            <div className="w-[230px] sm:w-[260px] md:w-[280px] lg:w-[320px] h-[310px] sm:h-[350px] md:h-[380px] lg:h-[420px] bg-slate-900 rounded-t-[36px] p-2.5 pb-0 border-4 border-b-0 border-slate-800 relative overflow-hidden">
              {/* Top Speaker Notch */}
              <div className="w-16 h-3.5 bg-slate-900 rounded-b-xl mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
                <div className="w-6 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Inside Phone Screen UI Preview */}
              <div className="w-full h-full bg-white rounded-t-[28px] overflow-hidden p-3 lg:p-4 flex flex-col gap-3 lg:gap-4 pt-6 lg:pt-8 relative border border-slate-100 border-b-0">
                {/* Header bar inside phone */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 bg-amber-500 text-white text-[10px] lg:text-[11px] font-black px-2 py-0.5 rounded-full">
                    <HugeiconsIcon icon={FlashIcon} className="w-2.5 h-2.5 fill-current" />
                    <span>FAST</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] lg:text-[10px] font-bold text-slate-400">Location</span>
                    <span className="text-[10px] lg:text-[11px] font-bold text-slate-800">Kodialbail, Mangalore</span>
                  </div>
                </div>

                {/* Search Bar inside phone */}
                <div className="w-full bg-slate-100 rounded-xl px-3 py-2 flex items-center justify-between text-slate-400 text-[11px] lg:text-[12px]">
                  <span>Search "ice cream"</span>
                  <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Quick Picks Label inside phone */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[12px] lg:text-[13px] font-bold text-slate-900">Your quick picks</span>
                  <span className="text-[10px] lg:text-[11px] font-bold text-[#0052FF]">See All</span>
                </div>

                {/* Mini Product Cards Row inside phone */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2 lg:p-3 flex flex-col items-center text-center gap-1 border border-slate-100">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 relative bg-amber-100 rounded-lg flex items-center justify-center text-[12px] lg:text-[14px]">
                      🍌
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold text-slate-800 leading-tight">Banana</span>
                    <span className="text-[9px] lg:text-[10px] font-extrabold text-slate-900">₹40</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2 lg:p-3 flex flex-col items-center text-center gap-1 border border-slate-100">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 relative bg-blue-100 rounded-lg flex items-center justify-center text-[12px] lg:text-[14px]">
                      🥛
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold text-slate-800 leading-tight">Fresh Milk</span>
                    <span className="text-[9px] lg:text-[10px] font-extrabold text-slate-900">₹32</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2 lg:p-3 flex flex-col items-center text-center gap-1 border border-slate-100">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 relative bg-purple-100 rounded-lg flex items-center justify-center text-[12px] lg:text-[14px]">
                      🍨
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold text-slate-800 leading-tight">Ice Cream</span>
                    <span className="text-[9px] lg:text-[10px] font-extrabold text-slate-900">₹160</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}