import Image from "next/image";
import { APP_DOWNLOAD_HREF } from "@/lib/links";

const COLLECTIONS = [
  {
    id: "home-care", label: "HOME CARE", title: "A fresh start for your home.",
    description: "Laundry, cleaning & everyday care.", image: "/images/essentials/home-care.png",
    alt: "Laundry detergent, fabric conditioner and fresh towels",
    className: "bg-[#81346F] text-white lg:col-start-2 lg:row-start-1",
  },
  {
    id: "dairy", label: "DAILY DAIRY", title: "Good mornings start here.",
    description: "Milk, butter, curd & more.", image: "/images/essentials/dairy.png",
    alt: "Milk, yogurt, butter and eggs for everyday breakfasts",
    className: "bg-[#0789B6] text-white lg:col-start-2 lg:row-start-2",
  },
] as const;

function RightArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
      <path d="M19.75 11.7257L4.75 11.7257" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.6997 5.70124C13.6997 5.70124 19.7497 8.96224 19.7497 11.7242C19.7497 14.4882 13.6997 17.7502 13.6997 17.7502" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollectionLink() {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-white underline decoration-white/40 underline-offset-4">
      Explore on app
      <RightArrowIcon />
    </span>
  );
}

export default function ExperienceBanner() {
  return (
    <section className="bg-white pb-6 pt-5" aria-label="Everyday essentials from local stores">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_1.07fr_0.79fr] lg:grid-rows-[224px_224px] xl:grid-rows-[196px_196px]">
          <a href={APP_DOWNLOAD_HREF} className="relative isolate flex min-h-[440px] flex-col overflow-hidden rounded-[16px] bg-[radial-gradient(ellipse_at_50%_10%,#D2F7FA_0%,#86D7E6_52%,#226C87_100%)] p-6 text-[#103C51] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF] sm:col-span-2 sm:p-7 lg:col-span-1 lg:row-span-2 lg:min-h-0">

            <div className="relative z-10 mt-1 max-w-[360px]">
              <h1 className="mt-2 text-[30px] font-semibold leading-[1.08] tracking-tight sm:text-[34px]">Everything from Your Local Stores, Delivered in 30 Minutes.</h1>
              <p className="mt-3 max-w-[290px] text-[13px] font-medium leading-relaxed">Fresh groceries, pantry favourites and more from stores you know.</p>
            </div>
            <div className="pointer-events-none absolute inset-x-1 bottom-0 h-[45%] sm:inset-x-8 sm:h-[53%] lg:inset-x-1 lg:h-[48%]">
              <Image src="/images/essentials/grocery-staples.png" alt="Rice, lentils, flour, oil and fresh produce from your local grocery stores" fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 80vw, 510px" className="object-contain object-bottom" />
            </div>
            <span className="relative z-10 mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-[#15566F] px-4 py-2.5 text-[12px] font-semibold text-white">Shop on app <RightArrowIcon /></span>
          </a>

          {COLLECTIONS.map((collection) => (
            <a key={collection.id} href={APP_DOWNLOAD_HREF} className={`relative isolate flex min-h-[260px] flex-col sm:min-h-[234px] overflow-hidden rounded-[16px] p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF] lg:min-h-0 ${collection.className}`}>
              <div className="relative z-10 max-w-[50%] sm:max-w-[48%]">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-white/85">{collection.label}</p>
                <h2 className="mt-3 text-[22px] font-semibold leading-[1.08] tracking-tight lg:text-[23px]">{collection.title}</h2>
                <p className="mt-2 text-[12px] font-medium leading-snug text-white/90">{collection.description}</p>
              </div>
              <div className="pointer-events-none absolute -right-3 bottom-0 h-[58%] w-[55%] sm:h-[78%] sm:w-[65%] lg:h-[85%] lg:w-[58%]">
                <Image src={collection.image} alt={collection.alt} fill sizes="(max-width: 640px) 60vw, 260px" className="object-contain object-bottom" />
              </div>
              <div className="relative z-10 mt-auto pt-5"><CollectionLink /></div>
            </a>
          ))}

          <a href={APP_DOWNLOAD_HREF} className="relative isolate flex min-h-[400px] flex-col overflow-hidden rounded-[16px] bg-[#F4D3D2] px-6 pb-5 pt-7 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF] sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">

            <h2 className="mx-auto mt-3 max-w-[230px] font-medium text-[31px] leading-[1.05] tracking-tight text-[#A52E40]">A little care.<br />A better day.</h2>
            <p className="mt-3 text-[13px] font-medium text-[#456253]">Personal care, made effortless.</p>
            <div className="pointer-events-none absolute inset-x-2 bottom-0 h-[61%]">
              <Image src="/images/essentials/personal-care.png" alt="Shampoo, body lotion, handwash and soaps on a sage display" fill sizes="(max-width: 1024px) 340px, 300px" className="object-contain object-bottom" />
            </div>
            <span className="relative z-10 mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#9F263A] px-4 py-2.5 text-[12px] font-semibold text-white">Explore on app <RightArrowIcon /></span>
          </a>
        </div>
      </div>
    </section>
  );
}
