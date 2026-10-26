import { COMPANY } from "@/lib/legal/company";
import { policyHref } from "@/lib/legal/policies";
import { LegalDocument, LegalList, LegalSection, SupportContact, policyMetadata } from "@/components/legal/LegalDocument";

export const metadata = policyMetadata("delete-data");

export default function DeleteDataPage() {
  return (
    <LegalDocument slug="delete-data" intro={
      <p>You can ask {COMPANY.brand} support to delete specific personal data without closing your customer account.</p>
    }>
      <LegalSection title="1. Send your request to support">
        <LegalList items={[
          <>Contact us <SupportContact />. Use the subject <strong>Delete my Gloceries personal data</strong>.</>,
          "Tell us the mobile number linked to your account and which data you want removed, such as a saved address or optional profile details.",
          "Do not send passwords, OTPs, UPI PINs or card details. Our team will verify that the account belongs to you before making changes.",
        ]} />
      </LegalSection>
      <LegalSection title="2. What we can remove">
        <p>Support reviews your request and confirms which personal data can be removed while keeping your account active.
          You can also remove saved addresses and edit optional profile details in the app. The phone number needed to
          sign in remains linked to an active account.</p>
        <p>If you want to close the account and remove its sign-in identity too, follow the separate{" "}
          <a className="underline" href={policyHref("delete-account")}>account deletion steps</a>.</p>
      </LegalSection>
      <LegalSection title="3. Records we must retain">
        <p>Order, invoice, payment and refund records, including addresses used for past orders, may be retained for
          up to 8 years from the end of the financial year where Indian tax and accounting obligations require it.
          Records needed for an active delivery, refund, dispute, fraud prevention or legal request are retained
          for as long as that need lasts. These are the same retention exceptions described in our{" "}
          <a className="underline" href={policyHref("delete-account")}>account deletion policy</a>.</p>
      </LegalSection>
      <LegalSection title="4. Confirmation">
        <p>Our team confirms the outcome of your request and explains any data that must be retained. See our{" "}
          <a className="underline" href={policyHref("privacy")}>Privacy Policy</a> for how we handle personal data.</p>
      </LegalSection>
    </LegalDocument>
  );
}
