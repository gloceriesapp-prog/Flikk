// "Store is packing · ready in ~N min", kept current while on screen (ticks
// every 30 s like useElapsedMs). utils/storePacking.ts has the wording.

import { useEffect, useState } from 'react';
import { packingLabel } from '../utils/storePacking';

export function usePackingLabel(readyAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return packingLabel(readyAt, now);
}
