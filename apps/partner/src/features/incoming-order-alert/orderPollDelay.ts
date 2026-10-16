// Jitter distributes reconnects across devices; outages cap at two minutes.
export function orderPollDelay(failures: number, random = Math.random()): number {
  return Math.min(120_000, Math.round(12_000 * 2 ** Math.min(4, Math.max(0, failures)) * (0.85 + Math.max(0, Math.min(1, random)) * 0.3)));
}
