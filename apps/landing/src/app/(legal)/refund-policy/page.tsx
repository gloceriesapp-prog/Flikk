import { COMPANY } from "@/lib/legal/company";
import {
  EntityDefinition,
  LegalDocument,
  LegalList,
  LegalSection,
  SupportContact,
  policyMetadata,
} from "@/components/legal/LegalDocument";

export const metadata = policyMetadata("refund-policy");

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      slug="refund-policy"
      intro={
        <p>
          <EntityDefinition />. This policy explains when an order placed on {COMPANY.brand} can be cancelled and how
          refunds are made.
        </p>
      }
    >
      <LegalSection title="1. Cancelling an order">
        <LegalList
          items={[
            "You can cancel an order from the order tracking screen in the app while the store is still preparing it, up until a rider picks it up from the store.",
            "Once a rider has picked up the order, it can no longer be cancelled.",
            "If your cart included more than one store, the order is cancelled for all stores together, because it was paid for as one trip.",
            "There is no cancellation fee when you cancel before pickup.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. When an order is cancelled for you">
        <LegalList
          items={[
            "The store cannot fulfil it, for example because items are out of stock or the store is closing.",
            "No rider is able to take the order.",
            "An online payment is not completed within 20 minutes of placing the order.",
          ]}
        />
        <p>In each of these cases you are not charged, and any amount already paid is refunded in full.</p>
      </LegalSection>

      <LegalSection title="3. Refunds">
        <LegalList
          items={[
            "Refunds for online payments go back to the original payment method — the same UPI account, card, bank account or wallet you paid with.",
            "A cancelled order is refunded in full, including the delivery fee and any handling fee.",
            "We start the refund as soon as the cancellation is confirmed. Banks usually credit it within 5–7 business days; UPI refunds are often faster.",
            "You can follow the status of every refund under My Refunds in the app.",
            "Cash on delivery orders cancelled before delivery have nothing to refund, because no payment was taken.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Missing, wrong, damaged or expired items">
        <p>
          Check your order at handover. If an item is missing, wrong, damaged or past its expiry date, raise it through
          Help &amp; Support in the app, choosing the order, within 48 hours of delivery. Photos help us resolve it
          faster. After review, we refund the affected items to your original payment method (or to your bank or UPI
          account for cash on delivery orders).
        </p>
        <p>
          Perishable items such as fruits, vegetables, dairy, bread, meat and fish cannot be returned for change of mind,
          but are covered for quality issues reported at delivery or shortly after.
        </p>
      </LegalSection>

      <LegalSection title="5. Failed deliveries">
        <p>
          If a rider cannot complete delivery after pickup — for example the address is wrong or you cannot be reached —
          the order is marked as failed. We review each failed delivery. Where the failure was not caused by you, the
          full amount is refunded. Where it was caused by an incorrect address or no response, we may deduct the delivery
          fee before refunding the rest.
        </p>
      </LegalSection>

      <LegalSection title="6. Need help?">
        <p>
          For any question about a cancellation or refund, reach us <SupportContact />.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
