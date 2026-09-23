// Visible FAQ. Uses native <details>/<summary> — accessible, zero JS, works
// as a server component. Same Faq[] feeds FAQPage JSON-LD elsewhere.

import type { Faq } from "@/lib/seo/faqs";

export default function FaqSection({
  faqs,
  heading = "Frequently Asked Questions",
}: {
  faqs: Faq[];
  heading?: string;
}) {
  return (
    <section
      aria-labelledby="faq-heading"
      className="w-full bg-white py-14 sm:py-20"
    >
      <div className="max-w-[820px] mx-auto px-6">
        <h2
          id="faq-heading"
          className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 text-center mb-8 sm:mb-10"
        >
          {heading}
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-slate-200 bg-[#F8FAFC] open:bg-white open:shadow-sm transition-all"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 text-sm sm:text-base font-bold text-slate-900">
                {f.q}
                <span className="shrink-0 text-[#0052FF] text-xl leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 -mt-1 text-sm text-slate-600 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
