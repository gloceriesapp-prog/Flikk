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

export const metadata = policyMetadata("privacy");

export default function PrivacyPage() {
  const { grievanceOfficer } = COMPANY;
  return (
    <LegalDocument
      slug="privacy"
      intro={
        <p>
          <EntityDefinition />. This policy explains what personal information we collect through the {COMPANY.brand}{" "}
          customer, partner and rider apps and this website, why we collect it, who we share it with, and the choices
          you have. It is published in accordance with the Information Technology Act, 2000, the rules made under it,
          and the Digital Personal Data Protection Act, 2023.
        </p>
      }
    >
      <LegalSection title="1. Information we collect">
        <p>
          <strong>Customers</strong>
        </p>
        <LegalList
          items={[
            "Customer account details: your mobile number (used for OTP sign-in) and name. The customer app does not request a date of birth.",
            "Delivery addresses: address text, landmark, recipient name and phone, and the map pin you place for each saved address.",
            "Location: your precise foreground device location, when you allow it, to find nearby stores and place your delivery pin. You can select the pin manually instead. The customer app does not collect location in the background.",
            "Orders: items, prices, stores, delivery status, cancellations, refunds, ratings, reviews, wishlists and shopping lists.",
            "Payments: payment method type and the payment and refund reference IDs from our payment gateway. We never receive or store your full card number, CVV, UPI PIN or net-banking password.",
            "Customer support: email you choose to send to hello@gloceries.com. The customer app opens your email app and does not create in-app support conversations. Email correspondence is handled in our support mailbox. Partner and rider apps continue to offer in-app support.",
            "Device data: push-notification token, app version, device model and crash diagnostics.",
            "Voice input: if you use voice search, your device's speech service converts speech to text; we receive only the resulting search text.",
          ]}
        />
        <p>
          <strong>Store partners</strong> additionally provide owner name, store address and location, store photos,
          business documents (such as PAN, GSTIN, FSSAI licence and shop establishment number) and payout account
          details (UPI ID or bank account and IFSC).
        </p>
        <p>
          <strong>Delivery riders</strong> additionally provide identity and vehicle documents (such as Aadhaar,
          driving licence and vehicle number), a profile photo, emergency contact, payout account details, and precise
          location while they are online and on a delivery.
        </p>
        <p>
          <strong>Rider location in the background.</strong> With the rider&apos;s permission, the Gloceries Rider app
          collects precise location <strong>even when the app is closed or not in use</strong>, but only while the
          rider is online. We use it to send nearby delivery offers, assign orders to the closest rider and show
          customers and stores where their order is. Collection stops when the rider goes offline, and riders can
          turn the permission off in their phone settings at any time. The app shows a notification whenever it is
          sharing location in the background.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use your information">
        <LegalList
          items={[
            "To create and secure your account and verify you by OTP.",
            "To show stores and products available at your location, take orders and pass them to the partner store and the assigned rider.",
            "To process payments, refunds and weekly payouts to store partners and riders.",
            "To send order updates and service notifications. Promotional messages are sent only where you have agreed, and you can opt out at any time.",
            "To resolve support requests, prevent fraud and abuse, and keep the platform secure.",
            "To verify store partners and riders before they are approved on the platform.",
            "To understand and improve app performance, using diagnostics that do not identify you by name.",
            "To meet legal, tax and regulatory obligations.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Who we share it with">
        <p>We do not sell your personal information. We share only what each party needs to do its part:</p>
        <LegalList
          items={[
            "The partner store fulfilling your order receives your order items and the name associated with the order.",
            "The assigned rider receives your exact delivery address, map pin, recipient name and phone number while delivering your order. Riders considering a delivery offer see only an approximate delivery area. Finished-order rider history hides the exact delivery address and phone number.",
            "Customers see the assigned rider's name, phone number and delivery count while an order is in progress.",
            "Service providers that run the platform for us under contract: cloud database and authentication hosting, image storage and delivery, payment processing (Razorpay), SMS and push-notification delivery, maps and address lookup, and crash reporting.",
            "Google Maps and our address-lookup providers process map and geocoding requests. Google Maps also collects SDK diagnostics and identifiers under Google’s privacy terms; map data is not limited to sharing with a rider.",
            "Government authorities or law enforcement when required by law or a valid legal request.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. How long we keep it">
        <p>
          We keep account information while your account is active. Order, payment and invoice records are kept for as
          long as Indian tax and accounting laws require, even after an account is deleted. Identity and business
          documents of store partners and riders are kept while they are active on the platform and for the period
          required for legal and audit purposes afterwards.
        </p>
      </LegalSection>

      <LegalSection title="5. How we protect it">
        <p>
          Data is encrypted in transit. Access to personal data is restricted by role, so customers, store partners and
          riders can only see information related to their own orders. Identity and business documents are stored in
          private storage that is not publicly accessible. No method of storage or transmission is completely secure,
          but we work to protect your information and will notify you and the authorities of a personal-data breach as
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights and choices">
        <LegalList
          items={[
            "Access and correct your profile and addresses in the app at any time.",
            "Turn off location access or notifications in your device settings. Some features, such as finding stores near you, need location to work.",
            "Withdraw consent for promotional messages at any time.",
            <>Request deletion of your account in the app (customers: Profile → Account Privacy; riders: Profile → Delete account) or as described on our <a className="underline" href={policyHref("delete-account")}>Delete account</a> page. Deletion requests are reviewed and completed, except for records we must keep by law.</>,
            <>Request deletion of specific personal data while keeping your account through our <a className="underline" href={policyHref("delete-data")}>data deletion support process</a>. Records required for legal obligations are retained as described above.</>,
            "Raise a grievance with our Grievance Officer (below).",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Children">
        <p>
          {COMPANY.brand} is intended for users aged 18 and above. We do not knowingly collect personal information from
          children. If you believe a child has provided us information, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to this policy">
        <p>
          We may update this policy as our services change. The &quot;Last updated&quot; date above shows the latest
          version. For significant changes we will notify you in the app before they take effect.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact and grievance officer">
        <p>
          For privacy questions, reach us <SupportContact />.
        </p>
        {(grievanceOfficer.name || grievanceOfficer.email) && (
          <p>
            Grievance Officer{grievanceOfficer.name && <>: {grievanceOfficer.name}</>}
            {grievanceOfficer.email && (
              <>
                {" "}
                —{" "}
                <a className="underline" href={`mailto:${grievanceOfficer.email}`}>
                  {grievanceOfficer.email}
                </a>
              </>
            )}
            . We acknowledge grievances within 48 hours and aim to resolve them within 30 days.
          </p>
        )}
        {COMPANY.registeredAddress && (
          <p>
            {COMPANY.legalName ?? COMPANY.brand}, {COMPANY.registeredAddress}
          </p>
        )}
      </LegalSection>
    </LegalDocument>
  );
}
