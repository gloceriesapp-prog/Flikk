"use client";

import React from "react";
import { Sparkles, Zap, Search } from "lucide-react";

export default function AppDownloadBanner() {
  return (
    <section className="w-full bg-white pb-0 overflow-hidden">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Banner Card Container - Constrained to max-w-[980px], rounded top, flush at bottom with Footer */}
        <div className="w-full bg-[#F2F4F8] rounded-t-3xl pt-8 sm:pt-10 px-8 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* Left Text & Download Buttons Content */}
          <div className="flex flex-col gap-6 max-w-[460px] z-10 py-2">
            {/* Headline */}
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0052FF] bg-blue-50 w-fit px-3 py-1 rounded-full uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Get 10-Minute Delivery
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-[34px] font-extrabold text-[#0F172A] leading-[1.18] tracking-tight">
                For better experience, download the Flikk app now
              </h2>
            </div>

            {/* Store Download Buttons Row */}
            <div className="flex items-center gap-3.5 pt-1">
              {/* Google Play Button */}
              <a
                href="#download-android"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform"
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
                  <span className="text-[9px] font-medium tracking-wider uppercase text-white/70">
                    GET IT ON
                  </span>
                  <span className="text-sm font-bold tracking-tight -mt-0.5">
                    Google Play
                  </span>
                </div>
              </a>

              {/* App Store Button */}
              <a
                href="#download-ios"
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 fill-current shrink-0 group-hover:scale-105 transition-transform"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] font-medium tracking-tight text-white/70">
                    Download on the
                  </span>
                  <span className="text-sm font-bold tracking-tight -mt-0.5">
                    App Store
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* Right Smartphone Screen Mockup Visual (Standing Flush at Bottom) */}
          <div className="relative z-10 flex items-end justify-center md:justify-end mb-0 pt-4 md:pt-0 self-end">
            {/* Phone Outer Chassis Frame */}
            <div className="w-[230px] sm:w-[250px] h-[310px] sm:h-[340px] bg-slate-900 rounded-t-[36px] p-2.5 pb-0 border-4 border-b-0 border-slate-800 relative overflow-hidden">
              {/* Top Speaker Notch */}
              <div className="w-16 h-3.5 bg-slate-900 rounded-b-xl mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
                <div className="w-6 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Inside Phone Screen UI Preview */}
              <div className="w-full h-full bg-white rounded-t-[28px] overflow-hidden p-3 flex flex-col gap-2.5 pt-6 relative border border-slate-100 border-b-0">
                {/* Header bar inside phone */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    <span>8 MINS</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-bold text-slate-400">Location</span>
                    <span className="text-[10px] font-bold text-slate-800">Kodialbail, Mangalore</span>
                  </div>
                </div>

                {/* Search Bar inside phone */}
                <div className="w-full bg-slate-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Search "ice cream"</span>
                  <Search className="w-3 h-3 text-slate-400" />
                </div>

                {/* Quick Picks Label inside phone */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-slate-900">Your quick picks</span>
                  <span className="text-[9px] font-bold text-[#0052FF]">See All</span>
                </div>

                {/* Mini Product Cards Row inside phone */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 flex flex-col items-center text-center gap-1 border border-slate-100">
                    <div className="w-8 h-8 relative bg-amber-100 rounded-lg flex items-center justify-center text-[10px]">
                      🍌
                    </div>
                    <span className="text-[9px] font-bold text-slate-800 leading-tight">Banana</span>
                    <span className="text-[8px] font-extrabold text-slate-900">₹40</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-1.5 flex flex-col items-center text-center gap-1 border border-slate-100">
                    <div className="w-8 h-8 relative bg-blue-100 rounded-lg flex items-center justify-center text-[10px]">
                      🥛
                    </div>
                    <span className="text-[9px] font-bold text-slate-800 leading-tight">Fresh Milk</span>
                    <span className="text-[8px] font-extrabold text-slate-900">₹32</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-1.5 flex flex-col items-center text-center gap-1 border border-slate-100">
                    <div className="w-8 h-8 relative bg-purple-100 rounded-lg flex items-center justify-center text-[10px]">
                      🍨
                    </div>
                    <span className="text-[9px] font-bold text-slate-800 leading-tight">Ice Cream</span>
                    <span className="text-[8px] font-extrabold text-slate-900">₹160</span>
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
