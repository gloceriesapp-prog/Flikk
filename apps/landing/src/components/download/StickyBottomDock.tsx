"use client";

import React, { useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

const LOGO_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/All_Right-removebg-preview.png";

export default function StickyBottomDock() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-[92vw] sm:max-w-auto">
      {/* Translucent Glassmorphic Container with Blur & Saturation */}
      <div className="bg-[#030712]/75 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 text-white rounded-full px-4 sm:px-6 py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center gap-3 sm:gap-5 relative overflow-hidden group">
        {/* Glow Top Gradient Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#0052FF] to-transparent opacity-90" />

        {/* Brand Logo & Micro-copy */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md p-1 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <Image
              src={LOGO_IMAGE_URL}
              alt="Flikk Icon"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-extrabold text-white leading-tight flex items-center gap-1.5">
              <span>Order faster on Flikk App</span>
            </span>
            <span className="text-[11px] font-medium text-slate-300/80 hidden xs:inline">
              Live tracking & exclusive app discounts
            </span>
          </div>
        </div>

        {/* Action Button: Get App with Glow Shadow */}
        <button
          type="button"
          onClick={() => {
            const element = document.getElementById("app-download-banner");
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            } else {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }
          }}
          className="bg-[#B5F670] hover:brightness-110 active:scale-95 text-black font-black text-xs sm:text-sm px-4.5 py-2 rounded-full flex items-center gap-1.5  transition-all cursor-pointer shrink-0"
        >
          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
          <span>Get App</span>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          aria-label="Close sticky dock"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
