"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, ChevronDown, Download, Smartphone, ExternalLink, QrCode, Sparkles } from "lucide-react";

const LOGO_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/All_Right-removebg-preview.png";

const SEARCH_PLACEHOLDERS = [
  'Search for "Cooker"',
  'Search for "Milk"',
  'Search for "Atta"',
  'Search for "Chips"',
  'Search for "Ice Cream"',
];

export default function Navbar() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[980px] mx-auto px-6 py-3 flex items-center justify-between gap-5 bg-white">
        {/* Left Brand & Location Section */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="flex items-center gap-2 cursor-pointer select-none group"
            aria-label="Instamart Home"
          >
            <Image
              src={LOGO_IMAGE_URL}
              alt="Flikk Logo"
              width={52}
              height={52}
              priority
              style={{ width: "auto", height: "48px" }}
              className="object-contain group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="flex flex-col leading-[0.95]">
              <span className="text-[20px] font-black text-[#EAB308] tracking-tight">
                Flikk
              </span>
              <span className="text-[20px] font-black text-[#0052FF] tracking-tight">
                Now in Mangalore
              </span>
            </div>
          </a>

          <div className="hidden sm:block w-px h-8 bg-gray-200" />

          {/* <button
            type="button"
            className="hidden sm:flex items-center gap-2 bg-transparent hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer text-left"
          >
            <svg
              className="w-4.5 h-4.5 text-[#0052FF] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="7" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>

            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold text-[#0052FF] leading-tight">
                Add your location
              </span>
              <span className="hidden md:flex items-center gap-0.5 text-xs font-medium text-slate-500 leading-tight">
                To see items in your area
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </span>
            </div>
          </button> */}
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-[440px] relative">
          <div className="flex items-center bg-[#F1F3F6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0052FF]/20 focus-within:border-[#0052FF] border border-transparent rounded-xl px-4 h-[46px] transition-all">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
            <Search className="w-[19px] h-[19px] text-slate-500 shrink-0 cursor-pointer" />
          </div>
        </div>

        {/* Right Section: WOW Download App CTA & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 bg-gradient-to-r from-[#0052FF] to-[#0040E0] hover:from-[#0048E5] hover:to-[#0036C7] active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(0,82,255,0.35)] hover:shadow-[0_6px_20px_rgba(0,82,255,0.45)] transition-all cursor-pointer group"
          >
            <Download className="w-4 h-4 text-white/90 group-hover:translate-y-0.5 transition-transform" />
            <span>Download Now</span>
            <ChevronDown
              className={`w-4 h-4 text-white/80 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Platform Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-80 rounded-2xl bg-white p-3 shadow-2xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="px-3 py-2 mb-1 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Get Instamart Mobile App
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> Free Download
                </span>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                {/* iOS App Store Option */}
                <a
                  href="#download-ios"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      {/* Apple SVG Logo */}
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide leading-none">
                        Download for iOS
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 mt-0.5 group-hover:text-[#0052FF] transition-colors">
                        App Store
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#0052FF] transition-colors">
                    <span className="text-xs font-semibold">4.9 ★</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </a>

                {/* Android Google Play Option */}
                <a
                  href="#download-android"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      {/* Google Play SVG Logo */}
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
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
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide leading-none">
                        Download for Android
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 mt-0.5 group-hover:text-[#0052FF] transition-colors">
                        Google Play
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#0052FF] transition-colors">
                    <span className="text-xs font-semibold">4.8 ★</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </a>
              </div>

              {/* QR Code Banner Footer */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-2 text-slate-500">
                <span className="text-[11px] font-medium flex items-center gap-1.5 text-slate-500">
                  <QrCode className="w-3.5 h-3.5 text-[#0052FF]" /> Scan QR on mobile to install
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  v2.4
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
