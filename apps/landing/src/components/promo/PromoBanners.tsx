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
  poweredBy?: string;
}

const PROMO_CARDS: PromoCard[] = [
  {
    id: "festive-sweets",
    title: "Ganesh Festival Sweets",
    subtitle: "Fresh modaks, laddoos, puja thalis & festive hampers delivered fast",
    bgGradient: "from-[#FEF3C7] via-[#FDE047]/90 to-[#F59E0B]/80",
    borderColor: "border-amber-200/80",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "/images/rakhi_gifting_banner.jpg",
    alt: "Festive Sweets & Puja Essentials",
    poweredBy: "festive corner",
  },
  {
    id: "paan-corner",
    title: "Paan & Mints Corner",
    subtitle: "Get smoking accessories, mouth fresheners & mints delivered instantly",
    bgGradient: "from-[#EAE3D9] via-[#E2D8C9] to-[#D5C9B8]",
    borderColor: "border-slate-200/60",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-700",
    image: "/images/paan_corner_banner.jpg",
    alt: "Paan Corner Mints & Accessories",
  },
  {
    id: "hygiene-care",
    title: "Girls, Be Prepared Anytime",
    subtitle: "Range of feminine hygiene, skincare & hair removal products",
    bgGradient: "from-[#EE7777] via-[#E26A96] to-[#9C8ADE]",
    borderColor: "border-pink-200/30",
    titleColor: "text-white",
    subtitleColor: "text-white/90",
    image: "/images/hygiene_care_banner.jpg",
    alt: "Feminine Hygiene & Wellness Products",
  },
  {
    id: "monsoon-chai",
    title: "Chai & Rainy Munchies",
    subtitle: "Hot tea, coffee, cookies, chips & crispy instant snacks for rain",
    bgGradient: "from-[#FFEDD5] via-[#F97316]/80 to-[#EA580C]",
    borderColor: "border-orange-200/80",
    titleColor: "text-slate-900",
    subtitleColor: "text-slate-800",
    image: "/images/cat_snack_time.jpg",
    alt: "Chai & Evening Snacks",
  },
];

export default function PromoBanners() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(2);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Measure actual scrollable slides dynamically
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

  // Auto-slide horizontally every 3.5 seconds across actual slide count
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
      <div className="max-w-[980px] mx-auto px-6 flex flex-col items-center gap-4">
        {/* Horizontal Auto-Scrolling Promo Cards Container */}
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex items-center gap-4 sm:gap-4.5 w-full overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth py-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {PROMO_CARDS.map((card) => (
            <div
              key={card.id}
              className={`w-[270px] sm:w-[295px] md:w-[296px] shrink-0 snap-start h-[240px] sm:h-[250px] rounded-3xl p-5 sm:p-5.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br ${card.bgGradient} select-none transition-opacity duration-300`}
            >
              {/* Top Right Powered By Tag if applicable */}
              {card.poweredBy && (
                <div className="absolute top-3.5 right-3.5 z-20 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-xl shadow-xs border border-amber-100/80 flex flex-col items-end">
                  <span className="text-[8px] font-medium text-slate-400 leading-none">
                    Powered by
                  </span>
                  <span className="text-[10px] font-bold text-slate-800 tracking-tight leading-none mt-0.5">
                    {card.poweredBy}
                  </span>
                </div>
              )}

              {/* Top Text Content */}
              <div
                className={`flex flex-col gap-1 relative z-10 ${
                  card.poweredBy ? "max-w-[155px] sm:max-w-[165px]" : "max-w-[195px] sm:max-w-[205px]"
                }`}
              >
                <span
                  className={`text-lg sm:text-[21px] font-extrabold ${card.titleColor} leading-tight tracking-tight drop-shadow-xs`}
                >
                  {card.title}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-semibold ${card.subtitleColor} leading-snug line-clamp-2`}
                >
                  {card.subtitle}
                </span>
              </div>

              {/* Product Image Right Bottom */}
              <div className="absolute right-0 bottom-0 w-[155px] sm:w-[170px] h-[135px] sm:h-[145px] overflow-hidden pointer-events-none z-0">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-bottom rounded-tl-3xl opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/5" />
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Carousel Pagination Indicators matching actual scroll positions */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                onClick={() => scrollToSlide(idx)}
                aria-label={`Go to promo slide ${idx + 1}`}
                className={`h-1.5 transition-all duration-300 cursor-pointer rounded-full ${
                  idx === activeIndex
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
