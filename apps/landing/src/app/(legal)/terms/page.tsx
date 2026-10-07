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

export const metadata = policyMetadata("terms");

export default function TermsPage() {
  return (
    <LegalDocument
      slug="terms"
      intro={
        <p>
          <EntityDefinition />. These terms apply when you use the {COMPANY.brand} apps or website. By creating an
          account or placing an order you agree to them. If you do not agree, please do not use the platform.
        </p>
      }
    >
      <LegalSection title="1. What Gloceries is">
        <p>
          {COMPANY.brand} is an online marketplace that connects customers with independent local stores
          (&quot;partner stores&quot;) such as kirana, grocery and pharmacy stores, and with delivery riders who carry
          orders from those stores to customers. {COMPANY.brand} does not own inventory and does not itself sell the
          products listed. Each product is sold to you by the partner store that lists it, and that store is the seller
          of record. We act as a facilitator of the transaction under the Consumer Protection (E-Commerce) Rules, 2020.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <LegalList
          items={[
            "You must be at least 18 years old and able to enter a binding contract.",
            "You sign in with your mobile number and a one-time password. Keep your phone and OTPs private; you are responsible for activity on your account.",
            "Information you give us, including delivery addresses and map pins, must be accurate.",
            "We may suspend or close accounts used for fraud, abuse of offers or refunds, harassment of store staff or riders, or any unlawful purpose.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Products, prices and availability">
        <LegalList
          items={[
            "Products, prices, stock and images are provided by partner stores and can differ between stores and change at any time.",
            "The price you pay is the price shown at checkout and locked when your order is placed. It will not change after that, even if the store later changes its price.",
            "Product images are for reference; actual packaging may vary. Weights of loose items such as fruits and vegetables may vary slightly.",
            "A store may be unable to fulfil an item that has run out. If so, the order or item is cancelled and refunded as described in our Cancellation & Refund Policy.",
            "Prescription-only medicines are not sold through the platform unless the partner pharmacy verifies a valid prescription as required by law.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Orders and charges">
        <LegalList
          items={[
            "Your order is a request to buy from the partner store. It is confirmed when the store accepts and packs it.",
            "A cart can contain items from more than one store. Each store fulfils its own part, but the order is paid for and delivered together as one trip.",
            "Your bill shows the item total, delivery fee, any handling fee, any discount and the final amount payable before you pay. All charges are inclusive of applicable taxes unless stated otherwise.",
            "Promo codes are subject to their own conditions, cannot be exchanged for cash and may be withdrawn at any time.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Payments">
        <p>
          You can pay online (UPI, cards, net banking or wallets) through our RBI-authorised payment gateway, or by cash
          on delivery where available. We do not store your card details, UPI PIN or banking passwords. An online order
          that is not paid within 20 minutes of placing it is cancelled automatically. If a payment is captured after
          that, it is refunded automatically.
        </p>
      </LegalSection>

      <LegalSection title="6. Delivery">
        <p>
          Delivery areas, charges, timelines and the delivery code handover are described in our{" "}
          <a className="underline" href={policyHref("shipping-policy")}>
            Delivery &amp; Shipping Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Cancellations and refunds">
        <p>
          When you can cancel, and how and when refunds are made, is described in our{" "}
          <a className="underline" href={policyHref("refund-policy")}>
            Cancellation &amp; Refund Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Ratings and reviews">
        <p>
          Reviews must be honest and about your own order. Do not post content that is false, abusive, obscene,
          infringes anyone&apos;s rights or reveals someone else&apos;s personal information. We may remove reviews that
          break these rules. Stores may reply publicly to reviews.
        </p>
      </LegalSection>

      <LegalSection title="9. Acceptable use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "copy, scrape or resell platform content or data;",
            "interfere with the security or operation of the apps or servers;",
            "place orders you do not intend to accept, or misuse cash on delivery;",
            "use the platform to buy or sell anything prohibited by law.",
          ]}
        />
      </LegalSection>

      <LegalSection title="10. Liability">
        <p>
          The partner store is responsible for the quality, safety, labelling, expiry and legal compliance of the
          products it sells. {COMPANY.brand} is responsible for operating the platform with reasonable care and for
          resolving your complaints through our support process. To the extent permitted by law, our total liability for
          any order is limited to the amount you paid for that order. Nothing in these terms limits rights you have under
          the Consumer Protection Act, 2019.
        </p>
      </LegalSection>

      <LegalSection title="11. Intellectual property">
        <p>
          The {COMPANY.brand} name, logo, apps and website are owned by {COMPANY.legalName}. Product names and brands
          belong to their respective owners.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes, governing law and disputes">
        <p>
          We may update these terms; the &quot;Last updated&quot; date shows the current version, and continued use
          after a change means you accept it. These terms are governed by the laws of India. Subject to your rights as a
          consumer, courts at {COMPANY.jurisdiction} have jurisdiction over any dispute.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact and grievances">
        <p>
          For questions or complaints, reach us <SupportContact />. Details of our Grievance Officer are in our{" "}
          <a className="underline" href={policyHref("privacy")}>
            Privacy Policy
          </a>{" "}
          and on our{" "}
          <a className="underline" href={policyHref("contact")}>
            Contact Us
          </a>{" "}
          page.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
