"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface PromoCard {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  borderColor: string;
  titleColor: string;
  subtitleColor: string;
  image: string;
  alt: string;
  proof?: string;
  // When set, the card is full-bleed: this image fills it, no gradient bg or
  // corner thumbnail — text just overlays the image.
  bgImage?: string;
}

const PROMO_CARDS: PromoCard[] = [
  {
    id: "festive-navaratri",
    title: "Get Ready for Navaratri",
    subtitle: "Local puja items and fresh sweets, from your neighbourhood shops",
    bgGradient: "from-[#FDF4E2] via-[#F4DFAC] to-[#E6BE72]",
    borderColor: "border-amber-200/80",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/landing-promo.png",
    alt: "Navaratri puja essentials, flowers & sweets",
    proof: "Order early",
    bgImage: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/card4-landing.png",
  },
  {
    id: "local-kirana",
    title: "Your Trusted Kirana",
    subtitle: "Daily pantry staples from stores you already know.",
    bgGradient: "from-[#EEF3FF] via-[#D5E2FF] to-[#B2C9FF]",
    borderColor: "border-sky-200/60",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/landing-promo2.png",
    alt: "Everyday grocery staples from local kirana stores",
    proof: "Shops near you",
    bgImage: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/card3-landing.png",
  },
  {
    id: "fresh-produce",
    title: "Fresh in 30 Minutes",
    subtitle: "Crisp veggies and dairy straight to your door.",
    bgGradient: "from-[#EAF5E4] via-[#CFE8C6] to-[#A9D69A]",
    borderColor: "border-emerald-200/70",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/landing-promo3.png",
    alt: "Fresh local produce, fruits & dairy",
    proof: "Avg 30 min",
    bgImage: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/card5-landing.png",
  },
];

export default function PromoBanners() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(2);
  const carouselRef = useRef<HTMLDivElement>(null);

  const updateSlideCount = () => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 10) {
        setTotalSlides(1);
      } else {
        const firstCard = container.children[0] as HTMLElement;
        if (firstCard) {
          const cardStep = firstCard.offsetWidth + 18;
          const steps = Math.round(maxScroll / cardStep);
          setTotalSlides(Math.max(1, steps + 1));
        }
      }
    }
  };

  useEffect(() => {
    updateSlideCount();
    window.addEventListener("resize", updateSlideCount);
    return () => window.removeEventListener("resize", updateSlideCount);
  }, []);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % totalSlides;
        if (carouselRef.current) {
          const container = carouselRef.current;
          const maxScroll = container.scrollWidth - container.clientWidth;
          const targetScroll =
            (maxScroll / Math.max(1, totalSlides - 1)) * nextIndex;
          container.scrollTo({
            left: targetScroll,
            behavior: "smooth",
          });
        }
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [totalSlides]);

  const scrollToSlide = (index: number) => {
    setActiveIndex(index);
    if (carouselRef.current) {
      const container = carouselRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const targetScroll =
        (maxScroll / Math.max(1, totalSlides - 1)) * index;
      container.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (carouselRef.current && totalSlides > 1) {
      const container = carouselRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        const currentScroll = container.scrollLeft;
        const progress = currentScroll / maxScroll;
        const calculatedIndex = Math.min(
          totalSlides - 1,
          Math.max(0, Math.round(progress * (totalSlides - 1)))
        );
        if (calculatedIndex !== activeIndex) {
          setActiveIndex(calculatedIndex);
        }
      }
    }
  };

  return (
    <section className="w-full bg-white pb-12 pt-2">
      {/* Same 1280 max-width + px-6 as the sections above so the promo row
          starts at the exact left edge of the hero/experience grid. */}
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-start gap-4">

        {/* Horizontal Track for Mobile -> fixed-width cards, left-aligned on Desktop */}
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex lg:grid lg:grid-cols-3 items-stretch gap-4 lg:gap-5 w-full overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory scroll-smooth py-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {PROMO_CARDS.map((card) => (
            <div
              key={card.id}
              className={`w-[240px] sm:w-[280px] lg:w-auto shrink-0 lg:shrink snap-start
 h-[196px] sm:h-[206px] lg:h-[214px] rounded-[24px] p-4 lg:p-5 flex flex-col j
ustify-between relative overflow-hidden ${card.bgImage ? "" : `bg-gradient-to-br ${card.bgGradient}`} s
elect-none ring-1 ring-black/[0.06]`}
            >
              {/* Full-bleed background image (only for cards that opt in) */}
              {card.bgImage && (
                <Image
                  src={card.bgImage}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 1024px) 280px, 368px"
                  className="pointer-events-none select-none object-cover z-0"
                />
              )}

              {/* Soft top sheen for depth — premium dimensional finish */}
              {!card.bgImage && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent z-0" />
              )}

              {/* Top Right micro-proof tag */}
              {card.proof && (
                <span className="absolute top-3 right-3 lg:top-4 lg:right-4 z-20 inline-flex items-center bg-white/95 backdrop-blur-md text-[9px] lg:text-[10px] font-medium text-[#000000] tracking-tight px-2.5 py-1 rounded-full border border-black/[0.1]">
                  {card.proof}
                </span>
              )}

              {/* Top Text Content */}
              <div
                className={`flex flex-col gap-1.5 lg:gap-2 relative z-10 ${card.proof ? "max-w-[160px] lg:max-w-[210px]" : "max-w-[190px] lg:max-w-[240px]"
                  }`}
              >
                <span
                  className={`text-[19px] lg:text-[23px] font-semibold ${card.titleColor} leading-tight tracking-tight drop-shadow-xs`}
                >
                  {card.title}
                </span>
                <span
                  className={`text-[12px] lg:text-[13px] font-medium ${card.subtitleColor} leading-snug line-clamp-2`}
                >
                  {card.subtitle}
                </span>
              </div>

              {/* Honest app CTA, anchored bottom */}
              <a
                href="#download-android"
                className="mt-auto w-fit inline-flex items-center gap-1.5 bg-white text-slate-900 text-[12px] lg:text-[13px] font-medium px-4 py-2 rounded-full relative z-10"
              >
                Order on app
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M13.5 4.5L21 12l-7.5 7.5-1.4-1.4 5.1-5.1H3v-2h14.2l-5.1-5.1z" />
                </svg>
              </a>

              {/* Product Image Right Bottom (skipped when full-bleed bgImage) */}
              {!card.bgImage && (
                <div className="absolute right-0 bottom-0 w-[160px] lg:w-[195px]
 h-[140px] lg:h-[168px] overflow-hidden pointer-events-none z-0">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 1024px) 180px, 16vw"
                    className="object-cover object-bottom rounded-tl-[24px]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic Carousel Pagination - Hidden on Desktop since grid fits all */}
        {totalSlides > 1 && (
          <div className="flex lg:hidden items-center justify-center gap-2 mt-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                onClick={() => scrollToSlide(idx)}
                aria-label={`Go to promo slide ${idx + 1}`}
                className={`h-1.5 transition-all duration-300 cursor-pointer rounded-full ${idx === activeIndex
                    ? "w-7 bg-slate-900 shadow-xs"
                    : "w-2 bg-slate-200 hover:bg-slate-400"
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}