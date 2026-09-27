import { Package } from 'lucide-react';
import { AVATAR_PALETTE } from '@/lib/avatar';

export const MAX_ITEM_AVATARS = 3;

// Overlapping item-photo stack: at most 3 real product photos, and when the
// order has more items than that, a 4th "+N" circle stands in for the rest —
// so the stack never exceeds 4 circles no matter how big the order. `images`
// is the real per-item photos (caller slices to MAX_ITEM_AVATARS); a null
// entry (no photo on that row) falls back to a package icon, never a
// fabricated image. `count` is the true item count and drives both the "+N"
// overflow and the label. Shared by the Overview table and the Orders section.
export function ItemAvatars({ images, count }: { images: (string | null)[]; count: number }) {
  const shown = images.slice(0, MAX_ITEM_AVATARS);
  const overflow = count - shown.length;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-3">
        {shown.map((url, i) =>
          url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-sm ${AVATAR_PALETTE[i % AVATAR_PALETTE.length]}`}
            >
              <Package size={13} />
            </div>
          ),
        )}
        {overflow > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[11px] font-semibold text-neutral-600 shadow-sm tnum">
            +{overflow}
          </div>
        )}
      </div>
      <span className="whitespace-nowrap text-[15px] text-neutral-600">{count} {count === 1 ? 'item' : 'items'}</span>
    </div>
  );
}
