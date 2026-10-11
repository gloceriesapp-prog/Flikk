import type { ReactNode } from "react";
import { COMPANY } from "@/lib/legal/company";
import { LegalDocument, LegalSection, policyMetadata } from "@/components/legal/LegalDocument";

export const metadata = policyMetadata("contact");

// Renders only details that are actually configured (see lib/legal/company.ts)
// — a missing value hides its row instead of showing a placeholder.
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-6 py-3 border-b border-slate-100 last:border-0">
      <dt className="sm:w-48 shrink-0 text-sm font-semibold text-slate-900">{label}</dt>
      <dd className="text-slate-600">{children}</dd>
    </div>
  );
}

export default function ContactPage() {
  const { supportEmail, supportPhone, supportHours, registeredAddress, cin, gstin, grievanceOfficer } = COMPANY;
  return (
    <LegalDocument
      slug="contact"
      intro={
        <p>
          The fastest way to get help with an order is <strong>Help &amp; Support</strong> in the {COMPANY.brand} app —
          pick the order and the issue, and our team replies in the same conversation.
        </p>
      }
    >
      <LegalSection title="Customer support">
        <dl>
          {supportEmail && (
            <DetailRow label="Email">
              <a className="underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </DetailRow>
          )}
          {supportPhone && (
            <DetailRow label="Phone">
              <a className="underline" href={`tel:${supportPhone}`}>
                {supportPhone}
              </a>
            </DetailRow>
          )}
          {supportHours && <DetailRow label="Support hours">{supportHours}</DetailRow>}
          <DetailRow label="In the app">Profile → Help &amp; Support</DetailRow>
        </dl>
      </LegalSection>

      {(grievanceOfficer.name || grievanceOfficer.email) && (
        <LegalSection title="Grievance officer">
          <dl>
            {grievanceOfficer.name && <DetailRow label="Name">{grievanceOfficer.name}</DetailRow>}
            {grievanceOfficer.email && (
              <DetailRow label="Email">
                <a className="underline" href={`mailto:${grievanceOfficer.email}`}>
                  {grievanceOfficer.email}
                </a>
              </DetailRow>
            )}
          </dl>
          <p>Grievances are acknowledged within 48 hours and resolved within one month.</p>
        </LegalSection>
      )}

      <LegalSection title="Company details">
        <dl>
          {COMPANY.legalName && <DetailRow label="Legal name">{COMPANY.legalName}</DetailRow>}
          <DetailRow label="Brand">{COMPANY.brand}</DetailRow>
          {registeredAddress && <DetailRow label="Registered address">{registeredAddress}</DetailRow>}
          {cin && <DetailRow label="CIN">{cin}</DetailRow>}
          {gstin && <DetailRow label="GSTIN">{gstin}</DetailRow>}
          <DetailRow label="Website">
            <a className="underline" href={COMPANY.website}>
              {COMPANY.website.replace(/^https?:\/\//, "")}
            </a>
          </DetailRow>
        </dl>
      </LegalSection>

      <LegalSection title="Store owners and riders">
        <p>
          Want to list your store or deliver with us? See{" "}
          <a className="underline" href="/partner">
            Partner with us
          </a>{" "}
          or{" "}
          <a className="underline" href="/rider">
            Become a rider
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
