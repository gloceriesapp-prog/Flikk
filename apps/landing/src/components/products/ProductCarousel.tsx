import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import type { LandingProduct } from "@/lib/products";

interface Props {
  products: LandingProduct[];
}

export default function ProductGrid({ products }: Props) {
  if (products.length === 0) return null;

  // Render the real products as-is — distinct DB rows, no client-side
  // duplication. page.tsx already caps the fetch at 32; if the DB has fewer
  // qualifying products, fewer show rather than repeating to pad the grid.
  return (
    <section className="w-full bg-white pb-16 pt-2">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-5">

        {/* Section Header */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl sm:text-[30px] font-semibold text-[#0F172A] tracking-tight">
            Trending in Your Area
          </h2>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#see-all-products"
              className="text-[15px] font-medium text-[#0052FF] hover:underline flex items-center gap-1"
            >
              <span>Continue in App</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Product Cards Grid — 6 per row on the largest breakpoint, bigger
            cards, edge-to-edge image with an overlapping "ADD" pill. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="w-full flex flex-col group cursor-pointer"
            >
              {/* Product Image Container */}
              <div className="w-full aspect-square rounded-2xl bg-[#F8FAFC] border border-slate-200/70 relative overflow-hidden transition-colors duration-200 group-hover:border-slate-300">
                <Image
                  src={prod.image}
                  alt={prod.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw"
                  className="object-cover"
                />

                {/* "ADD +" pill — overlaps the bottom-right of the image. */}
                <button
                  type="button"
                  aria-label={`Add ${prod.name}`}
                  className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-xl border border-[#0052FF] bg-white px-4 sm:px-5 py-1.5 text-[13px] sm:text-[14px] font-medium text-[#0052FF] shadow-sm hover:bg-[#0052FF] hover:text-white active:scale-95 transition-all duration-200 cursor-pointer z-10"
                >
                  ADD
                </button>
              </div>

              {/* Product Info */}
              <div className="flex flex-col pt-3 px-1">
                {/* Product Name */}
                <h3 className="text-[14px] sm:text-[16px] font-medium text-[#0F172A] leading-snug tracking-tight line-clamp-2 transition-colors">
                  {prod.name}
                </h3>

                {/* Quantity pill + rating badge + dashed filler —
                    Hyperpure/Zepto-style row. Rating + count are derived
                    per-product in lib/products (deriveSocialProof), not real
                    aggregates yet. */}
                <div className="flex items-center gap-2 mt-2">
                  {prod.quantity && (
                    <span className="rounded-md bg-[#E8EAF5] px-2 py-[3px] text-[10px] sm:text-[11.5px] font-medium text-black whitespace-nowrap">
                      {prod.quantity}
                    </span>
                  )}
                  <span className="h-4 w-px bg-slate-200" />
                  <span className="flex items-center gap-1 whitespace-nowrap text-[11px] sm:text-[13px] font-semibold text-slate-700">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#165135] shrink-0">
                      <HugeiconsIcon icon={StarIcon} className="w-3 h-3 text-white" />
                    </div>
                    {prod.rating.toFixed(1)}
                    <span className="font-medium text-black/50">({prod.ratingCount})</span>
                  </span>
                  <span className="flex-1 border-t border-dashed border-black/50" />
                </div>

                {/* Price Row */}
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-[17px] sm:text-[20px] font-semibold text-black/90 tracking-tight">
                    ₹{prod.price}
                  </span>
                  {prod.originalPrice && (
                    <span className="text-[13px] sm:text-[14px] font-semibold text-black/40 line-through">
                      ₹{prod.originalPrice}
                    </span>
                  )}
                </div>

                {/* Green chip — savings when there's a discount, else "Best
                    rate" (mirrors the reference's green tag). */}
                <span className="mt-1.5 inline-flex w-fit items-center rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 sm:text-[12px] whitespace-nowrap">
                  {prod.saved ? `Save ₹${prod.saved} on MRP` : "Today's Best Price"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}