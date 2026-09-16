'use client';

// Sits under the Revenue card in the left column — mirrors that column's
// "one hero metric, one supporting list" shape. Combines the two things a
// store owner actually needs to act on: what's selling (restock it before
// it runs out) and what's already out of stock (fix it now). Height is
// `h-full`, not a guessed fixed px — the grid row it shares with Recent
// orders stretches both cards to the same (taller sibling's) height by
// default, so they always line up regardless of row count in either.
// Anything that doesn't fit scrolls inside the card instead of growing it.

import { AlertTriangle } from 'lucide-react';

export interface TopSellingItem {
  name: string;
  unitsSold: number;
  imageUrl: string | null;
}

export interface OutOfStockItem {
  name: string;
  imageUrl: string | null;
}

interface Props {
  topSelling: TopSellingItem[];
  outOfStock: OutOfStockItem[];
}

type Row = { key: string; imageUrl: string; name: string; badge: string; badgeClassName: string };

// Real product photo when we have one; otherwise a deterministic (same
// product name -> same image every render) placeholder photo, per the
// explicit "add a random image" ask — same real-image-first fallback
// pattern ItemAvatars uses for order items.
function photoFor(name: string, imageUrl: string | null): string {
  return imageUrl ?? `https://picsum.photos/seed/${encodeURIComponent(name)}/64`;
}

export function InventoryAlertCard({ topSelling, outOfStock }: Props) {
  const rows: Row[] = [
    ...outOfStock.map((item, i) => ({
      key: `oos-${i}`,
      imageUrl: photoFor(item.name, item.imageUrl),
      name: item.name,
      badge: 'Out of stock',
      badgeClassName: 'bg-red-50 text-red-600',
    })),
    ...topSelling.map((item, i) => ({
      key: `top-${i}`,
      imageUrl: photoFor(item.name, item.imageUrl),
      name: item.name,
      badge: `${item.unitsSold} sold`,
      badgeClassName: 'bg-emerald-50 text-emerald-600',
    })),
  ];

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle size={16} />
        </div>
        <div>
          <p className="text-base font-semibold text-black">Inventory alert</p>
          <p className="text-xs text-neutral-400">Best sellers & out of stock</p>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="pt-6 text-center text-sm text-neutral-400">No inventory signals yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2 rounded-xl px-1.5 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.imageUrl}
                    alt={row.name}
                    className="h-9 w-9 shrink-0 rounded-lg border border-neutral-100 object-cover"
                  />
                  <p className="truncate text-sm font-medium text-neutral-800">{row.name}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${row.badgeClassName}`}>
                  {row.badge}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
