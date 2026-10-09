import { COMPANY } from "@/lib/legal/company";
import { policyHref } from "@/lib/legal/policies";
import {
  EntityDefinition,
  LegalDocument,
  LegalList,
  LegalSection,
  SupportContact,
  policyMetadata,
} from "@/components/legal/LegalDocument";

// Linked from the Google Play Data safety form as the "Delete account URL".
// Play requires the steps, what is deleted, and what is kept (and for how
// long). Keep it in line with complete_customer_deletion (migration 085).
export const metadata = policyMetadata("delete-account");

export default function DeleteAccountPage() {
  const { supportEmail } = COMPANY;
  return (
    <LegalDocument
      slug="delete-account"
      intro={
        <p>
          <EntityDefinition />. This page explains how to delete your account on the {COMPANY.brand} app (published on
          Google Play by {COMPANY.brand}) and what happens to your data when you do.
        </p>
      }
    >
      <LegalSection title="1. Request deletion in the app">
        <LegalList
          items={[
            <>Open the {COMPANY.brand} app and sign in with your mobile number.</>,
            <>
              Go to <strong>Profile → Account Privacy</strong>.
            </>,
            <>
              Tap <strong>Request deletion</strong>, add a reason if you like, and confirm with{" "}
              <strong>Send request</strong>.
            </>,
            "The screen then shows the status of your request (pending, approved or completed).",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Request deletion without the app">
        <p>
          If you no longer have the app, contact us{" "}
          {supportEmail ? (
            <>
              by email at{" "}
              <a
                className="underline"
                href={`mailto:${supportEmail}?subject=${encodeURIComponent("Delete my Gloceries account")}`}
              >
                {supportEmail}
              </a>{" "}
              with the subject &quot;Delete my Gloceries account&quot;
            </>
          ) : (
            <>
              through our <a className="underline" href={policyHref("contact")}>Contact Us</a> page
            </>
          )}{" "}
          and tell us the mobile number registered on your account. To protect your account, we confirm the request
          with that number before deleting anything.
        </p>
      </LegalSection>

      <LegalSection title="3. What happens next">
        <p>
          Our team reviews each request. Any order that is still being delivered, refund that is still being processed
          or open support ticket is completed first, so you do not lose money owed to you. Once the request is
          approved, you can no longer sign in or place orders, and the data below is removed.
        </p>
      </LegalSection>

      <LegalSection title="4. Data we delete">
        <LegalList
          items={[
            "Your name, date of birth and the mobile number linked to your account.",
            "Your sign-in identity, so the account can no longer be used.",
            "Push-notification tokens and registered devices.",
            "Your wishlist.",
            "Saved addresses, including map pins, landmarks, recipient names and phone numbers, for every address that was never used for an order.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Data we keep, and why">
        <LegalList
          items={[
            "Order, invoice, payment and refund records, including the delivery address used for each past order. Indian tax and accounting laws require us to keep these, for up to 8 years from the end of the financial year in which the order was placed. They are no longer linked to your name or phone number.",
            "Records we need to resolve a dispute, prevent fraud or meet a legal request, for as long as that need lasts.",
          ]}
        />
        <p>
          Data held by our payment gateway about a payment you made is governed by that gateway&apos;s own retention
          rules under RBI regulations.
        </p>
      </LegalSection>

      <LegalSection title="6. Questions">
        <p>
          For anything about deleting your data, reach us <SupportContact />. You can read more about how we handle
          personal information in our <a className="underline" href={policyHref("privacy")}>Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
