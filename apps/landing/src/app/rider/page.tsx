import type { Metadata } from "next";
import RiderNavbar from "@/components/navbar/RiderNavbar";
import Footer from "@/components/footer/Footer";
import FaqSection from "@/components/faq/FaqSection";
import { SITE } from "@/lib/seo/config";

// Rider recruitment page. Own navbar (RiderNavbar), premium dark hero, then
// light sections mirroring the /partner recruitment template.
// ponytail: rider app store links are separate placeholders from SITE's
// customer-app links — swap ids when the rider listings exist.
const RIDER_ANDROID = "https://play.google.com/store/apps/details?id=com.gloceries.rider";
const RIDER_IOS = "https://apps.apple.com/app/gloceries-rider/id000000000";

export const metadata: Metadata = {
  title: "Become a Delivery Rider — Earn on Your Schedule with Gloceries",
  description:
    "Deliver for Gloceries in coastal Karnataka. Flexible hours, weekly payouts, earn per delivery plus incentives, and pick up orders near you. Download the rider app and start earning.",
  alternates: { canonical: "/rider" },
};

const STATS = [
  { value: "Weekly", label: "Payouts to your bank" },
  { value: "Flexible", label: "Ride when you want" },
  { value: "Near you", label: "Pickups close to home" },
  { value: "Per order", label: "Earn + trip incentives" },
];

const BENEFITS = [
  { icon: "🕒", title: "Your hours, your call", body: "Go online when it suits you and offline when it doesn't. No fixed shifts, no minimum login — ride around your day." },
  { icon: "💰", title: "Weekly payouts", body: "Earnings settle to your bank account every week with a clear statement of every delivery. No cash chasing." },
  { icon: "📍", title: "Orders near you", body: "See pickups close to where you are. We match you to the nearest store, so less dead mileage between drops." },
  { icon: "🛵", title: "Earn per delivery + more", body: "A base fee on every delivery, extra for multi-stop trips, plus incentives when demand is high." },
  { icon: "🗺️", title: "In-app navigation", body: "Clear pickup and drop steps with live map guidance on the final leg — you always know where to go next." },
  { icon: "🤝", title: "Real support", body: "A local team behind you, not a faceless call centre. Built for riders working in our launch zone." },
];

const STEPS = [
  { n: "01", title: "Download the rider app", body: "Get the Gloceries rider app on Android or iPhone and sign up with your phone number." },
  { n: "02", title: "Upload your documents", body: "Add your ID, driving licence and vehicle details. Takes a few minutes from your phone." },
  { n: "03", title: "Get verified", body: "We verify your details and approve you for the launch zone. You'll be notified in the app." },
  { n: "04", title: "Go online and earn", body: "Turn on availability, accept nearby pickups, deliver, and get paid weekly." },
];

const REQUIREMENTS = [
  { icon: "🎂", label: "18 years or older" },
  { icon: "🛵", label: "Two-wheeler + valid licence" },
  { icon: "📱", label: "Android or iPhone smartphone" },
  { icon: "🪪", label: "Government ID for verification" },
  { icon: "🏦", label: "Bank account for weekly payouts" },
  { icon: "📍", label: "Available in coastal Karnataka" },
];

const RIDER_FAQS = [
  { q: "How much can I earn as a Gloceries rider?", a: "You earn a base fee on every delivery, extra for multi-stop trips that cover more than one store, plus incentives during high-demand periods. Payouts settle to your bank account weekly with a clear statement." },
  { q: "Do I have to work fixed hours?", a: "No. You choose when to go online and offline in the app — there are no fixed shifts and no minimum login time. Ride when it suits you." },
  { q: "What do I need to start riding?", a: "You need to be 18 or older, own a two-wheeler with a valid driving licence, have a smartphone, a government ID for verification, and a bank account for payouts." },
  { q: "When and how do I get paid?", a: "Earnings for the week settle to your registered bank account weekly, with a statement showing every delivery and what you earned." },
  { q: "Where can I ride right now?", a: `Gloceries is rolling out across ${SITE.region}, starting in the Kaup and outer Udupi area. Download the rider app to check if we're live near you.` },
  { q: "How do I get orders?", a: "Once you're online, the app shows pickups near you and pings you when a nearby store has a packed order ready. Accept it and the app guides you through pickup and drop." },
];

export default function RiderPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <RiderNavbar appUrl={RIDER_ANDROID} />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#050A15_0%,#0A1120_45%,#0E2417_100%)] text-white">
          <div className="pointer-events-none absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#A8D93A] opacity-[0.18] blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-28 right-[4%] h-[380px] w-[380px] rounded-full bg-[#7CB518] opacity-[0.14] blur-[120px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 text-[12px] font-semibold bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A8D93A]" />
                Now hiring riders in {SITE.region}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold leading-[1.05] tracking-tight">
                Ride with Gloceries.{" "}
                <span className="bg-gradient-to-r from-[#A8D93A] to-[#7CB518] bg-clip-text text-transparent">
                  Earn on your schedule.
                </span>
              </h1>

              <p className="text-[15px] sm:text-lg text-slate-300 leading-relaxed max-w-[520px]">
                Deliver groceries from local stores to customers near you. Flexible
                hours, weekly payouts, and pickups close to home — no fixed shifts,
                no boss watching the clock.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="#download"
                  className="inline-flex items-center justify-center gap-2 bg-[#A8D93A] text-[#101C10] px-6 py-3.5 rounded-xl font-semibold text-[15px] hover:bg-[#7CB518] transition-colors"
                >
                  Download rider app
                </a>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3.5 rounded-xl font-semibold text-[15px] hover:bg-white/10 transition-colors"
                >
                  How it works
                </a>
              </div>
            </div>

            {/* Stat panel */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm px-5 py-6 flex flex-col gap-1"
                >
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white tabular-nums">
                    {s.value}
                  </span>
                  <span className="text-[13px] font-medium text-slate-400 leading-snug">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EARNINGS */}
        <section id="earnings" className="w-full bg-white py-16 sm:py-20">
          <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl sm:text-[38px] font-semibold text-[#0F172A] tracking-tight leading-tight">
                Straightforward earnings, paid weekly
              </h2>
              <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-[520px]">
                No confusing formulas. You earn a base fee on every delivery, extra
                when a trip covers more than one store, and incentives when demand is
                high — all settled to your bank each week with a clear statement.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { k: "Base fee", v: "On every delivery you complete." },
                { k: "Multi-stop", v: "Extra pay for trips across more than one store." },
                { k: "Incentives", v: "Earn more during busy, high-demand hours." },
              ].map((c) => (
                <div
                  key={c.k}
                  className="rounded-2xl border border-slate-200 bg-[#F6FAF0] p-5 flex flex-col gap-2"
                >
                  <span className="text-[15px] font-semibold text-[#101C10]">{c.k}</span>
                  <span className="text-[13.5px] text-slate-600 leading-snug">{c.v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="w-full bg-[#F8FAFC] py-16 sm:py-20 border-y border-slate-100">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-10">
            <div className="flex flex-col gap-3 max-w-[640px]">
              <h2 className="text-3xl sm:text-[38px] font-semibold text-[#0F172A] tracking-tight leading-tight">
                Why ride with Gloceries
              </h2>
              <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed">
                Built for riders working in tier-2 and tier-3 towns — not a big-city
                gig platform bolted onto your area.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="rounded-3xl bg-white border border-slate-200/80 p-6 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 transition-all"
                >
                  <span className="text-3xl">{b.icon}</span>
                  <h3 className="text-[17px] font-semibold text-[#0F172A] tracking-tight">
                    {b.title}
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="w-full bg-white py-16 sm:py-20">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-10">
            <div className="flex flex-col gap-3 max-w-[640px]">
              <h2 className="text-3xl sm:text-[38px] font-semibold text-[#0F172A] tracking-tight leading-tight">
                Start riding in four steps
              </h2>
              <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed">
                From download to your first payout — the whole thing happens in the app.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="rounded-3xl border border-slate-200/80 p-6 flex flex-col gap-3"
                >
                  <span className="text-[28px] font-semibold text-[#A8D93A] tabular-nums">
                    {s.n}
                  </span>
                  <h3 className="text-[17px] font-semibold text-[#0F172A] tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REQUIREMENTS */}
        <section id="requirements" className="w-full bg-[#F8FAFC] py-16 sm:py-20 border-y border-slate-100">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col gap-10">
            <div className="flex flex-col gap-3 max-w-[640px]">
              <h2 className="text-3xl sm:text-[38px] font-semibold text-[#0F172A] tracking-tight leading-tight">
                What you need to sign up
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {REQUIREMENTS.map((r) => (
                <div
                  key={r.label}
                  className="rounded-2xl bg-white border border-slate-200/80 px-5 py-5 flex items-center gap-3"
                >
                  <span className="text-2xl shrink-0">{r.icon}</span>
                  <span className="text-[14px] sm:text-[15px] font-medium text-[#0F172A] leading-snug">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DOWNLOAD BAND */}
        <section
          id="download"
          className="relative overflow-hidden bg-[linear-gradient(135deg,#050A15_0%,#0A1120_45%,#0E2417_100%)] text-white"
        >
          <div className="pointer-events-none absolute -top-20 right-[10%] h-[320px] w-[320px] rounded-full bg-[#A8D93A] opacity-[0.16] blur-[110px]" />
          <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-16 sm:py-20 flex flex-col items-center text-center gap-6">
            <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight leading-tight max-w-[640px]">
              Get the Gloceries rider app and start earning
            </h2>
            <p className="text-[15px] sm:text-lg text-slate-300 leading-relaxed max-w-[520px]">
              Download, upload your documents, and go online. Your next delivery could
              be around the corner.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={RIDER_ANDROID}
                className="inline-flex items-center gap-2.5 bg-white text-[#0F172A] px-5 py-3 rounded-2xl"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z" />
                  <path fill="#34A853" d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z" />
                  <path fill="#FBBC04" d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z" />
                  <path fill="#EA4335" d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium tracking-tight opacity-70">Get it on</span>
                  <span className="text-[15px] font-medium tracking-tight -mt-0.5">Google Play</span>
                </div>
              </a>
              <a
                href={RIDER_IOS}
                className="inline-flex items-center gap-2.5 bg-white text-[#0F172A] px-5 py-3 rounded-2xl"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium tracking-tight opacity-70">Download on the</span>
                  <span className="text-[15px] font-medium tracking-tight -mt-0.5">App Store</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <div id="faq">
          <FaqSection faqs={RIDER_FAQS} heading="Riding with Gloceries — FAQs" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
