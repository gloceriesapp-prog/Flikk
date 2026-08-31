// Pure math for Home's PerformanceRow — kept separate from the component
// so the scoring logic has one place to live/test, not buried inside JSX.
// All mock-derived (customerRating/status off data/mockOrders.ts's own
// generators), same as everything else in this app until a real backend
// exists to compute these server-side.

import type { RiderOrder } from '../data/mockOrders';

export type PerformanceLabel = 'Excellent' | 'Good' | 'Needs work';

export interface PerformanceStats {
  averageRating: number;
  ratingCount: number;
  completionRate: number;
  totalAttempted: number;
  performanceScore: number;
  performanceLabel: PerformanceLabel;
}

// New-rider default is a perfect 5.00, not 0 — same convention every real
// gig app uses (nobody starts "penalized" before their first rated
// delivery); only pulls the number down once real ratings exist.
const DEFAULT_RATING = 5;

function average(numbers: number[]): number {
  if (numbers.length === 0) return DEFAULT_RATING;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function scoreLabel(score: number): PerformanceLabel {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  return 'Needs work';
}

export function computePerformanceStats(completedOrders: RiderOrder[], cancelledOrders: RiderOrder[]): PerformanceStats {
  const ratings = completedOrders.map((order) => order.customerRating).filter((rating): rating is number => rating != null);
  const averageRating = average(ratings);

  const totalAttempted = completedOrders.length + cancelledOrders.length;
  // No orders attempted yet = nothing to have failed at — 100%, not 0%.
  const completionRate = totalAttempted === 0 ? 1 : completedOrders.length / totalAttempted;

  // Weighted blend: rating carries more weight than raw completion rate —
  // a rider who completes everything but delivers poorly shouldn't score
  // as well as one who's both reliable and well-rated.
  const performanceScore = Number((averageRating * 0.7 + completionRate * 5 * 0.3).toFixed(2));

  return {
    averageRating: Number(averageRating.toFixed(2)),
    ratingCount: ratings.length,
    completionRate: Math.round(completionRate * 100),
    totalAttempted,
    performanceScore,
    performanceLabel: scoreLabel(performanceScore),
  };
}
