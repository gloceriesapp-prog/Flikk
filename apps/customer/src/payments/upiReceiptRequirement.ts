import type { PaymentMethod } from './paymentMethod';
import { assertIosUpiConfigured, usesIosUpiCheckout } from './iosUpiCheckout';
import { assertDirectUpiConfigured } from './upiIntent';

// Cart and saved-order recovery must apply the same merchant capability.
// This also checks gateway availability and native support before order creation.
export async function requiresUpiReceiptEmail(method: PaymentMethod): Promise<boolean> {
  if (usesIosUpiCheckout(method)) {
    return !(await assertIosUpiConfigured(method)).emailOptional;
  }
  return (await assertDirectUpiConfigured(method)).upi_email_optional !== true;
}
