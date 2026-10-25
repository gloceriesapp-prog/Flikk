import Image from "next/image";
import { FooterAppBadges } from "../footer/FooterAppBadges";

// Same QR the navbar "Get the App" dropdown shows.
const QR_SRC = "https://i.pinimg.com/736x/05/43/e7/0543e7cb27b3ba4045b94e3ca0d55e0e.jpg";

const PHONE_TILES = [
  { src: "/images/essentials/dairy.png", label: "Dairy" },
  { src: "/images/essentials/grocery-staples.png", label: "Staples" },
  { src: "/images/essentials/home-care.png", label: "Home care" },
  { src: "/images/essentials/personal-care.png", label: "Personal care" },
];

export default function AppDownloadBanner() {
  return (
    <section className="bg-white pt-16" aria-labelledby="app-banner-heading">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="relative isolate flex flex-col gap-6 rounded-t-[28px] bg-[linear-gradient(110deg,#E8F0FF_0%,#DCE8FF_55%,#C9DBFF_100%)] p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-10 lg:py-7">
          <div className="pointer-events-none absolute -left-10 -top-16 -z-10 h-56 w-56 rounded-full bg-white/60 blur-3xl" aria-hidden="true" />

          <div className="lg:flex-1">
            <h2 id="app-banner-heading" className="text-[24px] font-bold leading-tight tracking-tight text-[#101C10] sm:text-[30px]">
              Everything&apos;s faster in the Gloceries app
            </h2>
            <p className="mt-2 max-w-[520px] text-[15px] font-medium text-[#101C10]/70 sm:text-[17px]">
              Scan the QR code to download Gloceries and get groceries from stores near you in 30 minutes.
            </p>
          </div>

          {/* Phone rising out of the card's top edge; bottom sits flush on the card edge. */}
          <div className="relative hidden h-[150px] w-[150px] shrink-0 self-end xl:block" aria-hidden="true">
            <div className="absolute bottom-[-28px] left-0 h-[230px] w-[150px] overflow-hidden rounded-t-[26px] border-[5px] border-b-0 border-[#101C10] bg-white">
              <div className="mx-auto mt-1.5 h-3 w-14 rounded-full bg-[#101C10]" />
              <div className="px-2.5 pt-2">
                <p className="text-[9px] font-bold text-[#101C10]">Shop by category</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {PHONE_TILES.map((t) => (
                    <div key={t.label} className="rounded-lg bg-[#EEF5FF] p-1">
                      <div className="relative aspect-square">
                        <Image src={t.src} alt="" fill sizes="60px" className="object-contain" />
                      </div>
                      <p className="mt-0.5 truncate text-center text-[7px] font-semibold text-[#101C10]">{t.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Google Play above App Store, QR the same height as the pair. */}
          <div className="flex items-center gap-4">
            <FooterAppBadges className="flex flex-col-reverse items-stretch gap-2.5" />
            <div className="hidden shrink-0 rounded-2xl bg-white p-2 sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={QR_SRC} alt="QR code to download the Gloceries app" className="h-[90px] w-[90px] rounded-lg object-cover" draggable={false} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
