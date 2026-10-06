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

export const metadata = policyMetadata("shipping-policy");

export default function ShippingPolicyPage() {
  return (
    <LegalDocument
      slug="shipping-policy"
      intro={
        <p>
          <EntityDefinition />. {COMPANY.brand} delivers orders from local partner stores to your doorstep using local
          delivery riders. We do not ship by courier and do not deliver outside our service areas.
        </p>
      }
    >
      <LegalSection title="1. Where we deliver">
        <p>
          We currently deliver in selected areas of {COMPANY.region}. Each partner store delivers within its own
          delivery radius. The app shows only stores that can deliver to the map pin of your selected address, so if a
          store is visible to you at checkout, it delivers to you.
        </p>
      </LegalSection>

      <LegalSection title="2. Delivery time">
        <LegalList
          items={[
            "Orders are delivered the same day, usually within 30–60 minutes of the store accepting them.",
            "The estimated delivery time is shown before you order and on the tracking screen afterwards.",
            "Times can be longer during heavy demand, bad weather, or if the store takes longer to prepare your order. Delivery times are estimates, not guarantees.",
            "Orders can only be placed while the store is open; store hours are shown in the app.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Delivery charges">
        <LegalList
          items={[
            "A delivery fee and, where applicable, a small handling fee are shown on your bill before you pay.",
            "Orders above a minimum value may qualify for free delivery when that offer is active; the app shows how much more you need to add.",
            "A cart with items from more than one store is delivered in one trip with one combined delivery fee, which includes a small charge for each additional store pickup.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Tracking and handover">
        <LegalList
          items={[
            "You can follow your order from placed, to packed, to out for delivery, to delivered in the app.",
            "Your order has a delivery code shown in the app. Share it with the rider only when you receive your order — the rider needs it to complete the delivery.",
            "Please check your items at the door and report any problem through Help & Support.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. If delivery cannot be completed">
        <p>
          Make sure your address, landmark, map pin and phone number are correct and that someone is available to
          receive the order. If the rider cannot reach you or find the address, the delivery may be marked as failed.
          How failed deliveries are refunded is explained in our{" "}
          <a className="underline" href={policyHref("refund-policy")}>
            Cancellation &amp; Refund Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Questions">
        <p>
          For help with a delivery, reach us <SupportContact />.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
