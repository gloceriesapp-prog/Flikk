'use client';

import { useId, useRef, useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import type { PartnerProduct } from '@/lib/partnerApi';

function EditIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M13.604 19.3789H19.981" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.31708 14.3319C3.57808 16.6499 5.22308 19.5219 5.22308 19.5219C5.22308 19.5219 8.46708 20.2679 10.1811 17.9829C11.8961 15.6989 16.9331 8.98786 16.9331 8.98786C17.9411 7.64486 17.6701 5.73786 16.3271 4.72986C14.9831 3.72186 13.0771 3.99386 12.0691 5.33686C12.0691 5.33686 9.07408 9.32686 6.91008 12.2089" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.7771 8.63953L15.6371 10.7335" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function ProductRowActions({ product, onEdit, onDelete }: { product: PartnerProduct; onEdit: (product: PartnerProduct) => void; onDelete: (product: PartnerProduct) => void }) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return <div className="flex shrink-0 items-center gap-1.5">
    <button type="button" onClick={() => onEdit(product)} aria-label={`Edit ${product.name}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-950 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-black">
      <EditIcon /> Edit
    </button>
    <button type="button" popoverTarget={id} aria-label={`More options for ${product.name}`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog"
      onClick={event => {
        const box = event.currentTarget.getBoundingClientRect();
        if (menu.current) {
          menu.current.style.left = `${Math.max(8, Math.min(box.right - 144, window.innerWidth - 152))}px`;
          menu.current.style.top = `${box.bottom + 58 > window.innerHeight ? box.top - 56 : box.bottom + 6}px`;
        }
      }}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-black">
      <MoreHorizontal size={19} aria-hidden />
    </button>
    <div ref={menu} id={id} popover="auto" role="dialog" aria-label={`Actions for ${product.name}`} onToggle={event => setOpen(event.newState === 'open')}
      className="fixed m-0 w-36 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <button type="button" onClick={() => { menu.current?.hidePopover(); onDelete(product); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-black">
        <Trash2 size={16} aria-hidden /> Delete
      </button>
    </div>
  </div>;
}
