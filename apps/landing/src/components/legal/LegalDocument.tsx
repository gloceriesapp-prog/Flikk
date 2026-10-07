import type { Metadata } from "next";
import type { ReactNode } from "react";
import { COMPANY } from "@/lib/legal/company";
import { POLICIES, policyHref, type PolicySlug } from "@/lib/legal/policies";

// Shared shell + typography for every legal page. Pages only supply their
// sections; title, effective date, entity line and spacing live here so all
// five documents read as one consistent set.

export function policyMetadata(slug: PolicySlug): Metadata {
  const policy = POLICIES[slug];
  return {
    title: policy.title,
    description: policy.description,
    alternates: { canonical: policyHref(slug) },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function LegalDocument({ slug, intro, children }: { slug: PolicySlug; intro?: ReactNode; children: ReactNode }) {
  const policy = POLICIES[slug];
  return (
    <article className="w-full bg-white py-14 sm:py-20">
      <div className="max-w-[760px] mx-auto px-6 flex flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-8">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">{policy.title}</h1>
          <p className="text-sm text-slate-500">Last updated: {formatDate(policy.lastUpdated)}</p>
          {intro && <div className="text-slate-600 leading-relaxed mt-2">{intro}</div>}
        </header>
        <div className="flex flex-col gap-10">{children}</div>
      </div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="flex flex-col gap-3 text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 flex flex-col gap-2 marker:text-slate-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// "Tideline Ventures Private Limited ("Gloceries", "we", "us")" — the
// definition every document opens with.
export function EntityDefinition() {
  return (
    <>
      {COMPANY.brand} is a technology platform owned and operated by <strong>{COMPANY.legalName}</strong> (&quot;
      {COMPANY.brand}&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;)
    </>
  );
}

export function SupportContact() {
  const { supportEmail, supportPhone } = COMPANY;
  if (!supportEmail && !supportPhone) {
    return (
      <>
        through Help &amp; Support in the {COMPANY.brand} app or our <a className="underline" href={policyHref("contact")}>Contact Us</a> page
      </>
    );
  }
  return (
    <>
      through Help &amp; Support in the {COMPANY.brand} app
      {supportEmail && (
        <>
          , by email at{" "}
          <a className="underline" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </>
      )}
      {supportPhone && (
        <>
          , or by phone at{" "}
          <a className="underline" href={`tel:${supportPhone}`}>
            {supportPhone}
          </a>
        </>
      )}
    </>
  );
}
