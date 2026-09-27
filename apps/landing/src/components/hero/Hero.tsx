"use client";

import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";

const HERO_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/landing-hero.png";

export default function Hero() {
  return (
    <section className="w-full bg-white">
      {/* Kept at 1280px to maintain grid alignment with other sections */}
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="relative flex flex-col md:flex-row items-stretch justify-between w-full rounded-3xl overflow-hidden bg-[#2F7D34] ring-1 ring-white/10">
          {/* Top-center spotlight sheen */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(255,255,255,0.16),transparent_60%)]" />

          {/* Fresh-produce glow blobs — lime, leaf green + warm citrus hint */}
          <div className="pointer-events-none absolute -top-20 -left-16 h-[360px] w-[360px] rounded-full bg-[#A8D93A] opacity-40 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 right-[8%] h-[320px] w-[320px] rounded-full bg-[#7CB518] opacity-[0.35] blur-[100px]" />
          <div className="pointer-events-none absolute top-1/3 right-1/4 h-[240px] w-[240px] rounded-full bg-[#2E9E77] opacity-30 blur-[90px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-[220px] w-[220px] rounded-full bg-[#FFB020] opacity-[0.16] blur-[100px]" />

          {/* Soft top highlight for a premium sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />

          {/* Left Column: local-first value message + category strip */}
          <div className="relative z-10 flex flex-col justify-center gap-4 w-full md:w-[52%] p-6 md:px-10 md:py-5 lg:px-12 lg:py-6">
            <div className="flex flex-col gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/15 w-fit px-3 py-1 rounded-full">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A8D93A]" />
                Now live in Kaup &amp; Udupi
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-[42px] lg:text-[46px] font-semibold text-white leading-[1.1] tracking-tight">
                Everything local,
                <br />
                <span className="bg-gradient-to-r from-white to-[#DDEBAF] bg-clip-text text-transparent">
                  delivered in minutes.
                </span>
              </h1>
              <p className="text-sm sm:text-[15px] text-white/85 leading-relaxed max-w-[440px]">
                One cart across every neighbourhood shop you already trust.
              </p>
            </div>

            {/* Category strip — the multi-category story is the differentiator,
                so surface the real verticals instead of abstract feature pills. */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: "🥦", label: "Grocery" },
                { icon: "💊", label: "Pharmacy" },
                { icon: "🥐", label: "Bakery" },
                { icon: "🥛", label: "Dairy" },
                { icon: "🧴", label: "Essentials" },
              ].map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-full"
                >
                  <span>{c.icon}</span>
                  {c.label}
                </span>
              ))}
              <span className="text-[13px] font-semibold text-white/70 px-1">
                &amp; more
              </span>
            </div>

            {/* Trust stats — ETA + local-shops promise, side by side for weight. */}
            <div className="flex flex-wrap items-stretch gap-2.5">
              <div className="inline-flex w-fit items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2.5">
                <span className="text-2xl">⚡</span>
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-bold text-white tracking-tight tabular-nums">
                    ~30 min
                  </span>
                  <span className="text-[11px] font-medium text-white/70 -mt-0.5">
                    avg delivery in your area
                  </span>
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-2.5">
                <span className="text-2xl">🏪</span>
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-bold text-white tracking-tight">
                    Real shops
                  </span>
                  <span className="text-[11px] font-medium text-white/70 -mt-0.5">
                    no dark stores, ever
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Premium landscape hero graphic */}
          <div className="relative z-10 w-full md:w-[48%] px-4 sm:px-6 py-3 md:py-4 flex items-center justify-center overflow-hidden min-h-[160px]">
            <div className="relative z-10 flex w-full items-center justify-center">
              <Image
                src={HERO_IMAGE_URL}
                alt="Gloceries grocery delivery app — order from local stores near you"
                width={627}
                height={398}
                priority
                style={{ width: "auto", height: "100%" }}
                className="max-h-[240px] w-auto max-w-full object-contain block"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}