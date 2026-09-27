"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Location01Icon,
  Search01Icon,
  Cancel01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons";

import { geocode, checkServiceability } from "@/lib/serviceability";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (
    location: string,
    coords?: { lat: number; lng: number },
  ) => void;
  currentLocation?: string;
  isFirstVisit?: boolean;
}

const SUGGESTIONS = [
  "Kodialbail, Mangalore",
  "Kadri, Mangalore",
  "Bejai, Mangalore",
  "Mangaladevi, Mangalore",
  "Surathkal, Mangalore",
  "Kankanady, Mangalore",
  "Falnir, Mangalore",
  "Manipal, Udupi",
];

export default function LocationModal({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation = "Kodialbail, Mangalore",
  isFirstVisit = false,
}: LocationModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  // Set to the resolved name when it's outside the service area — keeps the
  // modal open and expands it into the "not here yet" panel instead of closing.
  const [unavailableLoc, setUnavailableLoc] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSuggestions = SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Single exit point once a location has coords: check serviceability, and
  // only close on a covered area. Uncovered → persist it (badge shows "Coming
  // Soon") but keep the modal open showing the panel. No coords (geocode/GPS
  // failed) → can't verify, so proceed as before.
  const finalize = async (loc: string, coords?: { lat: number; lng: number }) => {
    if (coords) {
      const r = await checkServiceability(coords.lat, coords.lng);
      if (r && !r.serviceable) {
        onSelectLocation(loc, coords);
        setUnavailableLoc(loc);
        setIsLocating(false);
        return;
      }
    }
    onSelectLocation(loc, coords);
    setIsLocating(false);
    onClose();
  };

  const handleDetectLocation = () => {
    setUnavailableLoc(null);
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            if (res.ok) {
              const data = await res.json();
              const address = data.address || {};
              const suburb =
                address.suburb ||
                address.neighbourhood ||
                address.residential ||
                address.subdistrict ||
                address.town ||
                address.village ||
                "";
              const city =
                address.city ||
                address.town ||
                address.county ||
                address.state_district ||
                "Mangalore";
              const formattedLoc = suburb ? `${suburb}, ${city}` : city;

              await finalize(formattedLoc, { lat: latitude, lng: longitude });
              return;
            }
          } catch (err) {
            console.error("Reverse geocoding error:", err);
          }
          setIsLocating(false);
          onSelectLocation("Kodialbail, Mangalore");
          onClose();
        },
        (error) => {
          setIsLocating(false);
          onSelectLocation("Kodialbail, Mangalore");
          onClose();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsLocating(false);
      onSelectLocation("Kodialbail, Mangalore");
      onClose();
    }
  };

  const handleConfirmTypedLocation = async (locationToSet?: string) => {
    const target = locationToSet || searchQuery.trim();
    if (target) {
      setUnavailableLoc(null);
      setIsLocating(true);
      const coords = await geocode(target);
      await finalize(target, coords ?? undefined);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!isFirstVisit) onClose();
      }}
    >
      <div
        className="w-full max-w-[540px] bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Subtitle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
              Change Location
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Check whether Gloceries is available in your area
            </p>
          </div>

          {/* Close button ONLY if not mandatory first visit gate */}
          {!isFirstVisit && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close location prompt"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Inline Action Row: Detect Location | OR | Search Delivery Location */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative mt-1">
          {/* Detect my location button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="bg-[#008738] hover:bg-[#00732f] active:scale-[0.99] text-white px-4 py-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-75"
          >
            <HugeiconsIcon
              icon={Target02Icon}
              className={`w-4 h-4 text-white ${isLocating ? "animate-spin" : ""}`}
            />
            <span>{isLocating ? "Locating..." : "Detect my location"}</span>
          </button>

          {/* OR Pill Divider */}
          <div className="hidden sm:flex items-center justify-center">
            <span className="w-8 h-8 rounded-full border border-gray-200 text-[11px] font-medium text-slate-400 flex items-center justify-center bg-white shrink-0 shadow-2xs">
              OR
            </span>
          </div>

          {/* Search delivery location input */}
          <div className="flex-1 relative">
            <div className="flex items-center bg-white border border-slate-300 focus-within:border-[#008738] rounded-xl px-3.5 h-[44px] transition-all">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-4 h-4 text-slate-400 shrink-0 mr-2"
              />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmTypedLocation();
                  }
                }}
                placeholder="search delivery location"
                className="w-full bg-transparent outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => handleConfirmTypedLocation()}
                  className="bg-[#008738] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg hover:bg-[#00732f] transition-colors shrink-0 ml-1 cursor-pointer"
                >
                  Set
                </button>
              )}
            </div>

            {/* Instant Location Suggestions Dropdown */}
            {showDropdown && searchQuery.trim() !== "" && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1 max-h-[180px] overflow-y-auto scrollbar-none">
                {filteredSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item);
                      handleConfirmTypedLocation(item);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5 text-[#008738]" />
                      {item}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Available</span>
                  </button>
                ))}
                {filteredSuggestions.length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleConfirmTypedLocation(searchQuery)}
                    className="w-full text-left px-4 py-2.5 text-xs font-extrabold text-[#008738] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5" />
                    Deliver to &quot;{searchQuery}&quot;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Out-of-area panel — shown only when a resolved location isn't covered.
            Action row above stays live so the user can retry another spot. */}
        {unavailableLoc && (
          <div className="flex flex-col items-center text-center gap-3 border-t border-slate-100 pt-6 pb-2 animate-in fade-in duration-200">
            <span className="w-16 h-16 rounded-full bg-[#EEF7DC] flex items-center justify-center">
              <HugeiconsIcon icon={Location01Icon} className="w-7 h-7 text-[#7CB518]" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              Not in your lane yet
            </h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[380px]">
              Gloceries hasn&apos;t reached{" "}
              <span className="text-slate-700 font-semibold">{unavailableLoc}</span>{" "}
              yet. We&apos;re rolling out across coastal Karnataka — pick a nearby
              area above, or check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
