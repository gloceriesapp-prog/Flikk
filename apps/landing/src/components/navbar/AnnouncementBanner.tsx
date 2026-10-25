"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

// ponytail: dismiss lasts for the page view only; persist to localStorage if visitors complain it comes back.
export default function AnnouncementBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="relative bg-[#E8F0FF] text-[#0B2A6B]">
      <div className="mx-auto flex h-11 max-w-[1440px] items-center justify-center px-12 text-[14px] font-medium sm:text-[16px]">
        {/* One line everywhere; truncates on narrow screens. */}
        <p className="truncate">
          Discover everything you love with a shopping experience that brings convenience, freshness, and delight to your everyday.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#0B2A6B]/70 transition-colors hover:bg-white/60 hover:text-[#0B2A6B] sm:right-5"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
      </button>
    </div>
  );
}
