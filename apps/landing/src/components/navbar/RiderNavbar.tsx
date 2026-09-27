"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { SITE } from "@/lib/seo/config";

// Rider recruitment page gets its OWN navbar — dark, distinct from the white
// customer navbar. Sticky over the dark hero, lime accent, download CTA.

const NAV_LINKS = [
  { href: "#earnings", label: "Earnings" },
  { href: "#how", label: "How it works" },
  { href: "#requirements", label: "Requirements" },
  { href: "#faq", label: "FAQs" },
];

export default function RiderNavbar({ appUrl }: { appUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0A1120]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand + role tag */}
        <Link href="/rider" className="flex items-center gap-2 shrink-0 select-none">
          <span className="text-[26px] font-semibold tracking-tight text-white">
            gloceries
            <span className="inline-block ml-1 h-2 w-2 rounded-full bg-[#A8D93A] align-middle" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A8D93A] bg-[#A8D93A]/10 border border-[#A8D93A]/25 px-2 py-0.5 rounded-full">
            Riders
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={appUrl}
            className="hidden sm:inline-flex items-center gap-2 bg-[#A8D93A] text-[#101C10] px-5 py-2.5 rounded-xl font-semibold text-[13px] hover:bg-[#7CB518] transition-colors"
          >
            Download rider app
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="md:hidden w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center"
          >
            <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#0A1120] px-6 py-4 flex flex-col gap-1 animate-in fade-in duration-150">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] font-medium text-slate-200 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={appUrl}
            className="mt-2 inline-flex items-center justify-center gap-2 bg-[#A8D93A] text-[#101C10] px-5 py-3 rounded-xl font-semibold text-sm"
          >
            Download rider app
          </a>
        </div>
      )}
    </header>
  );
}
