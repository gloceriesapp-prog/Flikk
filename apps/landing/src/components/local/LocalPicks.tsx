import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import type { LandingProduct } from "@/lib/products";
import { APP_DOWNLOAD_HREF } from "@/lib/links";

// Feature photo + scrollable shelf of real products from nearby stores.
export default function LocalPicks({ products }: { products: LandingProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-white pb-14 pt-4" aria-labelledby="local-picks-heading">
      <div className="mx-auto flex max-w-[1440px] gap-4 px-4 sm:px-6">
        <a
          href={APP_DOWNLOAD_HREF}
          className="group relative hidden h-[360px] w-[420px] shrink-0 overflow-hidden rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155DFC] md:block lg:w-[520px]"
        >
          <Image
            src="/images/cat_kitchen_restock.jpg"
            alt="Fresh vegetables from a neighbourhood store"
            fill
            sizes="520px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 p-7">
            <span className="inline-block rounded-full bg-black/35 px-3 py-1 text-[13px] font-medium text-white backdrop-blur-md">From your neighbourhood</span>
            <h2 id="local-picks-heading" className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-white">Local favourites</h2>
          </div>
        </a>

        {/* Native horizontal scroll; the last card peeks to hint there's more. */}
        <ul className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((p) => (
            <li key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[184px]">
              <a href={APP_DOWNLOAD_HREF} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155DFC]">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F3F5F9]">
                  <Image src={p.image} alt={p.name} fill sizes="184px" className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]" />
                  {p.discount && (
                    <span className="absolute right-2 top-2 rounded-md bg-[#155DFC] px-2 py-0.5 text-[12px] font-semibold text-white">{p.discount}</span>
                  )}
                  <span className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#155DFC] text-white shadow-md transition-colors group-hover:bg-[#0F4BD8]" aria-hidden="true">
                    <HugeiconsIcon icon={Add01Icon} className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[22px] font-bold tracking-tight text-[#101C10]">₹{p.price}</span>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-[14px] font-medium text-black/40 line-through">₹{p.originalPrice}</span>
                  )}
                </div>
                {p.saved ? (
                  <span className="mt-1 inline-block rounded-md bg-[#E8F0FF] px-2 py-0.5 text-[13px] font-semibold text-[#155DFC]">You save ₹{p.saved}</span>
                ) : null}
                <p className="mt-1.5 line-clamp-2 text-[15px] font-medium leading-snug text-[#101C10]">{p.name}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{p.quantity}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
