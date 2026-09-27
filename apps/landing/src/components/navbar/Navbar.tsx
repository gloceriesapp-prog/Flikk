"use client";

import React, { useState, useEffect, useRef } from "react";
import AnnouncementBanner from "./AnnouncementBanner";
import LocationModal from "../location/LocationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  ArrowDown01Icon,
  ShoppingBag01Icon,
  QrCodeIcon,
  FireIcon,
  FlashIcon,
  Cancel01Icon,
  TrendingUpIcon,
  AutoConversationsIcon,
} from "@hugeicons/core-free-icons";

import { checkServiceability } from "@/lib/serviceability";

// Availability is answered by the backend (GET /stores/serviceability), the
// same source the customer app's own gate uses — not a hardcoded keyword list.
// A location is "Available" iff a real store covers its coords within that
// store's delivery radius. Coords come from LocationModal (GPS detect, or
// Nominatim-geocoded typed location).

const SEARCH_PLACEHOLDERS = [
  'Search for "Ice Cream"',
  'Search for "Fresh Milk"',
  'Search for "Atta & Dal"',
  'Search for "Chips & Snacks"',
  'Search for "Cold Drinks"',
];

const POPULAR_SEARCHES = [
  { term: "Ice Cream Tubs", category: "Desserts" },
  { term: "Organic Milk", category: "Dairy" },
  { term: "Fresh Bananas", category: "Fruits" },
  { term: "Dark Chocolate", category: "Snacks" },
  { term: "Farm Fresh Eggs", category: "Breakfast" },
  { term: "Cold Drinks", category: "Beverages" },
];

export default function Navbar() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState<string | null>(null);

  // User Location State & First-Load Prompt Modal State
  const [userLocation, setUserLocation] = useState<string>("Kodialbail, Mangalore");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  // null = not yet resolved (hide badge); true/false = real backend answer.
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // First-load location detection & instant restoration on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLoc = localStorage.getItem("flikk_user_location");
      if (savedLoc && savedLoc.trim() !== "") {
        // Hydrating client-only persisted state from localStorage (unavailable
        // during SSR) — a legitimate external-system sync, not a render cascade.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserLocation(savedLoc);
        setIsLocationModalOpen(false);
        setIsFirstVisit(false);
        // Re-check serviceability from persisted coords so the badge is right
        // on refresh, not just right after picking a location.
        const savedCoords = localStorage.getItem("flikk_user_coords");
        if (savedCoords) {
          try {
            const { lat, lng } = JSON.parse(savedCoords);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              checkServiceability(lat, lng).then((r) => {
                if (r) setIsServiceable(r.serviceable);
              });
            }
          } catch {
            /* corrupt coords — leave badge unresolved */
          }
        }
      } else {
        setIsFirstVisit(true);
        const timeout = setTimeout(() => {
          setIsLocationModalOpen(true);
        }, 300);
        return () => clearTimeout(timeout);
      }
    }
  }, []);

  const handleSelectLocation = (
    newLoc: string,
    coords?: { lat: number; lng: number },
  ) => {
    setUserLocation(newLoc);
    setIsFirstVisit(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("flikk_user_location", newLoc);
    }
    if (coords) {
      if (typeof window !== "undefined") {
        localStorage.setItem("flikk_user_coords", JSON.stringify(coords));
      }
      setIsServiceable(null);
      checkServiceability(coords.lat, coords.lng).then((r) => {
        if (r) setIsServiceable(r.serviceable);
      });
    } else {
      // No coords (geocode failed / fallback) — can't verify, so don't assert.
      if (typeof window !== "undefined") {
        localStorage.removeItem("flikk_user_coords");
      }
      setIsServiceable(null);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-50">
      {/* Top Announcement Banner */}
      <AnnouncementBanner />

      {/* Increased max-width to 1280px to align with the rest of the page layout */}
      <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-4 sm:gap-6 bg-white">
        {/* Left Brand Logo & Location Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            className="flex items-center gap-2 cursor-pointer select-none group"
            aria-label="Gloceries Home"
          >
            <div className="flex flex-col leading-[0.95]">
              <span className="text-[30px] sm:text-[34px] font-semibold text-[#000000] tracking-tight">
                gloceries <span className="text-[#155dfc] h-2 w-2 rounded-full inline-block bg-[#155dfc]"></span>
              </span>
            </div>
          </a>

          <div className="hidden md:block w-px h-7 bg-slate-200" />

          {/* Location Badge Pill */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            aria-label="Change delivery location"
            className="flex items-center gap-1.5 px-3 cursor-pointer transition-colors text-left group"
          >
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-2">
                <span className="text-[20px] font-medium text-black tracking-tight">
                  Your location
                </span>
                {isServiceable === true && (
                  <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    Available
                  </span>
                )}
                {isServiceable === false && (
                  <span className="text-[11px] font-medium uppercase  tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </span>
              <span className="text-sm font-medium text-slate-800 flex items-center gap-1 group-hover:text-[#0052FF] transition-colors">
                {userLocation}
                <HugeiconsIcon icon={ArrowDown01Icon} className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0052FF] transition-colors" />
              </span>
            </div>
          </button>
        </div>

        {/* Center Search Bar with Interactive Dropdown */}
        <div className="flex-1 max-w-[460px] relative" ref={searchRef}>
          <div
            className={`flex items-center bg-[#F1F3F6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0052FF]/20 focus-within:border-[#0052FF] border rounded-xl px-5 h-[54px] transition-all ${isSearchFocused
                ? "border-[#0052FF] bg-white ring-2 ring-[#0052FF]/20 shadow-md"
                : "border-transparent"
              }`}
          >
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
              className="w-full bg-transparent outline-none text-base font-medium text-slate-800 placeholder:text-slate-400"
            />
            <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-slate-500 shrink-0 cursor-pointer" />
          </div>

          {/* Trending Searches Floating Dropdown */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200/80 ring-1 ring-black/5 z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-[15px] font-medium text-black/60 tracking-tight flex items-center gap-1.5">
                  <HugeiconsIcon icon={AutoConversationsIcon} className="w-3.5 h-3.5" /> Popular Searches
                </span>
              </div>

              <div className="flex flex-col gap-1 pb-3">
                {POPULAR_SEARCHES.map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    onClick={() => {
                      setModalSearchTerm(item.term);
                      setIsSearchFocused(false);
                      setIsDropdownOpen(true);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer group w-full"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0052FF] transition-colors shrink-0" />
                      <span className="text-[12px] sm:text-[15px] tracking-tight font-medium text-slate-800 group-hover:text-[#0052FF] transition-colors whitespace-nowrap truncate">
                        {item.term}
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-[12px] font-medium text-slate-400 bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#0052FF] px-2 py-0.5 rounded-md transition-colors shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>

              {/* Order via App Banner inside Dropdown */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      Download Gloceries for everyday essentials <br /> delivered to your door.
                    </span>
                    {/* <span className="text-[10px] font-medium text-slate-600">
                      Live tracking & fast doorstep delivery
                    </span> */}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    setIsDropdownOpen(true);
                  }}
                  className="bg-[#0052FF] hover:bg-[#0040E0] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                >
                  Get App
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right CTA Button: 🛒 Order on Gloceries App */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0052FF] to-[#0040E0] hover:from-[#0048E5] hover:to-[#0036C7] active:scale-[0.98] text-white px-5 sm:px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all cursor-pointer group shrink-0"
          >
            <HugeiconsIcon icon={ShoppingBag01Icon} className="w-5 h-5 text-white shrink-0 group-hover:scale-110 transition-transform" />
            <span className="hidden xs:inline">Order on Gloceries App</span>
            <span className="xs:hidden">Get App</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {/* App Order & Download Dropdown Menu — scan-to-install QR */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl bg-white p-4 shadow-2xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="text-sm font-medium text-slate-900 leading-tight">
                  Scan to get the Groceries app, available on Android & iOS.
                </span>

                {/* QR — scanning with phone camera opens the app store listing */}
                <div className="w-full rounded-2xl border border-gray-100 p-2 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://i.pinimg.com/736x/05/43/e7/0543e7cb27b3ba4045b94e3ca0d55e0e.jpg"
                    alt="Scan this QR code with your phone camera to download the Gloceries app"
                    className="w-full aspect-square object-cover rounded-xl select-none"
                    draggable={false}
                  />
                </div>

                <span className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                  {/* <HugeiconsIcon icon={QrCodeIcon} className="w-3.5 h-3.5 text-[#0052FF]" /> */}
                Get it on Android & iOS
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Interactive Location Selection Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleSelectLocation}
        currentLocation={userLocation}
        isFirstVisit={isFirstVisit}
      />
    </header>
  );
}