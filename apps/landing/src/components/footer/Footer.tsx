import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { AREAS } from "@/lib/seo/areas";
import { POLICIES, POLICY_ORDER, policyHref } from "@/lib/legal/policies";
import { COMPANY as LEGAL_ENTITY } from "@/lib/legal/company";

// Footer doubles as the HTML sitemap: real crawlable <a href> to every
// routed page. The delivery-area column is the SEO engine — it internal-
// links all /delivery/<slug> pages so Google discovers + ranks every zone
// (active or "launching soon") from any page the footer renders on.
type FooterLink = { label: string; href: string };

const COMPANY: FooterLink[] = [
  { label: "About Gloceries", href: "/about" },
  { label: "Partner with us", href: "/partner" },
  { label: "Become a rider", href: "/partner#rider" },
];

// Every zone → a crawlable <a href>. Live zones drop into the app home with
// the zone preselected (`/?area=<slug>` → home renders the location strip);
// soon zones keep their own /delivery/<slug> SEO page (the ones that most need
// ranking). Sitemap still lists every /delivery/<slug>, so discovery holds.
const LIVE_AREAS: FooterLink[] = AREAS.filter((a) => a.active).map((a) => ({
  label: `Delivery in ${a.area}`,
  href: `/?area=${a.slug}`,
}));
const SOON_AREAS: FooterLink[] = AREAS.filter((a) => !a.active).map((a) => ({
  label: `Delivery in ${a.area}`,
  href: `/delivery/${a.slug}`,
}));

// Legal pages come from the policy registry — the same list the sitemap uses.
const LEGAL: FooterLink[] = POLICY_ORDER.map((slug) => ({
  label: POLICIES[slug].label,
  href: policyHref(slug),
}));

function LinkColumn({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-5">
      <h4 className="text-lg font-semibold text-[#878787]">{title}</h4>
      <ul className="flex flex-col gap-3 text-[#FFFFFF] font-medium text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} className="hover:text-white/80 transition-all inline-block">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-[#212121] text-white pt-16 pb-0 border-t border-slate-800 overflow-hidden relative">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-12 lg:gap-16">

        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-8 w-full z-10 relative">

          {/* Link columns / HTML sitemap — Company + Legal stacked, Delivery Areas own column */}
          <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:w-2/5">
            <div className="flex flex-col gap-10">
              <LinkColumn title="Company" items={COMPANY} />
              <LinkColumn title="Legal" items={LEGAL} />
            </div>
            <div className="flex flex-col gap-5">
              <h4 className="text-lg font-semibold text-[#878787]">Delivery Areas</h4>
              <ul className="flex flex-col gap-3 text-sm font-medium">
                {/* Live zones — orderable today */}
                {LIVE_AREAS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-white hover:text-white/80 transition-all inline-flex items-center gap-2"
                    >
                      {item.label}
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A8D93A]" />
                    </a>
                  </li>
                ))}
                {/* Coming soon — dimmed, still crawlable (SEO) */}
                {SOON_AREAS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-[#878787] hover:text-white/70 transition-all inline-flex items-center gap-2"
                    >
                      {item.label}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#878787]/70 border border-[#878787]/30 rounded px-1.5 py-0.5">
                        Soon
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — socials (left) + brand & app badges (right) */}
          <div className="flex flex-row justify-between gap-8 lg:w-1/2 lg:max-w-[560px]">

            {/* Follow us on — left column */}
            <div className="flex flex-col gap-5 shrink-0">
              <h4 className="text-lg font-semibold text-[#878787]">Follow us on</h4>
              <div className="flex items-center gap-4">
                <a href="#" aria-label="LinkedIn" className="w-11 h-11 rounded-full bg-[#2E2E2E] hover:bg-[#0052FF] flex items-center justify-center text-slate-300 hover:text-white transition-all">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
                <a href="#" aria-label="Instagram" className="w-11 h-11 rounded-full bg-[#2E2E2E] hover:bg-[#0052FF] flex items-center justify-center text-slate-300 hover:text-white transition-all">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </a>
                <a href="#" aria-label="YouTube" className="w-11 h-11 rounded-full bg-[#2E2E2E] hover:bg-[#0052FF] flex items-center justify-center text-slate-300 hover:text-white transition-all">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Brand + app badges — right column, badges directly below brand */}
            <div className="flex flex-col items-end gap-6 text-right">
              {/* Logo + wordmark */}
              <div className="flex flex-col items-end gap-3">
                <div className="w-16 h-16 rounded-2xl bg-[#155dfc] flex items-center justify-center shadow-lg shadow-[#155dfc]/20">
                  <HugeiconsIcon icon={ShoppingBag01Icon} className="w-8 h-8 text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-white inline-flex items-baseline gap-1">
                    gloceries<span className="inline-block w-2 h-2 bg-[#155dfc] rounded-full"></span>
                  </span>
                </div>
              </div>

              {/* App store badges */}
              <div className="flex flex-wrap items-center justify-end gap-3.5">
                <a
                  href="#download-android"
                  className="bg-black hover:bg-[#0A0A0A] border border-white/10 text-white px-5 py-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0 group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z" />
                    <path fill="#34A853" d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z" />
                    <path fill="#FBBC04" d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z" />
                    <path fill="#EA4335" d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z" />
                  </svg>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[13px] font-medium tracking-tight text-white/70">Get it on</span>
                    <span className="text-base font-bold tracking-tight -mt-0.5">Google Play</span>
                  </div>
                </a>

                <a
                  href="#download-ios"
                  className="bg-black hover:bg-[#0A0A0A] border border-white/10 text-white px-5 py-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current shrink-0 group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                  </svg>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[10px] font-medium tracking-tight text-white/70">Download on the</span>
                    <span className="text-base font-bold tracking-tight -mt-0.5">App Store</span>
                  </div>
                </a>
              </div>

              {/* Accepted payment methods — pinned to bottom of the column */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/payment-method-69e7ec.svg"
                alt="Accepted payment methods"
                className="h-12 sm:h-14 w-auto opacity-90 mt-auto"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#878787]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-[#FFFFFF] relative z-10">
          <span>© 2026 Gloceries. All rights reserved.</span>
          <span className="inline-flex items-center gap-1.5 text-[#FFFFF] font-semibold">
            Made in Udupi <HugeiconsIcon icon={FavouriteIcon} className="w-4 h-4 text-red-500 fill-red-500 inline" /> India&apos;s Silicon Coast
          </span>
        </div>

        <div className="border-[#999C9E]/15 flex flex-col gap-2 text-xs sm:text-sm font-medium text-[#999C9E] leading-relaxed relative z-10">
          <p>
            “Gloceries” is a technology platform{LEGAL_ENTITY.legalName ? ` owned & managed by ${LEGAL_ENTITY.legalName}` : ""} that connects customers with independent local kirana &amp; pharmacy stores. Gloceries does not own inventory or sell products directly, all goods are sold by the respective partner stores. Prices, availability &amp; delivery times may vary by store and location.
          </p>
          {LEGAL_ENTITY.supportPhone && (
            <p>
              Contact:{" "}
              <a className="underline" href={`tel:${LEGAL_ENTITY.supportPhone}`}>
                {LEGAL_ENTITY.supportPhone}
              </a>
              {" · "}
              <a className="underline" href={`mailto:${LEGAL_ENTITY.supportEmail}`}>
                {LEGAL_ENTITY.supportEmail}
              </a>
            </p>
          )}
        </div>

        {/* Changed leading-[0.75] to leading-none and added pb-4 lg:pb-8 */}
        <div className="w-full flex items-center justify-center relative select-none mt-4 lg:mt-8 z-0 pb-4 lg:pb-8">
          <div aria-hidden="true" className="text-[16.5vw] sm:text-[18vw] lg:text-[220px] xl:text-[235px] font-medium text-white/90 leading-none tracking-tighter uppercase w-full text-center drop-shadow-sm">
            Gloceries
          </div>
        </div>
      </div>
    </footer>
  );
}
