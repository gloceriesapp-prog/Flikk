export function FooterAppBadges({ className = "flex flex-wrap items-center gap-2.5" }: { className?: string }) {
  return (
    <div className={className}>
      <a href="#download-ios" aria-label="Download on the App Store" className="inline-flex h-[48px] items-center gap-2 rounded-[5px] bg-[#101827] px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                  </svg>
        <span className="flex flex-col leading-none"><span className="text-[10px]">Download on the</span><span className="mt-1 text-[15px] font-semibold tracking-tight">App Store</span></span>
      </a>
      <a href="#download-android" aria-label="Get it on Google Play" className="inline-flex h-[48px] items-center gap-2 rounded-[5px] border border-[#E7EBF1] bg-white px-3 text-[#172033] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z" />
                    <path fill="#34A853" d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z" />
                    <path fill="#FBBC04" d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z" />
                    <path fill="#EA4335" d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z" />
                  </svg>
        <span className="flex flex-col leading-none"><span className="text-[9px] uppercase tracking-wide">Get it on</span><span className="mt-1 text-[15px] font-semibold tracking-tight">Google Play</span></span>
      </a>
    </div>
  );
}
