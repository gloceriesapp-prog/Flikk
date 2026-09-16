import { Package } from 'lucide-react';
import { AVATAR_PALETTE } from '@/lib/avatar';

export const MAX_ITEM_AVATARS = 3;

// Overlapping item-photo stack, capped at 3 regardless of real order size —
// a 12-item order shows the same 3 photos + "12 items" as a 3-item order
// shows 3 photos + "3 items". `images` should already be the real per-item
// product photos (sliced to at most 3 by the caller); a null entry (no
// product photo on that row) falls back to a plain package icon, never a
// fabricated image. Shared by the Overview table and the Orders section.
export function ItemAvatars({ images, count }: { images: (string | null)[]; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-3">
        {images.slice(0, MAX_ITEM_AVATARS).map((url, i) =>
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
      </div>
      <span className="whitespace-nowrap text-[15px] text-neutral-600">{count} items</span>
    </div>
  );
}
