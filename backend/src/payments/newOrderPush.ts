import type { OrderIdBody } from './types.js';

// Compatibility hook for checkout/settlement callers. Migration
// 20261014163241 records merchant alerts in the same transaction that makes
// an order visible. Sending here would race the durable worker and duplicate
// alerts; provider availability must never determine checkout success.
export async function notifyStoresOfNewOrder(_target: OrderIdBody): Promise<void> {
  // Intentionally no network side effect. The durable worker drains the outbox.
}
