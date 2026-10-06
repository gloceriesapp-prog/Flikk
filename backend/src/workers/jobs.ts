import { runPromotions } from '../promotions/worker.js';
import { cleanupMedia } from '../media/cleanup.js';
import { runPushReceipts } from '../notifications/receipts.js';
import { pruneAuthBudgets } from '../customer-experience/authBudget.js';
import { pruneDeliveryCodes } from '../orders/deliveryCodes.js';
import { runOrderRefunds } from '../payments/orderRefunds.js';
import type { Jobs } from './runner.js';
import { runWeeklyPayoutJob, releasePendingPayouts } from '../jobs/weeklyPayouts.js';
import { runWeeklyRiderPayoutJob, releasePendingRiderPayouts } from '../jobs/weeklyRiderPayouts.js';
import { drainExpiredReservations } from '../jobs/expireUnpaidOrders.js';
import { expandDispatchOrRebroadcast } from '../lib/riderDispatch.js';
import { runTripRefunds } from '../payments/tripRefunds.js';
import { runCustomerNotifications } from '../notifications/worker.js';
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
  reservationExpiry: shouldStop => drainExpiredReservations(undefined,shouldStop),
  tripRefunds: runTripRefunds,
  orderRefunds: runOrderRefunds,
  deliveryCodes: pruneDeliveryCodes,
  authBudgets: pruneAuthBudgets,
  customerNotifications: runCustomerNotifications,
  pushReceipts: runPushReceipts,
  // Bounded release batches continue draining between weekly compute runs.
  payoutReleases: async () => { await releasePendingPayouts(); await releasePendingRiderPayouts(); },
};
