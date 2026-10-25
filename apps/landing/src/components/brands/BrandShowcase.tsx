// Brands commonly stocked on Kaup/Udupi kirana shelves — plain wordmarks, not
// partnership claims. Each gets its own type treatment so the row reads like
// a set of logos without shipping anyone's actual logo artwork.
const BRANDS = [
  { name: "Nandini", className: "font-bold italic text-[#1F6FB2]" },
  { name: "Britannia", className: "font-semibold tracking-tight text-[#C8102E]" },
  { name: "MTR", className: "font-bold tracking-[0.2em] text-[#B5121B]" },
  { name: "Aashirvaad", className: "font-medium italic text-[#7A4B1E]" },
  { name: "Parle", className: "font-bold text-[#D71920]" },
  { name: "Tata Sampann", className: "font-semibold text-[#2C3E8F]" },
  { name: "Haldiram's", className: "font-bold italic text-[#C9252C]" },
  { name: "Dabur", className: "font-bold tracking-wide text-[#0E7C3A]" },
  { name: "Mysore Sandal", className: "font-medium tracking-tight text-[#8A5A14]" },
  { name: "Amul", className: "font-bold italic text-[#E31E24]" },
] as const;


function Leaf({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M52 8C26 8 10 22 10 42c0 6 2 11 5 14 3-14 13-26 27-33-11 9-19 20-22 34 4 2 8 3 12 3 20 0 28-22 20-52z" fill="currentColor" />
    </svg>
  );
}

export default function BrandShowcase() {
  return (
    <section className="relative overflow-hidden bg-white pb-6 pt-14 sm:pt-20" aria-labelledby="brands-heading">
      <Leaf className="pointer-events-none absolute -right-4 top-6 h-20 w-20 rotate-[24deg] text-[#7CB518] sm:h-28 sm:w-28" />

      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id="brands-heading" className="max-w-[520px] text-[32px] font-semibold leading-[1.08] tracking-tight text-[#0F172A] sm:text-[44px]">
              Brands you love, from shops you know
            </h2>
            <p className="mt-3 max-w-[460px] text-[15px] font-medium leading-relaxed text-[#456253]">
              The same trusted names already on your local kirana&apos;s shelves.
            </p>
          </div>
          {/* Hand-drawn squiggle accent. */}
          <svg viewBox="0 0 220 60" className="mr-16 mt-4 hidden h-14 w-52 text-[#A8D93A] md:block" fill="none" aria-hidden="true">
            <path d="M4 30c10-26 20 26 30 0s20 26 30 0 20 26 30 0 20 26 30 0 20 26 30 0 20 26 30 0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>

        {/* All wordmarks in a static grid — no rotation. */}
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5" aria-label="Brands available on Gloceries">
          {BRANDS.map((brand) => (
            <li key={brand.name} className="flex h-20 items-center justify-center rounded-2xl border border-black/10 bg-white px-3 transition-colors hover:border-black/20">
              <span className={`whitespace-nowrap text-[20px] sm:text-[22px] lg:text-[26px] ${brand.className}`}>{brand.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
