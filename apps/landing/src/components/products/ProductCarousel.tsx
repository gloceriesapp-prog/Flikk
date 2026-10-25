import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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
    <section className="w-full bg-white pb-14 pt-2">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col gap-5">

        {/* Section Header */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[32px] font-semibold text-[#0F172A] tracking-tight">
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

        {/* Compact cards — 8 per row on xl, image with an overlapping "ADD" pill. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-6 sm:gap-x-4">
          {/* Two full rows of 8 on xl — no half-empty last row. */}
          {products.slice(0, 16).map((prod) => (
            <div
              key={prod.id}
              className="w-full flex flex-col group cursor-pointer"
            >
              {/* Product Image Container */}
              <div className="w-full aspect-square rounded-xl bg-[#F8FAFC] border border-slate-200/70 relative overflow-hidden transition-colors duration-200 group-hover:border-slate-300">
                <Image
                  src={prod.image}
                  alt={prod.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1280px) 16vw, 180px"
                  className="object-cover"
                />

                {/* "ADD +" pill — overlaps the bottom-right of the image. */}
                <button
                  type="button"
                  aria-label={`Add ${prod.name}`}
                  className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-lg border border-[#155DFC] bg-white px-3 py-1 text-[12px] font-semibold text-[#155DFC] shadow-sm hover:bg-[#155DFC] hover:text-white active:scale-95 transition-all duration-200 cursor-pointer z-10"
                >
                  ADD
                </button>
              </div>

              {/* Product Info */}
              <div className="flex flex-col pt-2.5 px-0.5">
                {/* Product Name */}
                <h3 className="truncate text-[13px] sm:text-[14px] font-medium text-[#0F172A] leading-tight tracking-tight transition-colors">
                  {prod.name}
                </h3>

                {/* Quantity pill + rating badge + dashed filler —
                    Hyperpure/Zepto-style row. Rating + count are derived
                    per-product in lib/products (deriveSocialProof), not real
                    aggregates yet. */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {prod.quantity && (
                    <span className="rounded-md bg-[#E8EAF5] px-1.5 py-[2px] text-[10px] sm:text-[11px] font-medium text-black whitespace-nowrap">
                      {prod.quantity}
                    </span>
                  )}
                  <span className="h-4 w-px bg-slate-200" />
                  <span className="flex items-center gap-1 whitespace-nowrap text-[11px] sm:text-[12px] font-semibold text-slate-700">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[#165135] shrink-0">
                      <HugeiconsIcon icon={StarIcon} className="w-2.5 h-2.5 text-white" />
                    </div>
                    {prod.rating.toFixed(1)}
                    <span className="font-medium text-black/50">({prod.ratingCount})</span>
                  </span>
                  <span className="flex-1 border-t border-dashed border-black/50" />
                </div>

                {/* Price Row */}
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-[16px] sm:text-[17px] font-semibold text-black/90 tracking-tight">
                    ₹{prod.price}
                  </span>
                  {prod.originalPrice && (
                    <span className="text-[12px] sm:text-[13px] font-semibold text-black/40 line-through">
                      ₹{prod.originalPrice}
                    </span>
                  )}
                </div>

                {/* Green chip — savings when there's a discount, else "Best
                    rate" (mirrors the reference's green tag). */}
                <span className="mt-1 inline-flex w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 sm:text-[11px] whitespace-nowrap">
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