import React from "react";

// Thin location strip shown atop the home page when a footer live-zone link
// lands here as `/?area=<slug>`. Copy is deliberately distinct from the
// /delivery/<slug> page H1 ("Grocery Delivery in {area}") so the two surfaces
// don't read as duplicate content. Only rendered for live zones, so the
// "Delivered in minutes." claim is always honest.
export default function AreaStrip({ area }: { area: string }) {
  return (
    <section className="w-full bg-white pt-6 sm:pt-8">
      <div className="max-w-[1280px] mx-auto px-6 text-center">
        <p className="text-[15px] font-medium tracking-tight text-[#0052FF] uppercase mb-1.5">
          Now delivering here
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-[34px] font-medium text-[#0F172A] leading-[1.15] tracking-tight">
          Built for {area}.{" "}
          <span className="text-[#0052FF]">Delivered in minutes.</span>
        </h2>
      </div>
    </section>
  );
}
