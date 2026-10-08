import { runPromotions } from '../promotions/worker.js';
import { cleanupMedia } from '../media/cleanup.js';
import { runPushReceipts } from '../notifications/receipts.js';
import { pruneAuthBudgets } from '../customer-experience/authBudget.js';
import { pruneDeliveryCodes } from '../orders/deliveryCodes.js';
import { runOrderRefunds } from '../payments/orderRefunds.js';
import type { Jobs } from './runner.js';
import { runWeeklyPayoutJob } from '../jobs/weeklyPayouts.js';
import { runWeeklyRiderPayoutJob } from '../jobs/weeklyRiderPayouts.js';
import { runReservationExpiry } from '../jobs/expireUnpaidOrders.js';
import { paymentsConfigured } from '../payments/cashfreeClient.js';
import { expandDispatchOrRebroadcast } from '../lib/riderDispatch.js';
import { runTripRefunds } from '../payments/tripRefunds.js';
import { runCustomerNotifications } from '../notifications/worker.js';
import { runStoreNoResponse } from '../jobs/storeNoResponse.js';
export const jobs: Jobs = {
  weeklyPayouts: (date, guard) => runWeeklyPayoutJob(date, guard),
  weeklyRiderPayouts: (date, guard) => runWeeklyRiderPayoutJob(date, guard),
  riderDispatch: (_date, guard) => expandDispatchOrRebroadcast(new Date(), guard),
};

// These are item-claimed queues, not singleton schedules. Worker replicas
// can drain disjoint batches concurrently without a global scheduler lock.
export const queues: Record<string, (shouldStop: () => boolean) => Promise<unknown>> = {
  promotions: runPromotions,
  mediaCleanup: cleanupMedia,
  // Provider reconciliation runs first so expiry never releases a paid checkout.
  reservationExpiry: runReservationExpiry,
  // Orders a store never answered within delivery_settings' response window.
  storeNoResponse: (shouldStop) => runStoreNoResponse(shouldStop),
  // Refund jobs only exist after a real payment; without keys they would
  // lease and fail every poll, so they wait until Cashfree is configured.
  tripRefunds: async () => { if (paymentsConfigured) await runTripRefunds(); },
  orderRefunds: async () => { if (paymentsConfigured) await runOrderRefunds(); },
  deliveryCodes: pruneDeliveryCodes,
  authBudgets: pruneAuthBudgets,
  customerNotifications: runCustomerNotifications,
  pushReceipts: runPushReceipts,
};
